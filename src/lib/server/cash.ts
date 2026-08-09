// Accès serveur au schéma `cash`.
//
// Aucune RPC n'est exposée à `authenticated` sur ce schéma : la création, la
// lecture et la consommation budgétaire passent par les tables et les vues, sous
// RLS. Le client est donc toujours `locals.supabase`, porteur du jeton du membre
// — jamais la clé de service : c'est la policy `items_insert`
// (`requested_by = auth.uid()`) qui garantit qu'un membre n'écrit que pour lui.

import type { Database } from '@davincibot/database-types';
import type { Campus, ItemState, ItemTag, ProjectPermission } from '@davincibot/lib';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

// Les vues `cash.*` sont bâties sur des CTE récursives et `total_ttc` est une
// colonne générée : Postgres déclare tout cela nullable, donc les types générés
// aussi, même là où une valeur nulle est impossible en pratique. Ces deux
// coercitions concentrent la conversion en un seul endroit plutôt que d'essaimer
// des `?? 0` que le typage et le lint interprètent différemment.
const num = (value: number | null): number => value ?? 0;
const str = (value: string | null): string => value ?? '';

/** Vue projet du sélecteur de panier : ce qu'il faut pour résoudre le campus. */
export interface ProjectChoice {
	id: number;
	name: string;
	campus: Campus | null;
	budgetId: number | null;
}

export interface MyItem {
	id: number;
	name: string;
	link: string | null;
	unitPriceTtc: number;
	quantity: number;
	totalTtc: number;
	tags: ItemTag[];
	note: string | null;
	state: ItemState;
	campus: Campus;
	projectId: number;
	projectName: string;
	refusedReason: string | null;
	createdAt: string;
}

/**
 * Année scolaire couvrant une date donnée.
 *
 * `cash.items.school_year_id` est NOT NULL sans défaut et aucun trigger ne le
 * renseigne : c'est à l'application de le résoudre. Une écriture hors de toute
 * année ouverte n'a pas de repli silencieux — mieux vaut refuser que rattacher
 * l'item à une année arbitraire, qui fausserait ensuite tous les totaux.
 */
export async function currentSchoolYear(
	supabase: Client,
	on: Date = new Date()
): Promise<{ id: number; label: string; closedAt: string | null } | null> {
	const day = on.toISOString().slice(0, 10);
	const { data, error } = await supabase
		.schema('cash')
		.from('school_years')
		.select('id, label, closed_at')
		.lte('starts_on', day)
		.gte('ends_on', day)
		.maybeSingle();

	if (error || !data) {
		return null;
	}
	return { id: data.id, label: data.label, closedAt: data.closed_at };
}

/**
 * Campus de destination d'un item, résolu comme le fait le trigger
 * `cash.resolve_item_campus` — mais en amont, pour poser la question au membre
 * plutôt que de lui renvoyer une erreur DVB01 (CMD-F-46).
 *
 * `needsChoice` couvre deux cas que la base traite pareillement : la divergence
 * projet / membre, et l'indétermination totale (ni l'un ni l'autre ne porte de
 * campus). Dans les deux cas, seule la personne qui reçoit le colis sait, donc
 * on lui demande.
 */
export function resolveCampus(
	projectCampus: Campus | null,
	memberCampus: Campus | null
): { campus: Campus | null; needsChoice: boolean; diverges: boolean } {
	if (projectCampus && memberCampus && projectCampus !== memberCampus) {
		return { campus: null, needsChoice: true, diverges: true };
	}
	const campus = projectCampus ?? memberCampus;
	return { campus, needsChoice: campus === null, diverges: false };
}

/** Projets auxquels le membre est rattaché, avec le budget que chacun désigne. */
export async function memberProjects(
	supabase: Client,
	profileId: string
): Promise<ProjectChoice[]> {
	const { data, error } = await supabase
		.from('member_of')
		.select('project(id, name, campus, budget_id, archived_at)')
		.eq('profile', profileId)
		.is('revoked_at', null);

	if (error) {
		return [];
	}

	return data
		.map((row) => row.project)
		.filter((p) => !p.archived_at)
		.map((p) => ({
			id: p.id,
			name: p.name ?? '',
			campus: p.campus,
			budgetId: p.budget_id
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export interface BudgetPressure {
	budgetId: number;
	name: string;
	allocatedTtc: number;
	/** Engagé : items déjà imputés + quote-part de port (TRESO-F-04). */
	consumedTtc: number;
	/** Demandé mais pas encore imputé — invisible de budget_consumption. */
	requestedTtc: number;
	remainingTtc: number;
}

/**
 * Pression budgétaire d'un projet, telle qu'un membre doit la voir à la saisie.
 *
 * `cash.budget_consumption.consumed_ttc` ne compte que ce qui est **imputé**,
 * c'est-à-dire passé par une commande. Un membre qui vient de demander pour
 * 400 € ne verrait donc aucun dépassement tant que le trésorier n'a pas
 * regroupé — l'alerte arriverait toujours trop tard. On y ajoute les items déjà
 * demandés et non encore imputés (`pending_cdp`, `pending_bundled`) : c'est la
 * seule lecture qui rende CMD-F-06 utile au moment de la saisie.
 *
 * Renvoie `null` quand le projet ne désigne aucun budget — cas normal tant que
 * le jalon 6 n'a pas ouvert la gestion de l'arbre. Un indicateur absent vaut
 * mieux qu'un indicateur faux.
 */
export async function budgetPressure(
	supabase: Client,
	project: ProjectChoice,
	schoolYearId: number
): Promise<BudgetPressure | null> {
	if (!project.budgetId) {
		return null;
	}

	const [{ data: budget }, { data: pending }] = await Promise.all([
		supabase
			.schema('cash')
			.from('budget_consumption')
			.select('budget_id, name, allocated_ttc, consumed_ttc, remaining_ttc')
			.eq('budget_id', project.budgetId)
			.maybeSingle(),
		supabase
			.schema('cash')
			.from('items')
			.select('total_ttc')
			.eq('project_id', project.id)
			.eq('school_year_id', schoolYearId)
			.in('state', ['pending_cdp', 'pending_bundled'])
	]);

	if (!budget) {
		return null;
	}

	const requestedTtc = (pending ?? []).reduce((sum, row) => sum + num(row.total_ttc), 0);

	return {
		budgetId: num(budget.budget_id),
		name: str(budget.name),
		allocatedTtc: num(budget.allocated_ttc),
		consumedTtc: num(budget.consumed_ttc),
		requestedTtc,
		remainingTtc: num(budget.remaining_ttc) - requestedTtc
	};
}

/** Items du membre connecté, du plus récent au plus ancien. */
export async function myItems(supabase: Client, profileId: string): Promise<MyItem[]> {
	const { data, error } = await supabase
		.schema('cash')
		.from('items')
		.select(
			'id, name, link, unit_price_ttc, quantity, total_ttc, tags, note, state, campus, project_id, refused_reason, created_at'
		)
		.eq('requested_by', profileId)
		.order('created_at', { ascending: false });

	if (error) {
		return [];
	}

	// `cash.items.project_id` référence `public.projects`, un autre schéma :
	// PostgREST n'embarque pas la relation, il faut donc résoudre les noms à part.
	const projectIds = [...new Set(data.map((i) => i.project_id))];
	const names = new Map<number, string>();
	if (projectIds.length > 0) {
		const { data: projects } = await supabase
			.from('projects')
			.select('id, name')
			.in('id', projectIds);
		for (const p of projects ?? []) {
			names.set(p.id, p.name ?? '');
		}
	}

	return data.map((i) => ({
		id: i.id,
		name: i.name,
		link: i.link,
		unitPriceTtc: i.unit_price_ttc,
		quantity: i.quantity,
		totalTtc: num(i.total_ttc),
		tags: i.tags,
		note: i.note,
		state: i.state,
		campus: i.campus,
		projectId: i.project_id,
		projectName: names.get(i.project_id) ?? '—',
		refusedReason: i.refused_reason,
		createdAt: i.created_at
	}));
}

/** Projet sur lequel le membre connecté détient une permission scopée-projet. */
export interface ScopedProject {
	id: number;
	name: string;
	campus: Campus | null;
}

/**
 * Projets sur lesquels le membre connecté détient une permission donnée.
 *
 * Reprend le calcul de `public.has_project_permission()` — catalogue du rôle
 * projet plus overrides additifs de la ligne `member_of` — mais renvoie la
 * LISTE, là où la fonction SQL ne répond que par oui ou non sur un projet
 * nommé. La file de revue en a besoin pour se borner : `items_read` autorise
 * aussi la lecture des items qu'on a soi-même demandés et, pour un porteur
 * d'`orders.read.all`, celle de tous les items de l'association. Sans ce
 * bornage explicite, la file d'un trésorier CDP d'un seul projet lui présenterait
 * l'intégralité des demandes en attente comme si elles lui revenaient.
 */
export async function projectsWithPermission(
	supabase: Client,
	profileId: string,
	permission: ProjectPermission
): Promise<ScopedProject[]> {
	const [{ data: memberships, error }, { data: catalogue }] = await Promise.all([
		supabase
			.from('member_of')
			.select('role, permissions, project(id, name, campus, archived_at)')
			.eq('profile', profileId)
			.is('revoked_at', null),
		supabase.from('project_role_permissions').select('role, permissions')
	]);

	if (error) {
		return [];
	}

	const byRole = new Map((catalogue ?? []).map((row) => [row.role, row.permissions]));

	return memberships
		.filter(
			(m) =>
				!m.project.archived_at &&
				((byRole.get(m.role) ?? []).includes(permission) || m.permissions.includes(permission))
		)
		.map((m) => ({ id: m.project.id, name: m.project.name ?? '', campus: m.project.campus }))
		.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export interface ReviewItem {
	id: number;
	name: string;
	link: string | null;
	unitPriceTtc: number;
	quantity: number;
	totalTtc: number;
	tags: ItemTag[];
	note: string | null;
	campus: Campus;
	projectId: number;
	projectName: string;
	requestedBy: string;
	requesterName: string;
	createdAt: string;
}

/**
 * File des items en attente de revue, du plus ancien au plus récent.
 *
 * L'ordre est celui de l'attente : un item déposé il y a trois semaines passe
 * avant celui d'hier. C'est le pendant, côté CDP, du tri par date de validation
 * de la file du trésorier (CMD-F-80).
 */
export async function reviewQueue(
	supabase: Client,
	projects: ScopedProject[]
): Promise<ReviewItem[]> {
	if (projects.length === 0) {
		return [];
	}

	const names = new Map(projects.map((p) => [p.id, p.name]));

	const { data, error } = await supabase
		.schema('cash')
		.from('items')
		.select(
			'id, name, link, unit_price_ttc, quantity, total_ttc, tags, note, campus, project_id, requested_by, created_at'
		)
		.eq('state', 'pending_cdp')
		.in(
			'project_id',
			projects.map((p) => p.id)
		)
		.order('created_at', { ascending: true });

	if (error) {
		return [];
	}

	// `cash.items.requested_by` pointe vers `auth.users` : la relation ne
	// s'embarque pas depuis PostgREST, le nom d'usage se lit dans public.profiles.
	const requesterIds = [...new Set(data.map((i) => i.requested_by))];
	const requesters = new Map<string, string>();
	if (requesterIds.length > 0) {
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, username')
			.in('id', requesterIds);
		for (const p of profiles ?? []) {
			requesters.set(p.id, p.username ?? '');
		}
	}

	return data.map((i) => ({
		id: i.id,
		name: i.name,
		link: i.link,
		unitPriceTtc: i.unit_price_ttc,
		quantity: i.quantity,
		totalTtc: num(i.total_ttc),
		tags: i.tags,
		note: i.note,
		campus: i.campus,
		projectId: i.project_id,
		projectName: names.get(i.project_id) ?? '—',
		requestedBy: i.requested_by,
		requesterName: requesters.get(i.requested_by) ?? 'Membre inconnu',
		createdAt: i.created_at
	}));
}
