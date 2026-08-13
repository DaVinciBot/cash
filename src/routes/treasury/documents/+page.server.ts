import { decimal, text, textAll } from '$lib/server/form';
import { documentList, missingIssuerFields, organization } from '$lib/server/reports';
import { flowList, periods } from '$lib/server/treasury';
import { cashErrorMessage, DOCUMENT_KINDS, type DocumentKind } from '@davincibot/lib';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Documents générés (TRESO-F-40 à 43).
//
// Un document est ÉMIS, pas rendu à la demande : il fige à l'écriture son
// montant, son destinataire, ses lignes et l'identité de l'émetteur. La page
// d'impression ne fait que relire. C'est ce qui permet de rejouer une facture
// deux ans plus tard telle qu'elle est partie, même si l'association a déménagé
// et si la commande a été corrigée depuis.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:documents');

	const periodRows = await periods(locals.supabase);
	const today = new Date().toISOString().slice(0, 10);
	const currentFiscal =
		periodRows.fiscalYears.find((y) => y.startsOn <= today && today <= y.endsOn)?.id ?? null;

	const [documents, org, flows] = await Promise.all([
		documentList(locals.supabase),
		organization(locals.supabase),
		flowList(locals.supabase, currentFiscal)
	]);

	return {
		documents,
		organization: org,
		// Seuls les crédits sont proposés au reçu fiscal, seuls les débits à la
		// facture : rattacher un reçu de don à une dépense n'aurait aucun sens.
		flows: flows.map((f) => ({
			id: f.id,
			label: f.label,
			direction: f.direction,
			amountTtc: f.amountTtc,
			occurredOn: f.occurredOn
		})),
		missingByKind: Object.fromEntries(DOCUMENT_KINDS.map((k) => [k, missingIssuerFields(org, k)]))
	};
};

export const actions: Actions = {
	/** Identité de l'émetteur — mentions obligatoires des documents. */
	saveIssuer: async ({ locals, request }) => {
		const form = await request.formData();
		const field = (name: string) => text(form, name) || null;

		const { error } = await locals.supabase
			.schema('cash')
			.from('organization')
			.update({
				legal_name: field('legal_name'),
				address_line: field('address_line'),
				postal_code: field('postal_code'),
				city: field('city'),
				country: text(form, 'country') || 'France',
				rna: field('rna'),
				siret: field('siret'),
				vat_number: field('vat_number'),
				email: field('email'),
				website: field('website'),
				signatory_name: field('signatory_name'),
				signatory_title: field('signatory_title'),
				tax_receipts_allowed: text(form, 'tax_receipts_allowed') === '1',
				tax_category: field('tax_category'),
				tax_articles: field('tax_articles'),
				bank_name: field('bank_name'),
				iban: field('iban'),
				bic: field('bic')
			})
			.eq('id', 1);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(
					error.code,
					'L’identité de l’émetteur n’a pas pu être enregistrée.'
				)
			});
		}
		return { saved: 'issuer' };
	},

	/**
	 * Émission d'un document.
	 *
	 * Le numéro vient de `cash.next_document_number`, sous verrou : le calculer
	 * ici en ferait deux sources, et deux émissions simultanées se disputeraient
	 * le même numéro.
	 */
	issue: async ({ locals, request }) => {
		const form = await request.formData();
		const kind = text(form, 'kind');
		const issuedOn = text(form, 'issued_on');
		const recipientName = text(form, 'recipient_name');
		const recipientAddress = text(form, 'recipient_address');
		const subject = text(form, 'subject');
		const rawFlow = text(form, 'flow_id');

		if (!DOCUMENT_KINDS.includes(kind as DocumentKind)) {
			return fail(400, { message: 'Type de document inconnu.' });
		}
		const documentKind = kind as DocumentKind;

		if (!ISO_DAY.test(issuedOn)) {
			return fail(400, { message: 'La date d’émission est obligatoire.' });
		}
		if (recipientName.length === 0) {
			return fail(400, { message: 'Le destinataire est obligatoire.' });
		}

		// L'émetteur est vérifié ICI et pas seulement à l'affichage : un document
		// incomplet consomme un numéro de série, et une série ne se réécrit pas.
		const org = await organization(locals.supabase);
		const missing = missingIssuerFields(org, documentKind);
		if (missing.length > 0) {
			return fail(400, {
				message: `Complétez l’identité de l’émetteur avant d’émettre : ${missing.join(', ')}.`
			});
		}

		const labels = textAll(form, 'line_label');
		const quantities = textAll(form, 'line_quantity').map((v) => Number(v.replace(',', '.')));
		const prices = textAll(form, 'line_price').map((v) => Number(v.replace(',', '.')));

		const lines = labels
			.map((label, i) => ({
				label: label.trim(),
				quantity: quantities[i] ?? 0,
				unitPriceTtc: prices[i] ?? 0
			}))
			.filter(
				(l) =>
					l.label.length > 0 &&
					Number.isFinite(l.quantity) &&
					l.quantity > 0 &&
					Number.isFinite(l.unitPriceTtc) &&
					l.unitPriceTtc >= 0
			);

		const flowId = rawFlow === '' ? null : Number(rawFlow);
		if (flowId !== null && !Number.isSafeInteger(flowId)) {
			return fail(400, { message: 'Mouvement invalide.' });
		}

		// Le montant vient des lignes quand il y en a, du champ sinon : un reçu de
		// don n'a qu'un montant, une facture a un détail.
		const fromLines =
			Math.round(lines.reduce((sum, l) => sum + l.quantity * l.unitPriceTtc, 0) * 100) / 100;
		const amount =
			lines.length > 0 ? fromLines : Math.round(decimal(form, 'amount_ttc') * 100) / 100;

		if (!Number.isFinite(amount) || amount < 0) {
			return fail(400, { message: 'Le montant doit être un nombre positif.' });
		}

		const { data: number, error: numberError } = await locals.supabase
			.schema('cash')
			.rpc('next_document_number', { p_kind: documentKind, p_issued_on: issuedOn });

		if (numberError || !number) {
			return fail(400, {
				message: cashErrorMessage(
					numberError?.code,
					'Le numéro du document n’a pas pu être attribué.'
				)
			});
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('generated_documents')
			.insert({
				kind: documentKind,
				number,
				issued_on: issuedOn,
				flow_id: flowId,
				recipient_name: recipientName,
				recipient_address: recipientAddress || null,
				amount_ttc: amount,
				subject: subject || null,
				payload: {
					lines,
					issuer: org,
					donation:
						documentKind === 'tax_receipt'
							? { nature: text(form, 'donation_nature'), method: text(form, 'donation_method') }
							: null,
					beneficiaryIban:
						documentKind === 'expense_report' ? text(form, 'beneficiary_iban') || null : null
				}
			});

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Ce document n’a pas pu être émis.')
			});
		}
		return { saved: 'document', number };
	}
};
