import { currentSchoolYear } from '$lib/server/cash';
import { text } from '$lib/server/form';
import { budgetTree, projectList } from '$lib/server/treasury';
import { CAMPUS_BADGES, cashErrorMessage, type Campus } from '@davincibot/lib';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Projets (TRESO-F-01) et leur rattachement à l'arbre budgétaire (TRESO-F-02).
//
// Un projet désigne un nœud de l'arbre à n'importe quelle profondeur — racine,
// intermédiaire ou feuille. Le sélecteur propose donc TOUT l'arbre, contrairement
// à celui de l'imputation, qui ne propose que des feuilles : ce sont deux choix
// différents, et les confondre reviendrait à interdire à un pôle de pointer sur
// son propre nœud.
//
// Corollaire de TRESO-F-03 : le budget visé doit être redésigné à chaque
// rentrée, l'arbre appartenant à une année. L'écran le rappelle.

const CAMPUSES = Object.keys(CAMPUS_BADGES) as Campus[];

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:projects');

	const schoolYear = await currentSchoolYear(locals.supabase);
	const [projects, tree] = await Promise.all([
		projectList(locals.supabase),
		schoolYear ? budgetTree(locals.supabase, schoolYear.id) : Promise.resolve([])
	]);

	return { projects, tree: tree.filter((b) => !b.archivedAt), schoolYear };
};

/** Lit les champs communs à la création et à la modification d'un projet. */
function readProject(form: FormData) {
	const name = text(form, 'name');
	const rawCampus = text(form, 'campus');
	const rawBudget = text(form, 'budget_id');

	if (name.length === 0) {
		return { error: 'Le nom du projet est obligatoire.' as const };
	}
	if (rawCampus !== '' && !CAMPUSES.includes(rawCampus as Campus)) {
		return { error: 'Campus inconnu.' as const };
	}
	const budgetId = rawBudget === '' ? null : Number(rawBudget);
	if (budgetId !== null && !Number.isSafeInteger(budgetId)) {
		return { error: 'Budget invalide.' as const };
	}

	return {
		values: {
			name,
			campus: rawCampus === '' ? null : (rawCampus as Campus),
			budget_id: budgetId
		}
	};
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const form = await request.formData();
		const parsed = readProject(form);
		if ('error' in parsed) {
			return fail(400, { message: parsed.error });
		}

		const { error } = await locals.supabase.from('projects').insert(parsed.values);
		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce projet n'a pas pu être créé.")
			});
		}
		return { saved: 'project' };
	},

	update: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Projet invalide.' });
		}
		const parsed = readProject(form);
		if ('error' in parsed) {
			return fail(400, { message: parsed.error });
		}

		const { error } = await locals.supabase.from('projects').update(parsed.values).eq('id', id);
		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce projet n'a pas pu être modifié.")
			});
		}
		return { saved: 'project' };
	},

	/**
	 * Archivage ou réactivation.
	 *
	 * Un projet qui porte des items ne se supprime pas : ses demandes, ses
	 * commandes et son consommé resteraient sans rattachement. L'archivage le
	 * retire des sélecteurs sans toucher au passé.
	 */
	toggleArchive: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const archive = text(form, 'archive') === '1';
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Projet invalide.' });
		}

		const { error } = await locals.supabase
			.from('projects')
			.update({ archived_at: archive ? new Date().toISOString() : null })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce projet n'a pas pu être archivé.")
			});
		}
		return { saved: 'project' };
	},

	/** Suppression définitive, réservée aux projets sans aucun item. */
	remove: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Projet invalide.' });
		}

		const { count } = await locals.supabase
			.schema('cash')
			.from('items')
			.select('id', { count: 'exact', head: true })
			.eq('project_id', id);

		if ((count ?? 0) > 0) {
			return fail(400, {
				message: `Ce projet porte ${String(count)} item(s) : archivez-le, son historique doit rester lisible.`
			});
		}

		const { error } = await locals.supabase.from('projects').delete().eq('id', id);
		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce projet n'a pas pu être supprimé.")
			});
		}
		return { saved: 'project' };
	}
};
