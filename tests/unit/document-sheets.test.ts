import { describe, expect, it } from 'vitest';

import { flushSync, mount, unmount, type Component } from 'svelte';

import ExpenseReportSheet from '$lib/components/cash/documents/ExpenseReportSheet.svelte';
import InvoiceSheet from '$lib/components/cash/documents/InvoiceSheet.svelte';
import QuoteSheet from '$lib/components/cash/documents/QuoteSheet.svelte';
import TaxReceiptSheet from '$lib/components/cash/documents/TaxReceiptSheet.svelte';
import { isValidSiren } from '$lib/documents';
import type { GeneratedDocument, Organization } from '$lib/server/reports';

// Les pièces générées partent chez des tiers et consomment un numéro de série :
// ce qu'elles affichent ne se corrige pas après coup. Ces tests fixent donc les
// mentions qui doivent y être — et celles qui ne doivent PAS y être.

const issuer: Organization = {
	legalName: 'DaVinciBot',
	addressLine: '3 rue Joliot Curie',
	postalCode: '91190',
	city: 'Gif-sur-Yvette',
	country: 'France',
	rna: 'W911234567',
	siret: '12345678900011',
	vatNumber: null,
	email: null,
	website: null,
	signatoryName: 'Alice Martin',
	signatoryTitle: 'Trésorière',
	taxReceiptsAllowed: true,
	taxCategory: "Association d'intérêt général",
	taxArticles: 'articles 200 et 238 bis du CGI',
	bankName: 'Banque Populaire',
	iban: 'FR76 4061 8803 6100 0403 4793 568',
	bic: 'CCBPFRPP'
};

function doc(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
	return {
		id: 1,
		kind: 'invoice',
		number: 'FAC-2026-0004',
		issuedOn: '2026-08-14',
		recipientName: 'Société Exemple',
		recipientAddress: '1 rue des Lilas\n75001 Paris',
		amountTtc: 120,
		subject: null,
		flowId: null,
		lines: [{ label: 'Atelier robotique', quantity: 2, unitPriceTtc: 60 }],
		expenseLines: [],
		issuer,
		donation: null,
		beneficiaryIban: null,
		serviceOn: null,
		purchaseOrder: null,
		recipientSiren: null,
		operationKind: null,
		...overrides
	};
}

function render(component: Component<{ doc: GeneratedDocument }>, document_: GeneratedDocument) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(component, { target, props: { doc: document_ } });
	flushSync();
	const text = target.textContent;
	void unmount(instance);
	target.remove();
	return text;
}

describe('facture', () => {
	it('porte les mentions de facturation électronique', () => {
		const text = render(
			InvoiceSheet,
			doc({
				serviceOn: '2026-08-02',
				purchaseOrder: 'BC-2026-77',
				recipientSiren: '552100554',
				operationKind: 'services'
			})
		);

		expect(text).toContain("Date d'émission");
		expect(text).toContain('14 août 2026');
		expect(text).toContain('Date de la prestation ou de la livraison');
		expect(text).toContain('2 août 2026');
		expect(text).toContain('Prestations de services');
		expect(text).toContain('BC-2026-77');
		// Groupé par trois, comme sur un Kbis.
		expect(text).toContain('552 100 554');
	});

	it('ne demande ni signature ni mention : elle réclame, elle ne fait pas approuver', () => {
		const text = render(InvoiceSheet, doc());

		expect(text).not.toContain('Date et signature');
		expect(text.toLowerCase()).not.toContain('lu et approuvé');
	});

	it("n'affiche pas le RNA, qui ne dit rien à un client", () => {
		expect(render(InvoiceSheet, doc())).not.toContain('W911234567');
	});
});

describe('devis', () => {
	it('demande la mention manuscrite et laisse le cadre pour l’écrire', () => {
		const text = render(QuoteSheet, doc({ kind: 'quote', number: 'DEV-2026-0002' }));

		expect(text).toContain('Lu et approuvé, bon pour accord');
		expect(text).toContain('Bon pour accord');
		expect(text).toContain('Date et signature');
		// La consigne est dite UNE fois, dans le paragraphe d'acceptation : la
		// répéter dans le cadre reviendrait à pré-remplir ce qui doit être écrit.
		expect(text.toLowerCase().split('lu et approuvé').length - 1).toBe(1);
	});
});

describe('note de frais', () => {
	const expenses = doc({
		kind: 'expense_report',
		number: 'NDF-2026-0002',
		amountTtc: 39.5,
		beneficiaryIban: 'FR76 4061 8803 6100 0403 4793 568',
		lines: [],
		expenseLines: [
			{ occurredOn: '2026-05-13', label: 'Péages', amountHt: 23.75, amountTtc: 28.5 },
			{ occurredOn: '2026-05-13', label: 'Déjeuner', amountHt: 10, amountTtc: 11 }
		]
	});

	it('affiche la date de chaque dépense et sa colonne TTC', () => {
		const text = render(ExpenseReportSheet, expenses);

		expect(text).toContain('Type de dépense');
		expect(text).toContain('Montant TTC');
		expect(text).toContain('13/05/2026');
	});

	it('affiche la TVA supportée sans mentionner de taux', () => {
		const text = render(ExpenseReportSheet, expenses);

		// 39,50 TTC − 33,75 HT = 5,75 de TVA avancée par le bénéficiaire.
		expect(text).toContain('5,75');
		expect(text).toContain('Total TTC');
		expect(text).not.toContain('TVA 0');
	});

	it('rappelle la mention à écrire au-dessus des trois cadres', () => {
		const text = render(ExpenseReportSheet, expenses);

		expect(text.toLowerCase()).toContain('lu et approuvé');
		expect(text).toContain('Date et signature');
	});

	it("montre l'IBAN auprès du bénéficiaire et tait l'émetteur", () => {
		const text = render(ExpenseReportSheet, expenses);

		expect(text).toContain('FR76 4061 8803 6100 0403 4793 568');
		// La pièce est interne : l'association n'a pas à s'y adresser à elle-même.
		expect(text).not.toContain('De la part de');
	});
});

describe('reçu fiscal', () => {
	it('garde le RNA, que le Cerfa 11580 exige', () => {
		const text = render(
			TaxReceiptSheet,
			doc({
				kind: 'tax_receipt',
				number: 'REC-2026-0001',
				lines: [],
				amountTtc: 50,
				donation: { nature: 'Numéraire', method: 'Virement' }
			})
		);

		expect(text).toContain('W911234567');
		expect(text).toContain('Date et signature');
	});
});

describe('SIREN', () => {
	it('accepte un numéro dont la clé de Luhn tombe juste', () => {
		expect(isValidSiren('552100554')).toBe(true);
		expect(isValidSiren('552 100 554')).toBe(true);
	});

	it('refuse une coquille d’un chiffre ou une longueur fausse', () => {
		expect(isValidSiren('552100555')).toBe(false);
		expect(isValidSiren('55210055')).toBe(false);
		expect(isValidSiren('')).toBe(false);
	});
});
