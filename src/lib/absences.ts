// Demandes d'excuse d'absence — règles partagées par le formulaire (navigateur)
// et par l'action serveur. Aucune I/O ici : la base revérifie le créneau, le
// motif et le dossier du justificatif par ses contraintes CHECK, ce module ne
// fait que les dire plus tôt et en français, sous le champ concerné.

/** Texte exact de l'attestation que le membre coche. */
export const ABSENCE_ATTESTATION =
	'Je certifie que je ne suis pas en alternance et que je ne cherche pas à me faire excuser un cours noté, de sport ou de semaine soft skills.';

export const ABSENCE_STATUSES = ['pending', 'approved', 'refused'] as const;

export type AbsenceStatus = (typeof ABSENCE_STATUSES)[number];

export const ABSENCE_STATUS_LABELS: Record<AbsenceStatus, string> = {
	pending: 'En attente',
	approved: 'Validée',
	refused: 'Refusée'
};

/** Mêmes limites que le bucket `absence-proofs`. */
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Types acceptés, avec l'extension du fichier rangé dans le bucket. */
export const PROOF_EXTENSIONS: Record<string, string> = {
	'application/pdf': 'pdf',
	'image/png': 'png',
	'image/jpeg': 'jpg'
};

export interface AbsenceRequestInput {
	date: string;
	startTime: string;
	endTime: string;
	reason: string;
	attested: boolean;
}

export type AbsenceRequestErrors = Partial<Record<keyof AbsenceRequestInput, string>>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Date ISO réelle : le motif seul laisserait passer un 30 février, que
 * Postgres refuserait avec une erreur illisible pour le membre.
 */
function isRealDate(value: string): boolean {
	if (!DATE_PATTERN.test(value)) {
		return false;
	}
	const parsed = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/** Erreurs par champ ; un objet vide signifie que la demande peut partir. */
export function absenceRequestErrors(input: AbsenceRequestInput): AbsenceRequestErrors {
	const errors: AbsenceRequestErrors = {};

	if (!input.date) {
		errors.date = "Indique la date de l'absence.";
	} else if (!isRealDate(input.date)) {
		errors.date = "Cette date n'est pas valide.";
	}

	if (!input.startTime) {
		errors.startTime = "Indique l'heure de début.";
	} else if (!TIME_PATTERN.test(input.startTime)) {
		errors.startTime = "Cette heure n'est pas valide.";
	}

	if (!input.endTime) {
		errors.endTime = "Indique l'heure de fin.";
	} else if (!TIME_PATTERN.test(input.endTime)) {
		errors.endTime = "Cette heure n'est pas valide.";
	} else if (!errors.startTime && input.endTime <= input.startTime) {
		// Comparaison lexicale : sur des `HH:MM` bien formés, elle suit l'ordre
		// chronologique.
		errors.endTime = "L'heure de fin doit être après l'heure de début.";
	}

	if (!input.reason.trim()) {
		errors.reason = "Indique le motif de l'absence.";
	}

	if (!input.attested) {
		errors.attested = "Coche l'attestation pour envoyer la demande.";
	}

	return errors;
}

/** Message d'erreur du justificatif, `null` s'il est acceptable. */
export function proofError(file: File): string | null {
	if (!(file.type in PROOF_EXTENSIONS)) {
		return 'Le justificatif doit être un PDF, un PNG ou un JPEG.';
	}
	if (file.size > PROOF_MAX_BYTES) {
		return 'Le justificatif ne doit pas dépasser 5 Mo.';
	}
	return null;
}

function capitalize(word: string): string {
	return word
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join('-');
}

/**
 * Prénom et nom déduits d'un mail `prenom.nom@…`, seul format en usage. Un mail
 * sans point ne dit pas où s'arrête le prénom : sa partie locale est rendue
 * telle quelle comme nom, et le mail brut, affiché à côté, permet au
 * Secrétaire de trancher.
 */
export function nameFromEmail(email: string): { firstName: string; lastName: string } {
	const local = email.split('@')[0] ?? '';
	const dot = local.indexOf('.');
	if (dot === -1) {
		return { firstName: '', lastName: local };
	}
	return {
		firstName: capitalize(local.slice(0, dot)),
		lastName: capitalize(local.slice(dot + 1))
	};
}

/**
 * Le justificatif doit être rangé dans le dossier du membre, sous un nom de
 * fichier non vide, sans remontée de dossier.
 */
export function isOwnProofPath(path: string, userId: string): boolean {
	const prefix = `${userId}/`;
	if (!path.startsWith(prefix) || path.length === prefix.length) {
		return false;
	}
	return !path.split('/').includes('..');
}
