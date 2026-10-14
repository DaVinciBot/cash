// Montant en toutes lettres — mention obligatoire du reçu fiscal (Cerfa 11580).
//
// Les mots français ci-dessous sont des DONNÉES, pas des identifiants : c'est le
// texte qui part sur la pièce.

const UNITS = [
	'zéro',
	'un',
	'deux',
	'trois',
	'quatre',
	'cinq',
	'six',
	'sept',
	'huit',
	'neuf',
	'dix',
	'onze',
	'douze',
	'treize',
	'quatorze',
	'quinze',
	'seize',
	'dix-sept',
	'dix-huit',
	'dix-neuf'
];

const TENS = [
	'',
	'',
	'vingt',
	'trente',
	'quarante',
	'cinquante',
	'soixante',
	'soixante',
	'quatre-vingt',
	'quatre-vingt'
];

/** Nombre entier de 0 à 999 en lettres. */
function spellBelowThousand(n: number): string {
	if (n < 20) {
		return UNITS[n] ?? '';
	}
	if (n < 100) {
		const tens = Math.floor(n / 10);
		const unit = n % 10;
		// Soixante-dix et quatre-vingt-dix comptent à partir de soixante et de
		// quatre-vingt : « soixante-douze », « quatre-vingt-treize ».
		const base = TENS[tens] ?? '';
		if (tens === 7 || tens === 9) {
			const rest = UNITS[10 + unit] ?? '';
			return unit === 1 && tens === 7 ? 'soixante-et-onze' : `${base}-${rest}`;
		}
		if (unit === 0) {
			// « quatre-vingts » prend son s quand rien ne le suit.
			return tens === 8 ? 'quatre-vingts' : base;
		}
		if (unit === 1 && tens !== 8) {
			return `${base}-et-un`;
		}
		return `${base}-${UNITS[unit] ?? ''}`;
	}
	const hundreds = Math.floor(n / 100);
	const rest = n % 100;
	const prefix = hundreds === 1 ? 'cent' : `${UNITS[hundreds] ?? ''}-cent`;
	if (rest === 0) {
		// « cents » prend son s quand rien ne le suit.
		return hundreds === 1 ? 'cent' : `${prefix}s`;
	}
	return `${prefix}-${spellBelowThousand(rest)}`;
}

/** Nombre entier en lettres, jusqu'aux milliards. */
function spellInteger(n: number): string {
	if (n === 0) {
		return 'zéro';
	}
	const scales: { value: number; singular: string; plural: string }[] = [
		{ value: 1_000_000_000, singular: 'milliard', plural: 'milliards' },
		{ value: 1_000_000, singular: 'million', plural: 'millions' },
		{ value: 1000, singular: 'mille', plural: 'mille' }
	];

	const parts: string[] = [];
	let rest = n;
	for (const scale of scales) {
		const count = Math.floor(rest / scale.value);
		if (count === 0) {
			continue;
		}
		rest %= scale.value;
		// « mille » est invariable et ne se dit pas « un mille ».
		if (scale.value === 1000) {
			parts.push(count === 1 ? 'mille' : `${spellInteger(count)}-mille`);
		} else {
			parts.push(`${spellInteger(count)}-${count > 1 ? scale.plural : scale.singular}`);
		}
	}
	if (rest > 0) {
		parts.push(spellBelowThousand(rest));
	}
	return parts.join('-');
}

/**
 * Montant en euros écrit en toutes lettres, centimes compris.
 *
 * Renvoie `null` pour une entrée qui n'est pas un montant positif : mieux vaut
 * une mention absente qu'une mention fausse sur une pièce fiscale.
 */
export function amountInWords(amount: number): string | null {
	if (!Number.isFinite(amount) || amount < 0) {
		return null;
	}
	const cents = Math.round(amount * 100);
	const euros = Math.floor(cents / 100);
	const rest = cents % 100;

	const eurosPart = `${spellInteger(euros)} ${euros > 1 ? 'euros' : 'euro'}`;
	if (rest === 0) {
		return eurosPart;
	}
	return `${eurosPart} et ${spellInteger(rest)} ${rest > 1 ? 'centimes' : 'centime'}`;
}
