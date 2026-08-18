import { currentSchoolYear } from '$lib/server/cash';
import { projectReport, quarterlyReport } from '$lib/server/reports';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Export des rapports (TRESO-F-62).
//
// CSV et non tableur : c'est le seul format qu'un tableur, un script et un
// expert-comptable ouvrent tous les trois sans rien installer. Séparateur
// point-virgule et virgule décimale — Excel en français lit ça directement,
// alors qu'un CSV à la virgule lui fait tout empiler dans une colonne.

/**
 * Échappement CSV : guillemets doublés, champ cité dès qu'il porte un séparateur.
 *
 * Un nombre est toujours un MONTANT ici — deux décimales, virgule décimale. Les
 * décomptes passent en texte au point d'appel : les écrire « 4,00 » les ferait
 * lire comme des euros.
 */
function cell(value: string | number): string {
	const text = typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value;
	return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: (string | number)[][]): string {
	// BOM UTF-8 : sans lui Excel lit les accents en Windows-1252.
	return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const kind = url.searchParams.get('kind');

	if (kind === 'quarterly') {
		const fiscalYearId = Number(url.searchParams.get('fy'));
		if (!Number.isSafeInteger(fiscalYearId)) {
			error(400, 'Exercice invalide.');
		}
		const report = await quarterlyReport(locals.supabase, fiscalYearId);
		if (!report) {
			error(404, 'Exercice introuvable.');
		}

		const body = csv([
			['Trimestre', 'Du', 'Au', 'Recettes', 'Dépenses', 'Solde', 'Cumulé', 'Mouvements'],
			...report.quarters.map((q) => [
				q.label,
				q.from,
				q.to,
				q.credit,
				q.debit,
				q.balance,
				q.cumulative,
				String(q.count)
			])
		]);

		return new Response(body, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="rapport-trimestriel-${report.label.replace(/\s+/g, '-')}.csv"`
			}
		});
	}

	if (kind === 'projects') {
		const asked = Number(url.searchParams.get('sy'));
		const current = await currentSchoolYear(locals.supabase);
		const schoolYearId = Number.isSafeInteger(asked) && asked > 0 ? asked : current?.id;
		if (schoolYearId === undefined) {
			error(400, 'Année scolaire invalide.');
		}

		const rows = await projectReport(locals.supabase, schoolYearId);
		const body = csv([
			['Projet', 'Items', 'Demandé', 'Engagé', 'Reçu', 'Refusé'],
			...rows.map((r) => [
				r.projectName,
				String(r.itemCount),
				r.requestedTtc,
				r.committedTtc,
				r.receivedTtc,
				r.refusedTtc
			])
		]);

		return new Response(body, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="rapport-projets-${String(schoolYearId)}.csv"`
			}
		});
	}

	error(400, 'Rapport inconnu.');
};
