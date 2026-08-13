import { resolve } from '$app/paths';
import { decimal, text, textAll } from '$lib/server/form';
import { missingIssuerFields, organization } from '$lib/server/reports';
import { flowList, periods } from '$lib/server/treasury';
import {
	cashErrorMessage,
	DOCUMENT_KINDS,
	documentFollowsFlow,
	type DocumentKind
} from '@davincibot/lib';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Étape 2 — la saisie, pour UN type connu d'avance.
//
// Le type vient de l'URL et non d'un champ du formulaire : la page sait donc
// dès le rendu quels champs poser, et le serveur n'a plus à valider un type que
// l'utilisateur aurait pu changer entre-temps.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseKind(raw: string): DocumentKind {
	if (!DOCUMENT_KINDS.includes(raw as DocumentKind)) {
		error(404, 'Type de document inconnu.');
	}
	return raw as DocumentKind;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const kind = parseKind(params.kind);

	const org = await organization(locals.supabase);
	const missing = missingIssuerFields(org, kind);

	// Les mouvements ne sont chargés que si la pièce peut s'y rattacher : un
	// devis précède le flux, il n'a rien à rattacher.
	const flows = documentFollowsFlow(kind)
		? await (async () => {
				const periodRows = await periods(locals.supabase);
				const today = new Date().toISOString().slice(0, 10);
				const currentFiscal =
					periodRows.fiscalYears.find((y) => y.startsOn <= today && today <= y.endsOn)?.id ?? null;
				const rows = await flowList(locals.supabase, currentFiscal);
				// Un reçu fiscal atteste un don REÇU, une facture une créance : les
				// deux se rattachent à un mouvement, mais pas du même sens.
				return rows
					.filter((f) =>
						kind === 'tax_receipt' ? f.direction === 'credit' : f.direction === 'debit'
					)
					.map((f) => ({
						id: f.id,
						label: f.label,
						amountTtc: f.amountTtc,
						occurredOn: f.occurredOn
					}));
			})()
		: [];

	return { kind, missing, flows };
};

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
		const kind = parseKind(params.kind);
		const form = await request.formData();

		const issuedOn = text(form, 'issued_on');
		const recipientName = text(form, 'recipient_name');
		const recipientAddress = text(form, 'recipient_address');
		const subject = text(form, 'subject');
		const rawFlow = text(form, 'flow_id');

		if (!ISO_DAY.test(issuedOn)) {
			return fail(400, { message: "La date d'émission est obligatoire." });
		}
		if (recipientName.length === 0) {
			return fail(400, { message: 'Le destinataire est obligatoire.' });
		}

		// L'émetteur est vérifié ICI et pas seulement à l'affichage : un document
		// incomplet consomme un numéro de série, et une série ne se réécrit pas.
		const org = await organization(locals.supabase);
		const missing = missingIssuerFields(org, kind);
		if (missing.length > 0) {
			return fail(400, {
				message: `Complétez l'identité de l'émetteur avant d'émettre : ${missing.join(', ')}.`
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
			.rpc('next_document_number', { p_kind: kind, p_issued_on: issuedOn });

		if (numberError || !number) {
			return fail(400, {
				message: cashErrorMessage(
					numberError?.code,
					"Le numéro du document n'a pas pu être attribué."
				)
			});
		}

		const { data: inserted, error: insertError } = await locals.supabase
			.schema('cash')
			.from('generated_documents')
			.insert({
				kind,
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
						kind === 'tax_receipt'
							? { nature: text(form, 'donation_nature'), method: text(form, 'donation_method') }
							: null,
					// L'IBAN du bénéficiaire d'une note de frais change à chaque
					// document : il appartient à la pièce, pas à l'association.
					beneficiaryIban: kind === 'expense_report' ? text(form, 'beneficiary_iban') || null : null
				}
			})
			.select('id')
			.single();

		// `.single()` garantit la ligne quand il n'y a pas d'erreur : le seul cas
		// d'échec est `insertError`.
		if (insertError) {
			return fail(400, {
				message: cashErrorMessage(insertError.code, "Ce document n'a pas pu être émis.")
			});
		}

		// On mène directement à la pièce : c'est ce qu'on voulait obtenir, et c'est
		// là qu'on l'imprime.
		redirect(303, resolve(`/treasury/documents/${String(inserted.id)}` as '/'));
	}
};
