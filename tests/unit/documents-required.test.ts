import { missingDocumentFields, type DocumentFormInput } from '#lib/documents.js';
import { describe, expect, it } from 'vitest';

const complete: DocumentFormInput = {
	recipientName: 'Acme',
	issuedOn: '2026-01-01',
	recipientAddress: '1 rue X',
	subject: 'Objet',
	serviceOn: '2026-01-01',
	recipientSiren: '552100554',
	purchaseOrder: 'BC-1',
	operationKind: 'goods',
	amountTtc: '10',
	beneficiaryIban: 'FR76',
	donationNature: 'Numéraire',
	donationMethod: 'Virement',
	lines: [{ label: 'Pièce', quantity: '1', price: '10' }],
	expenses: [{ date: '2026-01-01', label: 'Train', ht: '9', ttc: '10' }]
};

describe('missingDocumentFields', () => {
	it('accepte une pièce complète de chaque type', () => {
		for (const kind of ['invoice', 'quote', 'expense_report', 'tax_receipt'] as const) {
			expect(missingDocumentFields(kind, complete)).toEqual([]);
		}
	});

	it("signale l'adresse et l'objet vides", () => {
		expect(
			missingDocumentFields('quote', { ...complete, recipientAddress: ' ', subject: '' })
		).toEqual(['recipient_address', 'subject']);
	});

	it('refuse une ligne à moitié remplie', () => {
		expect(
			missingDocumentFields('quote', {
				...complete,
				lines: [{ label: 'Pièce', quantity: '1', price: '' }]
			})
		).toEqual(['line_price']);
	});

	it('exige au moins une ligne', () => {
		expect(missingDocumentFields('invoice', { ...complete, lines: [] })).toEqual(['line_label']);
	});

	it("exige le HT d'une dépense et l'IBAN", () => {
		expect(
			missingDocumentFields('expense_report', {
				...complete,
				beneficiaryIban: '',
				expenses: [{ date: '2026-01-01', label: 'Train', ht: '', ttc: '10' }]
			})
		).toEqual(['expense_ht', 'beneficiary_iban']);
	});

	it('exige les mentions de la facture seulement pour une facture', () => {
		const blank = { ...complete, serviceOn: '', purchaseOrder: '' };
		expect(missingDocumentFields('invoice', blank)).toEqual(['service_on', 'purchase_order']);
		expect(missingDocumentFields('quote', blank)).toEqual([]);
	});

	it('exige le montant du don', () => {
		expect(missingDocumentFields('tax_receipt', { ...complete, amountTtc: '' })).toEqual([
			'amount_ttc'
		]);
	});
});
