// Accès serveur à la trésorerie : arbre des budgets, comptes, flux, périodes.
//
// Comme partout dans `cash`, le client est `locals.supabase` et jamais la clé de
// service : `budgets_write`, `flows_write`, `accounts_write` (finance.write),
// `fiscal_years_write` / `school_years_write` (finance.periods.close) et
// `projects_write` (projects.manage.all) sont ce qui décide.
//
// `projects.manage.all` porte l'ENTITÉ projet — nom, campus, budget désigné,
// archivage. Les adhésions relèvent d'une autre permission et d'un autre écran.

import type { Database } from '@davincibot/database-types';
import type { AccountKind, Campus, FlowDirection, FlowOrigin } from '@davincibot/lib';
import { countsTowardTreasury } from '@davincibot/lib';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

const num = (value: number | null): number => value ?? 0;
const str = (value: string | null): string => value ?? '';

export interface BudgetNode {
	id: number;
	name: string;
	parentId: number | null;
	schoolYearId: number;
	/** Montant saisi — présent sur les seules feuilles (TRESO-F-02b). */
	amountTtc: number | null;
	isDefault: boolean;
	archivedAt: string | null;
	/** Profondeur dans l'arbre, pour l'indentation de la liste. */
	depth: number;
	isLeaf: boolean;
	/** Alloué et consommé, sommes des descendants pour un nœud (TRESO-F-04). */
	allocatedTtc: number;
	consumedTtc: number;
	remainingTtc: number;
	/** Projets qui désignent ce nœud — un nœud peut n'en avoir aucun. */
	projects: string[];
}

/**
 * Arbre des budgets d'une année scolaire, à plat mais ordonné en préfixe.
 *
 * L'aplatissement conserve la hiérarchie par `depth` : c'est ce qu'une liste
 * HTML sait rendre, et cela évite un composant récursif pour un arbre qui tient
 * en quelques dizaines de nœuds. La consommation vient de `budget_consumption`,
 * qui somme déjà les descendants — on ne la recalcule pas ici, sans quoi les
 * deux lectures divergeraient au premier changement de règle.
 */
export async function budgetTree(supabase: Client, schoolYearId: number): Promise<BudgetNode[]> {
	const [{ data: budgets }, { data: consumption }, { data: projects }] = await Promise.all([
		supabase
			.schema('cash')
			.from('budgets')
			.select('id, name, parent_id, school_year_id, amount_ttc, is_default, archived_at')
			.eq('school_year_id', schoolYearId),
		supabase
			.schema('cash')
			.from('budget_consumption')
			.select('budget_id, allocated_ttc, consumed_ttc, remaining_ttc')
			.eq('school_year_id', schoolYearId),
		supabase.from('projects').select('id, name, budget_id').is('archived_at', null)
	]);

	const rows = budgets ?? [];
	const usage = new Map((consumption ?? []).map((c) => [num(c.budget_id), c]));

	const projectsOf = new Map<number, string[]>();
	for (const p of projects ?? []) {
		if (p.budget_id === null) {
			continue;
		}
		projectsOf.set(p.budget_id, [...(projectsOf.get(p.budget_id) ?? []), str(p.name)]);
	}

	const hasLiveChild = new Set<number>();
	for (const b of rows) {
		if (!b.archived_at && b.parent_id !== null) {
			hasLiveChild.add(b.parent_id);
		}
	}

	const childrenOf = new Map<number | null, typeof rows>();
	for (const b of rows) {
		const key = b.parent_id;
		childrenOf.set(key, [...(childrenOf.get(key) ?? []), b]);
	}
	for (const list of childrenOf.values()) {
		list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	}

	const out: BudgetNode[] = [];
	const walk = (parentId: number | null, depth: number) => {
		// `check_budget_tree` interdit déjà les cycles ; la borne de profondeur
		// n'est qu'un garde-fou contre une lecture partielle.
		if (depth > 32) {
			return;
		}
		for (const b of childrenOf.get(parentId) ?? []) {
			const c = usage.get(b.id);
			out.push({
				id: b.id,
				name: b.name,
				parentId: b.parent_id,
				schoolYearId: b.school_year_id,
				amountTtc: b.amount_ttc,
				isDefault: b.is_default,
				archivedAt: b.archived_at,
				depth,
				isLeaf: !hasLiveChild.has(b.id),
				allocatedTtc: num(c?.allocated_ttc ?? 0),
				consumedTtc: num(c?.consumed_ttc ?? 0),
				remainingTtc: num(c?.remaining_ttc ?? 0),
				projects: projectsOf.get(b.id) ?? []
			});
			walk(b.id, depth + 1);
		}
	};
	walk(null, 0);
	return out;
}

/**
 * Budgets en dépassement, toutes années confondues (CMD-F-54).
 *
 * Le dépassement apparu après coup — correction de prix, frais de port,
 * réallocation — ne bloque rien mais doit rester visible quelque part. Seules
 * les feuilles sont listées : un nœud n'est en dépassement que parce qu'une de
 * ses feuilles l'est, et le signaler deux fois noierait l'information.
 */
export async function overdrawnBudgets(
	supabase: Client
): Promise<
	{ id: number; name: string; year: string; allocatedTtc: number; consumedTtc: number }[]
> {
	const [{ data: rows }, { data: years }, { data: budgets }] = await Promise.all([
		supabase
			.schema('cash')
			.from('budget_consumption')
			.select('budget_id, name, school_year_id, allocated_ttc, consumed_ttc, remaining_ttc')
			.lt('remaining_ttc', 0),
		supabase.schema('cash').from('school_years').select('id, label'),
		supabase.schema('cash').from('budgets').select('id, parent_id, archived_at')
	]);

	const labels = new Map((years ?? []).map((y) => [y.id, y.label]));
	const hasLiveChild = new Set<number>();
	for (const b of budgets ?? []) {
		if (!b.archived_at && b.parent_id !== null) {
			hasLiveChild.add(b.parent_id);
		}
	}

	return (rows ?? [])
		.filter((r) => !hasLiveChild.has(num(r.budget_id)))
		.map((r) => ({
			id: num(r.budget_id),
			name: str(r.name),
			year: labels.get(num(r.school_year_id)) ?? '—',
			allocatedTtc: num(r.allocated_ttc),
			consumedTtc: num(r.consumed_ttc)
		}))
		.sort((a, b) => a.consumedTtc - a.allocatedTtc - (b.consumedTtc - b.allocatedTtc));
}

export interface Account {
	id: number;
	name: string;
	kind: AccountKind;
	openingBalance: number;
	openedOn: string;
	archivedAt: string | null;
	balance: number;
	/** TRESO-F-15 — une enveloppe partenaire n'est pas de l'argent en banque. */
	countsTowardTreasury: boolean;
	/** Mouvements rattachés — ce que l'archivage laisse derrière lui. */
	flowCount: number;
}

/** Comptes et leur solde courant, enveloppes partenaires comprises mais marquées. */
export async function accounts(supabase: Client): Promise<Account[]> {
	const [{ data: rows }, { data: balances }, { data: flows }] = await Promise.all([
		supabase
			.schema('cash')
			.from('bank_accounts')
			.select('id, name, kind, opening_balance, opened_on, archived_at')
			.order('id'),
		supabase.schema('cash').from('account_balances').select('account_id, balance'),
		supabase.schema('cash').from('flows').select('account_id')
	]);

	const byId = new Map((balances ?? []).map((b) => [num(b.account_id), num(b.balance)]));

	const counts = new Map<number, number>();
	for (const f of flows ?? []) {
		counts.set(f.account_id, (counts.get(f.account_id) ?? 0) + 1);
	}

	return (rows ?? []).map((a) => ({
		id: a.id,
		name: a.name,
		kind: a.kind,
		openingBalance: a.opening_balance,
		openedOn: a.opened_on,
		archivedAt: a.archived_at,
		balance: byId.get(a.id) ?? a.opening_balance,
		countsTowardTreasury: countsTowardTreasury(a.kind),
		flowCount: counts.get(a.id) ?? 0
	}));
}

export interface AccountSnapshot {
	accountId: number;
	name: string;
	kind: AccountKind;
	balance: number;
	countsTowardTreasury: boolean;
}

/**
 * Solde de chaque compte à une date donnée (TRESO-F-51).
 *
 * `cash.account_balances` ne connaît pas les dates : elle donne le solde à
 * aujourd'hui. Un solde « à un instant donné » se recompose donc depuis le
 * solde d'ouverture et les seuls mouvements antérieurs ou égaux à la date —
 * c'est ce qu'un relevé bancaire donne à la même date, et c'est le rapprochement
 * qui sert de critère de sortie à ce jalon.
 */
export async function balancesOn(supabase: Client, on: string): Promise<AccountSnapshot[]> {
	const [{ data: rows }, { data: flows }] = await Promise.all([
		supabase
			.schema('cash')
			.from('bank_accounts')
			.select('id, name, kind, opening_balance')
			.order('id'),
		supabase
			.schema('cash')
			.from('flows')
			.select('account_id, direction, amount_ttc')
			.lte('occurred_on', on)
	]);

	const movement = new Map<number, number>();
	for (const f of flows ?? []) {
		const signed = f.direction === 'credit' ? f.amount_ttc : -f.amount_ttc;
		movement.set(f.account_id, (movement.get(f.account_id) ?? 0) + signed);
	}

	return (rows ?? []).map((a) => ({
		accountId: a.id,
		name: a.name,
		kind: a.kind,
		balance: Math.round((a.opening_balance + (movement.get(a.id) ?? 0)) * 100) / 100,
		countsTowardTreasury: countsTowardTreasury(a.kind)
	}));
}

/** Crédits et débits entre deux dates, bornes comprises (TRESO-F-52). */
export async function movementsBetween(
	supabase: Client,
	from: string,
	to: string
): Promise<{ credit: number; debit: number; count: number }> {
	const { data } = await supabase
		.schema('cash')
		.from('flows')
		.select('direction, amount_ttc')
		.gte('occurred_on', from)
		.lte('occurred_on', to);

	let credit = 0;
	let debit = 0;
	for (const f of data ?? []) {
		if (f.direction === 'credit') {
			credit += f.amount_ttc;
		} else {
			debit += f.amount_ttc;
		}
	}
	return {
		credit: Math.round(credit * 100) / 100,
		debit: Math.round(debit * 100) / 100,
		count: data?.length ?? 0
	};
}

export interface Proof {
	id: number;
	storagePath: string;
	mimeType: string;
	/** URL signée à durée courte — le bucket reste privé (TRESO-F-31). */
	url: string | null;
}

export interface Flow {
	id: number;
	direction: FlowDirection;
	amountTtc: number;
	occurredOn: string;
	label: string;
	accountId: number;
	accountName: string;
	fiscalYearId: number;
	fiscalYearLabel: string;
	budgetId: number | null;
	budgetName: string | null;
	orderId: number | null;
	origin: FlowOrigin;
	isReconciled: boolean;
	reversesFlowId: number | null;
	proofs: Proof[];
}

/**
 * Flux d'un exercice, du plus récent au plus ancien.
 *
 * Les justificatifs viennent avec leur URL signée : le bucket `proof` est privé,
 * et une URL de dix minutes suffit largement à ouvrir une facture depuis la
 * liste. Signer à la demande plutôt qu'à l'affichage ferait un aller-retour de
 * plus pour chaque pièce.
 */
export async function flowList(supabase: Client, fiscalYearId: number | null): Promise<Flow[]> {
	let query = supabase
		.schema('cash')
		.from('flows')
		.select(
			'id, direction, amount_ttc, occurred_on, label, account_id, fiscal_year_id, budget_id, order_id, origin, is_reconciled, reverses_flow_id'
		)
		.order('occurred_on', { ascending: false })
		.order('id', { ascending: false });

	if (fiscalYearId !== null) {
		query = query.eq('fiscal_year_id', fiscalYearId);
	}

	const [{ data: rows }, { data: accountRows }, { data: yearRows }, { data: budgetRows }] =
		await Promise.all([
			query,
			supabase.schema('cash').from('bank_accounts').select('id, name'),
			supabase.schema('cash').from('fiscal_years').select('id, label'),
			supabase.schema('cash').from('budgets').select('id, name')
		]);

	const flows = rows ?? [];
	const accountNames = new Map((accountRows ?? []).map((a) => [a.id, a.name]));
	const yearNames = new Map((yearRows ?? []).map((y) => [y.id, y.label]));
	const budgetNames = new Map((budgetRows ?? []).map((b) => [b.id, b.name]));

	const proofsByFlow = new Map<number, Proof[]>();
	if (flows.length > 0) {
		const { data: proofRows } = await supabase
			.schema('cash')
			.from('flow_proofs')
			.select('id, flow_id, storage_path, mime_type')
			.in(
				'flow_id',
				flows.map((f) => f.id)
			);

		const paths = (proofRows ?? []).map((p) => p.storage_path);
		const signed = new Map<string, string>();
		if (paths.length > 0) {
			const { data: urls } = await supabase.storage.from('proof').createSignedUrls(paths, 600);
			for (const u of urls ?? []) {
				if (u.path && u.signedUrl) {
					signed.set(u.path, u.signedUrl);
				}
			}
		}

		for (const p of proofRows ?? []) {
			proofsByFlow.set(p.flow_id, [
				...(proofsByFlow.get(p.flow_id) ?? []),
				{
					id: p.id,
					storagePath: p.storage_path,
					mimeType: p.mime_type,
					url: signed.get(p.storage_path) ?? null
				}
			]);
		}
	}

	return flows.map((f) => ({
		id: f.id,
		direction: f.direction,
		amountTtc: f.amount_ttc,
		occurredOn: f.occurred_on,
		label: f.label,
		accountId: f.account_id,
		accountName: accountNames.get(f.account_id) ?? '—',
		fiscalYearId: f.fiscal_year_id,
		fiscalYearLabel: yearNames.get(f.fiscal_year_id) ?? '—',
		budgetId: f.budget_id,
		budgetName: f.budget_id === null ? null : (budgetNames.get(f.budget_id) ?? null),
		orderId: f.order_id,
		origin: f.origin,
		isReconciled: f.is_reconciled,
		reversesFlowId: f.reverses_flow_id,
		proofs: proofsByFlow.get(f.id) ?? []
	}));
}

export interface Period {
	id: number;
	label: string;
	startsOn: string;
	endsOn: string;
	closedAt: string | null;
}

/** Années scolaires et exercices fiscaux, les deux découpages de §7.1bis. */
export async function periods(
	supabase: Client
): Promise<{ schoolYears: Period[]; fiscalYears: Period[] }> {
	const [{ data: school }, { data: fiscal }] = await Promise.all([
		supabase
			.schema('cash')
			.from('school_years')
			.select('id, label, starts_on, ends_on, closed_at')
			.order('starts_on', { ascending: false }),
		supabase
			.schema('cash')
			.from('fiscal_years')
			.select('id, label, starts_on, ends_on, closed_at')
			.order('starts_on', { ascending: false })
	]);

	const map = (rows: typeof school): Period[] =>
		(rows ?? []).map((p) => ({
			id: p.id,
			label: p.label,
			startsOn: p.starts_on,
			endsOn: p.ends_on,
			closedAt: p.closed_at
		}));

	return { schoolYears: map(school), fiscalYears: map(fiscal) };
}

/**
 * Domaines saisis en texte libre, ramenés au format que produit `items.domain`
 * (TRESO-F-12, CMD-F-16).
 *
 * L'item stocke « mouser », jamais « eu.mouser.com » : un partenariat qui
 * enregistrerait la forme longue ne se reconnaîtrait dans aucun lien. On retire
 * donc le protocole, le chemin, les sous-domaines et l'extension — y compris
 * les extensions composées comme « .co.uk », qu'un simple avant-dernier segment
 * confondrait avec le domaine.
 */
export function parseDomains(raw: string): string[] {
	return [
		...new Set(
			raw
				.split(/[,\s]+/)
				.map((entry) => entry.trim().toLowerCase())
				.filter((entry) => entry.length > 0)
				.map((entry) => {
					const host = (
						entry
							.replace(/^https?:\/\//, '')
							.split('/')
							.at(0) ?? entry
					).replace(/^www\./, '');
					const parts = host.split('.').filter((p) => p.length > 0);
					if (parts.length <= 1) {
						return parts.at(0) ?? host;
					}
					const last = parts.at(-1) ?? '';
					const beforeLast = parts.at(-2) ?? '';
					// « .co.uk », « .com.au » : deux segments d'extension, donc le
					// domaine est encore un cran plus haut.
					const composite = last.length === 2 && beforeLast.length <= 3 && parts.length >= 3;
					return (composite ? parts.at(-3) : beforeLast) ?? beforeLast;
				})
				.filter((domain) => domain.length > 0)
		)
	];
}

export interface Partnership {
	id: number;
	name: string;
	schoolYearId: number;
	schoolYearLabel: string;
	domains: string[];
	accountId: number | null;
	accountName: string | null;
	accountBalance: number | null;
	notes: string | null;
	archivedAt: string | null;
}

/** Partenariats et leur enveloppe éventuelle (TRESO-F-10/11/12). */
export async function partnerships(supabase: Client): Promise<Partnership[]> {
	const [{ data: rows }, { data: yearRows }, accountRows] = await Promise.all([
		supabase
			.schema('cash')
			.from('partnerships')
			.select('id, name, school_year_id, domains, account_id, notes, archived_at')
			.order('name'),
		supabase.schema('cash').from('school_years').select('id, label'),
		accounts(supabase)
	]);

	const yearNames = new Map((yearRows ?? []).map((y) => [y.id, y.label]));
	const byAccount = new Map(accountRows.map((a) => [a.id, a]));

	return (rows ?? []).map((p) => {
		const account = p.account_id === null ? undefined : byAccount.get(p.account_id);
		return {
			id: p.id,
			name: p.name,
			schoolYearId: p.school_year_id,
			schoolYearLabel: yearNames.get(p.school_year_id) ?? '—',
			domains: p.domains,
			accountId: p.account_id,
			accountName: account?.name ?? null,
			accountBalance: account?.balance ?? null,
			notes: p.notes,
			archivedAt: p.archived_at
		};
	});
}

export interface ProjectRow {
	id: number;
	name: string;
	campus: Campus | null;
	budgetId: number | null;
	budgetPath: string | null;
	archivedAt: string | null;
	/** Un projet référencé par des items ne se supprime pas — il s'archive. */
	itemCount: number;
}

/** Projets, avec le nœud budgétaire qu'ils désignent (TRESO-F-01/02). */
export async function projectList(supabase: Client): Promise<ProjectRow[]> {
	const [{ data: rows }, { data: budgets }, { data: items }] = await Promise.all([
		supabase.from('projects').select('id, name, campus, budget_id, archived_at').order('name'),
		supabase.schema('cash').from('budgets').select('id, name, parent_id'),
		supabase.schema('cash').from('items').select('project_id')
	]);

	const byId = new Map((budgets ?? []).map((b) => [b.id, b]));
	const path = (id: number | null): string | null => {
		if (id === null) {
			return null;
		}
		const parts: string[] = [];
		let current = byId.get(id);
		let depth = 0;
		while (current && depth < 32) {
			parts.unshift(current.name);
			current = current.parent_id === null ? undefined : byId.get(current.parent_id);
			depth += 1;
		}
		return parts.length > 0 ? parts.join(' › ') : null;
	};

	const counts = new Map<number, number>();
	for (const i of items ?? []) {
		counts.set(i.project_id, (counts.get(i.project_id) ?? 0) + 1);
	}

	return (rows ?? []).map((p) => ({
		id: p.id,
		name: str(p.name),
		campus: p.campus,
		budgetId: p.budget_id,
		budgetPath: path(p.budget_id),
		archivedAt: p.archived_at,
		itemCount: counts.get(p.id) ?? 0
	}));
}
