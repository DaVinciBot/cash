import { describe, expect, it } from 'vitest';

import {
	absenceRequestErrors,
	isOwnProofPath,
	nameFromEmail,
	PROOF_MAX_BYTES,
	proofError,
	type AbsenceRequestInput
} from '#lib/absences.js';

// Une demande incomplète est exactement ce que la section doit empêcher : le
// Secrétaire relançait les membres faute d'informations. Chaque champ manquant
// est donc signalé sous le champ, avant tout envoi.
describe("validation d'une demande d'excuse", () => {
	const complete: AbsenceRequestInput = {
		date: '2026-11-03',
		startTime: '08:30',
		endTime: '12:00',
		reason: 'Coupe de France de robotique',
		attested: true
	};

	it('accepte une demande complète', () => {
		expect(absenceRequestErrors(complete)).toEqual({});
	});

	it('signale chaque champ obligatoire manquant', () => {
		const errors = absenceRequestErrors({
			date: '',
			startTime: '',
			endTime: '',
			reason: '   ',
			attested: false
		});
		expect(Object.keys(errors).sort()).toEqual([
			'attested',
			'date',
			'endTime',
			'reason',
			'startTime'
		]);
	});

	it('refuse une heure de fin égale ou antérieure au début', () => {
		expect(absenceRequestErrors({ ...complete, endTime: '08:30' }).endTime).toBeTruthy();
		expect(absenceRequestErrors({ ...complete, endTime: '07:00' }).endTime).toBeTruthy();
	});

	it('refuse une date ou une heure mal formée', () => {
		expect(absenceRequestErrors({ ...complete, date: '2026-02-30' }).date).toBeTruthy();
		expect(absenceRequestErrors({ ...complete, date: '03/11/2026' }).date).toBeTruthy();
		expect(absenceRequestErrors({ ...complete, startTime: '8h' }).startTime).toBeTruthy();
		expect(absenceRequestErrors({ ...complete, endTime: '24:00' }).endTime).toBeTruthy();
	});

	// On demande souvent l'excuse après coup : le cours est déjà passé.
	it('accepte une date passée', () => {
		expect(absenceRequestErrors({ ...complete, date: '2020-01-06' })).toEqual({});
	});
});

describe('justificatif', () => {
	const file = (size: number, type: string) => new File([new Uint8Array(size)], 'piece', { type });

	it('accepte un PDF ou une image de 5 Mo', () => {
		expect(proofError(file(PROOF_MAX_BYTES, 'application/pdf'))).toBeNull();
		expect(proofError(file(10, 'image/png'))).toBeNull();
		expect(proofError(file(10, 'image/jpeg'))).toBeNull();
	});

	it('refuse un fichier de plus de 5 Mo', () => {
		expect(proofError(file(PROOF_MAX_BYTES + 1, 'application/pdf'))).toBeTruthy();
	});

	it('refuse un type non autorisé', () => {
		expect(proofError(file(10, 'image/svg+xml'))).toBeTruthy();
		expect(proofError(file(10, 'application/zip'))).toBeTruthy();
	});
});

// Les comptes n'ont ni nom ni prénom ; tous les mails sont au format
// prenom.nom@… et le Secrétaire en a besoin pour la webapp de l'école.
describe('identité déduite du mail', () => {
	it.each([
		['jean.dupont@exemple.fr', 'Jean', 'Dupont'],
		['MARIE.CURIE@exemple.fr', 'Marie', 'Curie'],
		['jean-pierre.de-la-tour@exemple.fr', 'Jean-Pierre', 'De-La-Tour'],
		['admin@exemple.fr', '', 'admin']
	])('%s → %s %s', (email, firstName, lastName) => {
		expect(nameFromEmail(email)).toEqual({ firstName, lastName });
	});
});

// Le serveur ne fait confiance qu'aux chemins rangés dans le dossier du membre :
// un chemin trafiqué rattacherait la pièce d'un autre à sa demande.
describe('chemin du justificatif', () => {
	it('exige le dossier du membre', () => {
		expect(isOwnProofPath('u1/abc.pdf', 'u1')).toBe(true);
		expect(isOwnProofPath('u2/abc.pdf', 'u1')).toBe(false);
		expect(isOwnProofPath('u1abc.pdf', 'u1')).toBe(false);
		expect(isOwnProofPath('u1/../u2/abc.pdf', 'u1')).toBe(false);
		expect(isOwnProofPath('u1/', 'u1')).toBe(false);
	});
});
