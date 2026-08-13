import { resolve } from '$app/paths';
import { budgetPressure, currentSchoolYear, memberProjects, resolveCampus } from '$lib/server/cash';
import { jsonArray, text, textAll } from '$lib/server/form';
import { cashErrorMessage, type Campus, type ItemTag } from '@davincibot/lib';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Le panier est un ÉCRAN DE SAISIE, pas une entité (CMD-F-09) : chaque ligne
// part en base comme un item indépendant, et rien ne persiste le regroupement.
// C'est pour cela qu'il n'y a ici ni table ni identifiant de panier.

interface CartLine {
	name: string;
	link: string;
	unitPriceTtc: number;
	quantity: number;
	tags: ItemTag[];
	note: string;
}

const MAX_LINES = 50;

function parseLines(form: FormData): { lines: CartLine[]; message?: string } {
	const names = textAll(form, 'name');
	const links = textAll(form, 'link');
	const prices = textAll(form, 'unit_price_ttc');
	const quantities = textAll(form, 'quantity');
	const notes = textAll(form, 'note');
	// Les tags sont multi-valués PAR LIGNE : ils voyagent en JSON, un tableau
	// sérialisé par ligne, sinon getAll() les aplatit et on perd l'appartenance.
	const tags = textAll(form, 'tags');

	if (names.length === 0) {
		return { lines: [], message: 'Ajoutez au moins un composant.' };
	}
	if (names.length > MAX_LINES) {
		return { lines: [], message: `Un panier ne peut pas dépasser ${String(MAX_LINES)} lignes.` };
	}

	const lines: CartLine[] = [];
	for (let i = 0; i < names.length; i++) {
		const rank = String(i + 1);
		const name = (names[i] ?? '').trim();
		const rawPrice = prices[i] ?? '';
		const note = (notes[i] ?? '').trim();
		// Une ligne entièrement vide est ignorée, pas rejetée : c'est le cas normal
		// du membre qui a ajouté une ligne puis changé d'avis.
		if (!name && !links[i] && !rawPrice && !note) {
			continue;
		}
		if (!name) {
			return { lines: [], message: `Ligne ${rank} : le nom est obligatoire.` };
		}
		const price = Number(rawPrice.replace(',', '.'));
		if (!Number.isFinite(price) || price < 0) {
			return { lines: [], message: `Ligne ${rank} : prix unitaire invalide.` };
		}
		const quantity = Number(quantities[i] ?? '');
		if (!Number.isInteger(quantity) || quantity < 1) {
			return { lines: [], message: `Ligne ${rank} : la quantité doit être au moins 1.` };
		}

		lines.push({
			name,
			link: (links[i] ?? '').trim(),
			unitPriceTtc: Math.round(price * 100) / 100,
			quantity,
			tags: jsonArray<ItemTag>(tags[i] ?? ''),
			note
		});
	}

	if (lines.length === 0) {
		return { lines: [], message: 'Ajoutez au moins un composant.' };
	}
	return { lines };
}

export const load: PageServerLoad = async ({ depends, locals }) => {
	depends('cash:item-form');

	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		error(401, 'Session expirée.');
	}

	const [projects, schoolYear] = await Promise.all([
		memberProjects(locals.supabase, user.id),
		currentSchoolYear(locals.supabase)
	]);

	// Le campus du membre est une donnée d'annuaire, tenue par l'écran de gestion
	// des membres : on la lit, on ne la déduit pas.
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('campus')
		.eq('id', user.id)
		.maybeSingle();

	const memberCampus = profile?.campus ?? null;

	// La pression budgétaire est précalculée pour tous les projets du membre :
	// changer de projet dans le sélecteur doit rafraîchir l'indicateur sans
	// aller-retour serveur (CMD-F-06).
	const pressures = await Promise.all(
		projects.map(async (p) =>
			schoolYear ? await budgetPressure(locals.supabase, p, schoolYear.id) : null
		)
	);

	// CMD-F-05 : inciter à passer par les partenaires. Les domaines servent déjà à
	// reconnaître un partenariat dans un lien (TRESO-F-12) ; les afficher ici
	// suffit à orienter la saisie, sans moteur de suggestion (CMD-F-07, jalon 9).
	const { data: partnerships } = schoolYear
		? await locals.supabase
				.schema('cash')
				.from('partnerships')
				.select('name, domains')
				.eq('school_year_id', schoolYear.id)
				.is('archived_at', null)
				.order('name')
		: { data: [] };

	return {
		projects: projects.map((p, i) => ({
			...p,
			...resolveCampus(p.campus, memberCampus),
			budget: pressures[i]
		})),
		memberCampus,
		schoolYear,
		partnerships: partnerships ?? []
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const projectId = Number(text(form, 'project_id'));
		const rawCampus = text(form, 'campus');
		const chosenCampus: Campus | null =
			rawCampus === 'nantes' || rawCampus === 'paris' ? rawCampus : null;

		if (!Number.isInteger(projectId)) {
			return fail(400, { message: 'Choisissez un projet.' });
		}

		const { lines, message } = parseLines(form);
		if (message) {
			return fail(400, { message });
		}

		const [projects, schoolYear] = await Promise.all([
			memberProjects(locals.supabase, user.id),
			currentSchoolYear(locals.supabase)
		]);

		const project = projects.find((p) => p.id === projectId);
		if (!project) {
			return fail(403, { message: "Vous n'êtes pas rattaché à ce projet." });
		}
		if (!schoolYear) {
			return fail(409, {
				message: "Aucune année scolaire n'est ouverte pour aujourd'hui : prévenez la trésorerie."
			});
		}
		if (schoolYear.closedAt) {
			return fail(409, { message: cashErrorMessage('DVB02', 'Année scolaire close.') });
		}

		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('campus')
			.eq('id', user.id)
			.maybeSingle();

		const resolved = resolveCampus(project.campus, profile?.campus ?? null);
		// Le membre tranche, et son choix prime : c'est exactement ce que le trigger
		// `resolve_item_campus` attend quand il reçoit un campus non nul (CMD-F-46).
		const campus = resolved.needsChoice ? chosenCampus : (resolved.campus ?? chosenCampus);
		if (!campus) {
			return fail(400, {
				message: 'Indiquez le campus de livraison : le projet et votre profil ne concordent pas.'
			});
		}

		const { error: insertError } = await locals.supabase
			.schema('cash')
			.from('items')
			.insert(
				lines.map((line) => ({
					name: line.name,
					link: line.link || null,
					unit_price_ttc: line.unitPriceTtc,
					quantity: line.quantity,
					tags: line.tags,
					note: line.note || null,
					campus,
					project_id: projectId,
					requested_by: user.id,
					school_year_id: schoolYear.id
				}))
			);

		if (insertError) {
			return fail(400, {
				message: cashErrorMessage(insertError.code, "Ces composants n'ont pas pu être enregistrés.")
			});
		}

		redirect(303, resolve('/'));
	}
};
