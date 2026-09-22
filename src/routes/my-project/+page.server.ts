import { currentSchoolYear } from '$lib/server/cash';
import { projectOverviews } from '$lib/server/projectOverview';
import type { PageServerLoad } from './$types';

// Suivi de SON projet, pour qui en porte la charge (CMD-F-50, TRESO-F-62).
//
// Écran de lecture seule, et volontairement distinct de `/admin/budgets` : cette
// dernière porte l'arbre entier et son CRUD trésorier (TRESO-F-05/06), qu'une
// permission scopée-projet n'a aucune raison d'ouvrir. Ici, rien n'est
// modifiable et le périmètre se referme deux fois — sur les projets où la
// permission est détenue, puis sur la RLS, qui tranche ligne par ligne.
//
// L'année est choisie par la query, comme sur l'écran trésorier : un budget
// appartient à une année scolaire (TRESO-F-03), et la consultation du budget
// clos de l'an dernier est une demande légitime.

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:my-project');

	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		return { projects: [], schoolYears: [], schoolYearId: null };
	}

	// `school_years` est lisible de tout membre connecté ; `periods()` lirait en
	// plus les exercices comptables, que la RLS refuse ici — une requête rejetée
	// pour rien à chaque chargement.
	const { data: years } = await locals.supabase
		.schema('cash')
		.from('school_years')
		.select('id, label, closed_at')
		.order('starts_on', { ascending: false });

	const schoolYears = (years ?? []).map((y) => ({
		id: y.id,
		label: y.label,
		closedAt: y.closed_at
	}));

	const requested = Number(url.searchParams.get('year'));
	const current = await currentSchoolYear(locals.supabase);
	const schoolYearId =
		Number.isSafeInteger(requested) && requested > 0 && schoolYears.some((y) => y.id === requested)
			? requested
			: (current?.id ?? schoolYears.at(0)?.id ?? null);

	return {
		projects: await projectOverviews(locals.supabase, user.id, schoolYearId),
		schoolYears,
		schoolYearId
	};
};
