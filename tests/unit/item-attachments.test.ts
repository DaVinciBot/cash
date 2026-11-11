import { describe, expect, it } from 'vitest';

import {
	ATTACHMENT_MAX_BYTES,
	attachmentProblem,
	attachmentType,
	displayName,
	isChosenFile
} from '#lib/server/attachments.js';

const file = (name: string, type: string, size = 10) =>
	new File([new Uint8Array(size)], name, { type });

describe('pièces jointes des items (#63)', () => {
	it('ignore un champ fichier laissé vide', () => {
		expect(isChosenFile(file('', '', 0))).toBe(false);
		expect(isChosenFile(null)).toBe(false);
		expect(isChosenFile(file('bom.csv', 'text/csv'))).toBe(true);
	});

	it('accepte une BOM, un PDF et un fichier KiCad sans type', () => {
		expect(attachmentProblem(file('bom.csv', 'text/csv'))).toBeNull();
		expect(attachmentProblem(file('devis.pdf', 'application/pdf'))).toBeNull();
		expect(attachmentType(file('carte.kicad_pcb', ''))).toBe('application/octet-stream');
		expect(attachmentProblem(file('carte.kicad_pcb', ''))).toBeNull();
	});

	it('refuse un format inconnu ou un fichier trop lourd', () => {
		expect(attachmentProblem(file('script.sh', 'application/x-sh'))).toMatch(/format/);
		expect(
			attachmentProblem(file('gros.zip', 'application/zip', ATTACHMENT_MAX_BYTES + 1))
		).toMatch(/20 Mo/);
	});

	it('garde un nom lisible, sans chemin', () => {
		expect(displayName(file('C:\\Users\\moi\\bom.csv', 'text/csv'))).toBe('bom.csv');
	});
});
