// Vocabulaire des pièces émises, côté client ET serveur.
//
// Ces constantes ne vivent pas dans `@davincibot/lib` : elles ne servent qu'ici,
// et les faire transiter par un paquet publié imposerait un cycle de version à
// chaque libellé retouché. Elles ne vivent pas non plus dans `$lib/server` : le
// formulaire d'émission en a besoin dans le navigateur pour peupler son menu.

/**
 * Nature de l'opération facturée — mention exigée par la facturation
 * électronique. Trois valeurs et pas deux : une facture qui mêle du matériel
 * livré et une prestation existe, et la ranger de force dans l'une des deux
 * catégories serait faux.
 */
export const INVOICE_OPERATION_KINDS = ['goods', 'services', 'mixed'] as const;

export type InvoiceOperationKind = (typeof INVOICE_OPERATION_KINDS)[number];

/** Libellés portés par la facture. Ce sont ceux de l'administration fiscale. */
export const INVOICE_OPERATION_LABELS: Record<InvoiceOperationKind, string> = {
	goods: 'Livraisons de biens',
	services: 'Prestations de services',
	mixed: 'Livraisons de biens et prestations de services'
};

export function isInvoiceOperationKind(value: string): value is InvoiceOperationKind {
	return (INVOICE_OPERATION_KINDS as readonly string[]).includes(value);
}

/**
 * Un SIREN tient en neuf chiffres et se vérifie par la clé de Luhn.
 *
 * Le contrôle est fait ici plutôt que sur la seule longueur : une coquille à un
 * chiffre passerait un test de format, et la facture partirait chez le client
 * avec un identifiant qui ne désigne personne.
 */
export function isValidSiren(raw: string): boolean {
	const digits = raw.replace(/\s/g, '');
	if (!/^\d{9}$/.test(digits)) {
		return false;
	}
	let sum = 0;
	for (let i = 0; i < 9; i += 1) {
		// Les rangs pairs (en partant de la gauche, indices impairs) sont doublés.
		const digit = Number(digits[8 - i]);
		const weighted = i % 2 === 1 ? digit * 2 : digit;
		sum += weighted > 9 ? weighted - 9 : weighted;
	}
	return sum % 10 === 0;
}

/** SIREN présenté par groupes de trois, comme sur un extrait Kbis. */
export function formatSiren(raw: string): string {
	const digits = raw.replace(/\s/g, '');
	return /^\d{9}$/.test(digits)
		? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
		: raw;
}
