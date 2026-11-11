// Contrôle de forme des mentions légales de l'émetteur (#80).
//
// Ces mentions sont figées sur chaque document à son émission : un IBAN mal
// recopié part tel quel sur une note de frais, un SIRET faux sur une facture.
// Un champ vide reste permis — c'est la génération du document qui exige ce
// dont elle a besoin —, mais un champ rempli doit avoir la bonne forme.

/** Somme de contrôle de Luhn, celle du SIREN et du SIRET. */
function luhn(digits: string): boolean {
	let sum = 0;
	for (let i = 0; i < digits.length; i++) {
		let digit = Number(digits[digits.length - 1 - i]);
		if (i % 2 === 1) {
			digit *= 2;
			if (digit > 9) {
				digit -= 9;
			}
		}
		sum += digit;
	}
	return sum % 10 === 0;
}

const compact = (value: string) => value.replace(/\s+/g, '');

/** RNA : W suivi de neuf chiffres. */
export function isValidRna(raw: string): boolean {
	return /^W\d{9}$/i.test(compact(raw));
}

/**
 * SIRET : quatorze chiffres et clé de Luhn. Les établissements de La Poste
 * (SIREN 356 000 000) suivent une autre règle : leur somme des chiffres est un
 * multiple de 5.
 */
export function isValidSiret(raw: string): boolean {
	const digits = compact(raw);
	if (!/^\d{14}$/.test(digits)) {
		return false;
	}
	if (digits.startsWith('356000000')) {
		return digits.split('').reduce((sum, d) => sum + Number(d), 0) % 5 === 0;
	}
	return luhn(digits);
}

/** IBAN : structure et clé modulo 97 (ISO 13616). */
export function isValidIban(raw: string): boolean {
	const iban = compact(raw).toUpperCase();
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
		return false;
	}
	const rearranged = iban.slice(4) + iban.slice(0, 4);
	let remainder = 0;
	for (const char of rearranged) {
		const value = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
		for (const digit of value) {
			remainder = (remainder * 10 + Number(digit)) % 97;
		}
	}
	return remainder === 1;
}

/** BIC : 8 ou 11 caractères (ISO 9362). */
export function isValidBic(raw: string): boolean {
	return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(compact(raw).toUpperCase());
}

export function isValidEmail(raw: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function isValidWebsite(raw: string): boolean {
	try {
		const url = new URL(raw.trim());
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export interface IssuerFields {
	rna: string;
	siret: string;
	iban: string;
	bic: string;
	email: string;
	website: string;
	postalCode: string;
	country: string;
}

/** Messages des champs remplis mais mal formés, dans l'ordre du formulaire. */
export function issuerFieldErrors(fields: IssuerFields): string[] {
	const errors: string[] = [];
	const check = (value: string, valid: (raw: string) => boolean, message: string) => {
		if (value.trim() && !valid(value)) {
			errors.push(message);
		}
	};
	const french = !fields.country.trim() || fields.country.trim().toLowerCase() === 'france';
	check(
		fields.postalCode,
		(v) => !french || /^\d{5}$/.test(v.trim()),
		'Code postal : cinq chiffres.'
	);
	check(fields.rna, isValidRna, 'RNA : la lettre W suivie de neuf chiffres.');
	check(fields.siret, isValidSiret, 'SIRET : quatorze chiffres, dont la clé ne correspond pas.');
	check(fields.iban, isValidIban, 'IBAN invalide : vérifiez sa recopie, la clé ne correspond pas.');
	check(fields.bic, isValidBic, 'BIC : 8 ou 11 caractères.');
	check(fields.email, isValidEmail, 'Courriel invalide.');
	check(fields.website, isValidWebsite, 'Site : une adresse complète, en https://.');
	return errors;
}

/** Forme canonique enregistrée : sans espaces et en capitales pour les identifiants. */
export function normalizeIdentifier(raw: string): string {
	return compact(raw).toUpperCase();
}
