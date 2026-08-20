import { resolve } from '$app/paths';
import { isInvoiceOperationKind, isValidSiren } from '$lib/documents';
import { round } from '$lib/numbers';
import { rejection } from '$lib/server/audit';
import { decimal, text, textAll } from '$lib/server/form';
import { missingIssuerFields, organization, type ExpenseLine } from '$lib/server/reports';
import { flowList, periods } from '$lib/server/treasury';
import { DOCUMENT_KINDS, documentFollowsFlow, type DocumentKind } from '@davincibot/lib';
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

		// La facturation électronique impose des mentions que les autres pièces
		// n'ont pas. Elles sont vérifiées AVANT que le numéro de série soit
		// consommé : une facture incomplète devrait être annulée et réémise.
		const serviceOn = text(form, 'service_on');
		const purchaseOrder = text(form, 'purchase_order');
		const recipientSiren = text(form, 'recipient_siren').replace(/\s/g, '');
		const rawOperation = text(form, 'operation_kind');

		if (kind === 'invoice') {
			if (!ISO_DAY.test(serviceOn)) {
				return fail(400, {
					message: 'La date de la prestation ou de la livraison est obligatoire.'
				});
			}
			if (purchaseOrder.length === 0) {
				return fail(400, { message: 'Le numéro de bon de commande est obligatoire.' });
			}
			if (!isValidSiren(recipientSiren)) {
				return fail(400, { message: 'Le SIREN du client doit comporter neuf chiffres valides.' });
			}
			if (!isInvoiceOperationKind(rawOperation)) {
				return fail(400, { message: "La nature de l'opération est obligatoire." });
			}
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

		// Une dépense remboursée se décrit autrement qu'un article vendu : une
		// date, une nature, et deux montants dont l'écart est la TVA avancée.
		const expenseDates = textAll(form, 'expense_date');
		const expenseLabels = textAll(form, 'expense_label');
		const expenseHt = textAll(form, 'expense_ht').map((v) => Number(v.replace(',', '.')));
		const expenseTtc = textAll(form, 'expense_ttc').map((v) => Number(v.replace(',', '.')));

		const expenseLines: ExpenseLine[] =
			kind === 'expense_report'
				? expenseLabels
						.map((label, i) => {
							const ttc = expenseTtc[i] ?? Number.NaN;
							return {
								occurredOn: (expenseDates[i] ?? '').trim(),
								label: label.trim(),
								// Sans TVA saisie, le HT vaut le TTC : la dépense n'en portait
								// pas, ou le justificatif ne la détaille pas.
								amountHt: Number.isFinite(expenseHt[i]) ? (expenseHt[i] ?? 0) : ttc,
								amountTtc: ttc
							};
						})
						.filter((l) => l.label.length > 0 && Number.isFinite(l.amountTtc) && l.amountTtc >= 0)
				: [];

		// La date de la dépense est ce qui rattache un justificatif à la note :
		// sans elle, le trésorier ne peut plus rapprocher la ligne du ticket.
		if (expenseLines.some((l) => !ISO_DAY.test(l.occurredOn))) {
			return fail(400, { message: 'Chaque dépense doit porter sa date.' });
		}

		const flowId = rawFlow === '' ? null : Number(rawFlow);
		if (flowId !== null && !Number.isSafeInteger(flowId)) {
			return fail(400, { message: 'Mouvement invalide.' });
		}

		// Le montant vient du détail quand il y en a, du champ sinon : un reçu de
		// don n'a qu'un montant, une facture a des lignes, une note de frais des
		// dépenses. C'est le TTC qui fait foi — c'est ce qui est dû.
		const detailTotal =
			kind === 'expense_report'
				? expenseLines.length > 0
					? round(expenseLines.reduce((s, l) => s + l.amountTtc, 0))
					: null
				: lines.length > 0
					? round(lines.reduce((s, l) => s + l.quantity * l.unitPriceTtc, 0))
					: null;

		const amount = detailTotal ?? round(decimal(form, 'amount_ttc'));

		if (!Number.isFinite(amount) || amount < 0) {
			return fail(400, { message: 'Le montant doit être un nombre positif.' });
		}

		// Un HT supérieur au TTC produirait une TVA négative sur la pièce.
		if (expenseLines.some((l) => l.amountHt > l.amountTtc)) {
			return fail(400, {
				message: "Le montant HT d'une dépense ne peut pas dépasser son montant TTC."
			});
		}

		const { data: number, error: numberError } = await locals.supabase
			.schema('cash')
			.rpc('next_document_number', { p_kind: kind, p_issued_on: issuedOn });

		if (numberError || !number) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					numberError,
					"Le numéro du document n'a pas pu être attribué.",
					{
						entityType: 'generated_document'
					}
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
					expenseLines,
					issuer: org,
					donation:
						kind === 'tax_receipt'
							? { nature: text(form, 'donation_nature'), method: text(form, 'donation_method') }
							: null,
					// L'IBAN du bénéficiaire d'une note de frais change à chaque
					// document : il appartient à la pièce, pas à l'association.
					beneficiaryIban:
						kind === 'expense_report' ? text(form, 'beneficiary_iban') || null : null,
					serviceOn: kind === 'invoice' ? serviceOn : null,
					purchaseOrder: kind === 'invoice' ? purchaseOrder : null,
					recipientSiren: kind === 'invoice' ? recipientSiren : null,
					operationKind:
						kind === 'invoice' && isInvoiceOperationKind(rawOperation) ? rawOperation : null
				}
			})
			.select('id')
			.single();

		// `.single()` garantit la ligne quand il n'y a pas d'erreur : le seul cas
		// d'échec est `insertError`.
		if (insertError) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					insertError,
					"Ce document n'a pas pu être émis.",
					{
						entityType: 'generated_document'
					}
				)
			});
		}

		// On mène directement à la pièce : c'est ce qu'on voulait obtenir, et c'est
		// là qu'on l'imprime.
		redirect(303, resolve('/treasury/documents/[id]', { id: String(inserted.id) }));
	}
};
