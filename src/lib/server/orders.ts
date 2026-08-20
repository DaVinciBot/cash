// Accès serveur au parcours trésorier : file de regroupement, commandes,
// imputations budgétaires.
//
// Comme pour le parcours membre, le client est toujours `locals.supabase` et
// jamais la clé de service : les policies `orders_write`, `allocations_write` et
// `items_update` sont ce qui décide, et les faire contourner par le serveur
// reviendrait à réécrire les droits ici, en double et sans garantie.
//
// Une exception, et une seule : `cash.set_item_allocations`, la seule RPC
// exposée à `authenticated` sur ce schéma. Elle est en SECURITY INVOKER, donc
// la RLS continue de trancher — elle n'existe que pour réunir suppression et
// réinsertion des imputations dans une même transaction, ce qu'un client
// PostgREST ne sait pas faire (voir la migration 20260809110000).

import { num, str } from '$lib/server/coerce';
import type { Database } from '@davincibot/database-types';
import type { Campus, ItemTag, OrderState, ShippingAllocation } from '@davincibot/lib';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

/** Item validé par son CDP et libre de toute commande. */
export interface BundlableItem {
	id: number;
	name: string;
	link: string | null;
	domain: string | null;
	unitPriceTtc: number;
	quantity: number;
	totalTtc: number;
	tags: ItemTag[];
	/** CMD-F-0B — visible sans déplier : c'est par là que passe une livraison exceptionnelle. */
	note: string | null;
	campus: Campus;
	projectId: number;
	projectName: string;
	requesterName: string;
	cdpApprovedAt: string | null;
	createdAt: string;
}

/**
 * File des items à regrouper (CMD-F-80).
 *
 * Triée par date de validation CDP, du plus ancien au plus récent : l'item
 * validé en premier est regroupé en premier. C'est un tri d'équité, pas de
 * confort — sans lui, une demande sans urgence apparente peut attendre
 * indéfiniment derrière des demandes plus récentes.
 */
export async function bundlingQueue(supabase: Client): Promise<BundlableItem[]> {
	const { data, error } = await supabase
		.schema('cash')
		.from('items')
		.select(
			'id, name, link, domain, unit_price_ttc, quantity, total_ttc, tags, note, campus, project_id, requested_by, cdp_approved_at, created_at'
		)
		.eq('state', 'pending_bundled')
		.is('order_id', null)
		.order('cdp_approved_at', { ascending: true, nullsFirst: true });

	if (error || data.length === 0) {
		return [];
	}

	const [projects, requesters] = await Promise.all([
		projectNames(
			supabase,
			data.map((i) => i.project_id)
		),
		requesterNames(
			supabase,
			data.map((i) => i.requested_by)
		)
	]);

	return data.map((i) => ({
		id: i.id,
		name: i.name,
		link: i.link,
		domain: i.domain,
		unitPriceTtc: i.unit_price_ttc,
		quantity: i.quantity,
		totalTtc: num(i.total_ttc),
		tags: i.tags,
		note: i.note,
		campus: i.campus,
		projectId: i.project_id,
		projectName: projects.get(i.project_id) ?? '—',
		requesterName: requesters.get(i.requested_by) ?? 'Membre inconnu',
		cdpApprovedAt: i.cdp_approved_at,
		createdAt: i.created_at
	}));
}

/** `cash.items.project_id` pointe vers `public.projects` : PostgREST n'embarque pas la relation. */
async function projectNames(supabase: Client, ids: number[]): Promise<Map<number, string>> {
	const unique = [...new Set(ids)];
	const names = new Map<number, string>();
	if (unique.length === 0) {
		return names;
	}
	const { data } = await supabase.from('projects').select('id, name').in('id', unique);
	for (const p of data ?? []) {
		names.set(p.id, str(p.name));
	}
	return names;
}

/** `cash.items.requested_by` pointe vers `auth.users` : le nom d'usage est dans public.profiles. */
async function requesterNames(supabase: Client, ids: string[]): Promise<Map<string, string>> {
	const unique = [...new Set(ids)];
	const names = new Map<string, string>();
	if (unique.length === 0) {
		return names;
	}
	const { data } = await supabase.from('profiles').select('id, username').in('id', unique);
	for (const p of data ?? []) {
		names.set(p.id, str(p.username) || 'Membre inconnu');
	}
	return names;
}

export interface BudgetLeaf {
	id: number;
	name: string;
	/** Chemin depuis la racine, pour lever l'ambiguïté entre deux feuilles homonymes. */
	path: string;
	allocatedTtc: number;
	consumedTtc: number;
	remainingTtc: number;
}

interface BudgetNode {
	id: number;
	name: string;
	parentId: number | null;
	isDefault: boolean;
	archivedAt: string | null;
}

/**
 * Feuilles imputables d'une année scolaire, avec leur consommation (CMD-F-18).
 *
 * « Feuille » se lit sur l'arbre vivant : un nœud dont tous les enfants sont
 * archivés redevient imputable. C'est la définition de la vue `budget_leaves`,
 * reprise ici pour disposer aussi du chemin complet et du nœud par défaut.
 */
export async function budgetLeaves(
	supabase: Client,
	schoolYearId: number
): Promise<{ leaves: BudgetLeaf[]; nodes: BudgetNode[] }> {
	const [{ data: budgets }, { data: consumption }] = await Promise.all([
		supabase
			.schema('cash')
			.from('budgets')
			.select('id, name, parent_id, is_default, archived_at')
			.eq('school_year_id', schoolYearId),
		supabase
			.schema('cash')
			.from('budget_consumption')
			.select('budget_id, allocated_ttc, consumed_ttc, remaining_ttc')
			.eq('school_year_id', schoolYearId)
	]);

	const nodes: BudgetNode[] = (budgets ?? []).map((b) => ({
		id: b.id,
		name: b.name,
		parentId: b.parent_id,
		isDefault: b.is_default,
		archivedAt: b.archived_at
	}));

	const byId = new Map(nodes.map((n) => [n.id, n]));
	const hasLiveChild = new Set<number>();
	for (const n of nodes) {
		if (!n.archivedAt && n.parentId !== null) {
			hasLiveChild.add(n.parentId);
		}
	}
	const usage = new Map((consumption ?? []).map((c) => [num(c.budget_id), c]));

	const path = (node: BudgetNode): string => {
		const parts: string[] = [node.name];
		let current = node.parentId === null ? undefined : byId.get(node.parentId);
		// Garde-fou : `check_budget_tree` interdit les cycles, mais une lecture
		// partielle ne doit pas partir en boucle infinie pour autant.
		let depth = 0;
		while (current && depth < 16) {
			parts.unshift(current.name);
			current = current.parentId === null ? undefined : byId.get(current.parentId);
			depth += 1;
		}
		return parts.join(' › ');
	};

	const leaves = nodes
		.filter((n) => !n.archivedAt && !hasLiveChild.has(n.id))
		.map((n) => {
			const c = usage.get(n.id);
			return {
				id: n.id,
				name: n.name,
				path: path(n),
				allocatedTtc: num(c?.allocated_ttc ?? 0),
				consumedTtc: num(c?.consumed_ttc ?? 0),
				remainingTtc: num(c?.remaining_ttc ?? 0)
			};
		})
		.sort((a, b) => a.path.localeCompare(b.path, 'fr'));

	return { leaves, nodes };
}

/**
 * Feuille présélectionnée pour un item, d'après le budget que désigne son projet
 * (CMD-F-18, TRESO-F-02c).
 *
 * Le projet pointe n'importe où dans l'arbre — souvent un nœud intermédiaire,
 * qui ne reçoit aucune imputation. On descend donc jusqu'à la feuille marquée
 * par défaut dans son sous-arbre ; si le nœud désigné est lui-même une feuille,
 * c'est lui. Sans feuille par défaut, aucune présélection : mieux vaut faire
 * choisir que deviner sur quel poste l'argent part.
 */
export function defaultLeafFor(
	nodes: { id: number; parentId: number | null; isDefault: boolean; archivedAt: string | null }[],
	leafIds: Set<number>,
	projectBudgetId: number | null
): number | null {
	if (projectBudgetId === null) {
		return null;
	}
	if (leafIds.has(projectBudgetId)) {
		return projectBudgetId;
	}

	const children = new Map<number, typeof nodes>();
	for (const n of nodes) {
		if (n.parentId === null || n.archivedAt) {
			continue;
		}
		const list = children.get(n.parentId) ?? [];
		list.push(n);
		children.set(n.parentId, list);
	}

	const stack = [projectBudgetId];
	const seen = new Set<number>();
	while (stack.length > 0) {
		const current = stack.pop();
		if (current === undefined || seen.has(current)) {
			continue;
		}
		seen.add(current);
		for (const child of children.get(current) ?? []) {
			if (leafIds.has(child.id) && child.isDefault) {
				return child.id;
			}
			stack.push(child.id);
		}
	}
	return null;
}

export interface OrderSummary {
	id: number;
	state: OrderState;
	campus: Campus | null;
	schoolYearId: number;
	schoolYearLabel: string;
	amountTtc: number;
	shippingCostTtc: number;
	itemCount: number;
	receivedCount: number;
	createdAt: string;
	orderedAt: string | null;
	/** Date qui trie la ligne : passation si la commande est passée, création sinon (CMD-F-86). */
	sortDate: string;
}

/**
 * Liste des commandes, regroupées par année scolaire (CMD-F-81) et triées selon
 * CMD-F-86 : date de passation pour ce qui est passé, date de création sinon.
 *
 * Jamais la date de dernière mise à jour — c'était le défaut n° 9, et il n'y a
 * d'ailleurs aucune colonne `updated_at` à lire (TRANS-NF-50).
 */
export async function orderList(supabase: Client): Promise<OrderSummary[]> {
	const [{ data: orders }, { data: years }] = await Promise.all([
		supabase
			.schema('cash')
			.from('orders')
			.select('id, state, school_year_id, amount_ttc, shipping_cost_ttc, created_at, ordered_at'),
		supabase.schema('cash').from('school_years').select('id, label')
	]);

	if (!orders || orders.length === 0) {
		return [];
	}

	const labels = new Map((years ?? []).map((y) => [y.id, y.label]));

	const { data: items } = await supabase
		.schema('cash')
		.from('items')
		.select('order_id, state, campus')
		.in(
			'order_id',
			orders.map((o) => o.id)
		);

	const stats = new Map<number, { count: number; received: number; campus: Campus | null }>();
	for (const i of items ?? []) {
		if (i.order_id === null) {
			continue;
		}
		const s = stats.get(i.order_id) ?? { count: 0, received: 0, campus: null };
		s.count += 1;
		if (i.state === 'received') {
			s.received += 1;
		}
		s.campus ??= i.campus;
		stats.set(i.order_id, s);
	}

	return orders
		.map((o) => {
			const s = stats.get(o.id);
			return {
				id: o.id,
				state: o.state,
				campus: s?.campus ?? null,
				schoolYearId: o.school_year_id,
				schoolYearLabel: labels.get(o.school_year_id) ?? '—',
				amountTtc: o.amount_ttc,
				shippingCostTtc: o.shipping_cost_ttc,
				itemCount: s?.count ?? 0,
				receivedCount: s?.received ?? 0,
				createdAt: o.created_at,
				orderedAt: o.ordered_at,
				sortDate: o.ordered_at ?? o.created_at
			};
		})
		.sort((a, b) => {
			if (a.schoolYearId !== b.schoolYearId) {
				return b.schoolYearId - a.schoolYearId;
			}
			return b.sortDate.localeCompare(a.sortDate);
		});
}

export interface OrderItem extends BundlableItem {
	state: Database['cash']['Tables']['items']['Row']['state'];
	allocations: { budgetId: number; amountTtc: number }[];
}

export interface OrderShare {
	budgetId: number;
	budgetPath: string;
	itemsSubtotal: number;
	shippingShare: number;
	totalShare: number;
	remainingTtc: number;
}

export interface OrderDetail {
	id: number;
	state: OrderState;
	schoolYearId: number;
	schoolYearLabel: string;
	amountTtc: number;
	shippingCostTtc: number;
	shippingAllocation: ShippingAllocation;
	campus: Campus | null;
	createdAt: string;
	orderedAt: string | null;
	deliveredAt: string | null;
	items: OrderItem[];
	shares: OrderShare[];
}

/** Détail complet d'une commande : items, imputations et quotes-parts de port. */
export async function orderDetail(supabase: Client, id: number): Promise<OrderDetail | null> {
	const { data: order } = await supabase
		.schema('cash')
		.from('orders')
		.select(
			'id, state, school_year_id, amount_ttc, shipping_cost_ttc, shipping_allocation, created_at, ordered_at, delivered_at'
		)
		.eq('id', id)
		.maybeSingle();

	if (!order) {
		return null;
	}

	const [{ data: items }, { data: shares }, { data: year }] = await Promise.all([
		supabase
			.schema('cash')
			.from('items')
			.select(
				'id, name, link, domain, unit_price_ttc, quantity, total_ttc, tags, note, state, campus, project_id, requested_by, cdp_approved_at, created_at'
			)
			.eq('order_id', id)
			.order('id', { ascending: true }),
		supabase
			.schema('cash')
			.from('order_budget_shares')
			.select('budget_id, items_subtotal, shipping_share, total_share')
			.eq('order_id', id),
		supabase
			.schema('cash')
			.from('school_years')
			.select('label')
			.eq('id', order.school_year_id)
			.maybeSingle()
	]);

	const rows = items ?? [];
	const [projects, requesters, { data: allocations }] = await Promise.all([
		projectNames(
			supabase,
			rows.map((i) => i.project_id)
		),
		requesterNames(
			supabase,
			rows.map((i) => i.requested_by)
		),
		supabase
			.schema('cash')
			.from('item_budget_allocations')
			.select('item_id, budget_id, amount_ttc')
			.in(
				'item_id',
				rows.map((i) => i.id)
			)
	]);

	const byItem = new Map<number, { budgetId: number; amountTtc: number }[]>();
	for (const a of allocations ?? []) {
		const list = byItem.get(a.item_id) ?? [];
		list.push({ budgetId: a.budget_id, amountTtc: a.amount_ttc });
		byItem.set(a.item_id, list);
	}

	const { leaves } = await budgetLeaves(supabase, order.school_year_id);
	const leafById = new Map(leaves.map((l) => [l.id, l]));

	return {
		id: order.id,
		state: order.state,
		schoolYearId: order.school_year_id,
		schoolYearLabel: str(year?.label ?? null) || '—',
		amountTtc: order.amount_ttc,
		shippingCostTtc: order.shipping_cost_ttc,
		shippingAllocation: order.shipping_allocation,
		campus: rows.at(0)?.campus ?? null,
		createdAt: order.created_at,
		orderedAt: order.ordered_at,
		deliveredAt: order.delivered_at,
		items: rows.map((i) => ({
			id: i.id,
			name: i.name,
			link: i.link,
			domain: i.domain,
			unitPriceTtc: i.unit_price_ttc,
			quantity: i.quantity,
			totalTtc: num(i.total_ttc),
			tags: i.tags,
			note: i.note,
			state: i.state,
			campus: i.campus,
			projectId: i.project_id,
			projectName: projects.get(i.project_id) ?? '—',
			requesterName: requesters.get(i.requested_by) ?? 'Membre inconnu',
			cdpApprovedAt: i.cdp_approved_at,
			createdAt: i.created_at,
			allocations: byItem.get(i.id) ?? []
		})),
		shares: (shares ?? []).map((s) => ({
			budgetId: s.budget_id,
			budgetPath: leafById.get(s.budget_id)?.path ?? `Budget #${String(s.budget_id)}`,
			itemsSubtotal: s.items_subtotal,
			shippingShare: s.shipping_share,
			totalShare: num(s.total_share),
			remainingTtc: leafById.get(s.budget_id)?.remainingTtc ?? 0
		}))
	};
}

/** Adresse complète d'un campus, telle que le bouton « copier » la dépose (CMD-F-41). */
export async function campusAddress(supabase: Client, campus: Campus): Promise<string | null> {
	const { data } = await supabase
		.schema('cash')
		.from('campus_addresses')
		.select('formatted')
		.eq('campus', campus)
		.maybeSingle();
	return data?.formatted ?? null;
}
