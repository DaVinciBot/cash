// Suivi d'un projet par qui en porte la charge (CMD-F-50, TRESO-F-62).
//
// Deux permissions scopées-projet distinctes se rejoignent ici, et elles ne
// s'impliquent pas : `finance.budget.read.project` ouvre la consommation du
// budget visé, `stats.read.project` ouvre le détail demandé / engagé / reçu.
// Un porteur de l'une sans l'autre doit voir sa moitié, pas un écran vide —
// d'où deux périmètres calculés séparément et réunis seulement à l'affichage.
//
// Rien de ce qui est lu ici n'est un droit accordé par ce fichier : la RLS
// tranche ligne par ligne (`cash.budget_readable_by_project`, policies de
// `cash.items`). Le calcul de périmètre ne sert qu'à ne pas afficher une case
// vide là où l'absence de droit et l'absence de dépense se confondraient.

import {
	budgetPressure,
	projectsWithPermission,
	type BudgetPressure,
	type ScopedProject
} from '$lib/server/cash';
import { projectReport, type ProjectReportRow } from '$lib/server/reports';
import { budgetTree, type BudgetNode } from '$lib/server/treasury';
import type { Database } from '@davincibot/database-types';
import type { Campus } from '@davincibot/lib';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

export interface ProjectOverview {
	projectId: number;
	projectName: string;
	campus: Campus | null;
	/**
	 * `null` quand la permission budget manque sur ce projet, OU quand le projet
	 * ne désigne aucun nœud de l'arbre — deux absences que l'écran distingue par
	 * `budgetReadable`.
	 */
	budget: BudgetPressure | null;
	budgetReadable: boolean;
	/**
	 * Le nœud désigné par le projet et sa descendance, profondeurs recalées sur
	 * lui. Vide quand le projet ne désigne rien.
	 */
	tree: BudgetNode[];
	/** `null` quand `stats.read.project` n'est pas détenue sur ce projet. */
	stats: ProjectReportRow | null;
}

/** Ligne de rapport à zéro : le projet est lisible, il n'a simplement rien dépensé. */
function emptyReport(projectId: number, projectName: string): ProjectReportRow {
	return {
		projectId,
		projectName,
		requestedTtc: 0,
		committedTtc: 0,
		receivedTtc: 0,
		refusedTtc: 0,
		itemCount: 0
	};
}

/**
 * Nœud désigné par un projet et sa descendance, extraits de l'arbre de l'année.
 *
 * C'est exactement le périmètre que `cash.budget_readable_by_project` ouvre :
 * la fonction remonte l'ascendance d'un budget et le déclare lisible si elle
 * croise le nœud d'un projet du lecteur. Sous ce nœud, tout est donc lisible ;
 * au-dessus, rien. Découper ailleurs afficherait des `consommé` à zéro sans
 * dire qu'ils sont tronqués.
 *
 * Les profondeurs sont recalées sur la racine du sous-arbre : l'indentation
 * doit partir du budget du projet, pas de la racine de l'association, que le
 * CDP ne voit pas.
 */
export function budgetSubtree(tree: BudgetNode[], rootId: number | null): BudgetNode[] {
	if (rootId === null) {
		return [];
	}

	const root = tree.find((node) => node.id === rootId);
	if (!root) {
		return [];
	}

	// `budgetTree` rend l'arbre à plat en ordre préfixe : un parent précède
	// toujours ses enfants, une seule passe suffit donc à ramasser la descendance.
	const inSubtree = new Set<number>([root.id]);
	const out: BudgetNode[] = [];
	for (const node of tree) {
		if (node.id === root.id || (node.parentId !== null && inSubtree.has(node.parentId))) {
			inSubtree.add(node.id);
			out.push({ ...node, depth: node.depth - root.depth });
		}
	}
	return out;
}

/**
 * Réunion des deux périmètres, sans lecture : testable seule.
 *
 * Un projet n'apparaît que si au moins une des deux permissions le couvre. Une
 * permission détenue sans donnée derrière donne une ligne à zéro, jamais un
 * `null` : « rien dépensé » et « pas le droit de savoir » sont deux réponses
 * différentes, et les confondre est précisément ce qui a fait croire à un refus
 * d'accès.
 */
export function mergeProjectOverviews(
	budgetProjects: ScopedProject[],
	statsProjects: ScopedProject[],
	pressures: Map<number, BudgetPressure | null>,
	report: ProjectReportRow[],
	tree: BudgetNode[] = []
): ProjectOverview[] {
	const budgetIds = new Set(budgetProjects.map((p) => p.id));
	const statsIds = new Set(statsProjects.map((p) => p.id));
	const reportById = new Map(report.map((row) => [row.projectId, row]));

	const all = new Map<number, ScopedProject>();
	for (const p of [...budgetProjects, ...statsProjects]) {
		all.set(p.id, p);
	}

	return [...all.values()]
		.map((p) => ({
			projectId: p.id,
			projectName: p.name,
			campus: p.campus,
			budget: budgetIds.has(p.id) ? (pressures.get(p.id) ?? null) : null,
			budgetReadable: budgetIds.has(p.id),
			tree: budgetIds.has(p.id) ? budgetSubtree(tree, p.budgetId) : [],
			stats: statsIds.has(p.id) ? (reportById.get(p.id) ?? emptyReport(p.id, p.name)) : null
		}))
		.sort((a, b) => a.projectName.localeCompare(b.projectName, 'fr'));
}

/**
 * Suivi des projets du membre connecté, pour l'année scolaire demandée.
 *
 * `schoolYearId` à `null` — aucune année ouverte — rend les stats vides plutôt
 * qu'absentes : la permission est bien détenue, il n'y a simplement pas encore
 * d'exercice à montrer.
 */
export async function projectOverviews(
	supabase: Client,
	profileId: string,
	schoolYearId: number | null
): Promise<ProjectOverview[]> {
	const [budgetProjects, statsProjects] = await Promise.all([
		projectsWithPermission(supabase, profileId, 'finance.budget.read.project'),
		projectsWithPermission(supabase, profileId, 'stats.read.project')
	]);

	if (budgetProjects.length === 0 && statsProjects.length === 0) {
		return [];
	}

	// L'arbre et le rapport couvrent l'année entière en une requête chacun ; la
	// pression budgétaire, elle, se lit projet par projet — un CDP en porte une
	// poignée, et la vue `budget_consumption` remonte déjà l'arbre pour chacun.
	//
	// `budgetTree` est celui de l'écran trésorier, délibérément : deux lectures
	// du consommé divergeraient au premier changement de règle, et c'est le CDP
	// qui verrait un chiffre que personne d'autre ne voit.
	const [pressureEntries, report, tree] = await Promise.all([
		schoolYearId === null
			? Promise.resolve([] as [number, BudgetPressure | null][])
			: Promise.all(
					budgetProjects.map(
						async (p) =>
							[p.id, await budgetPressure(supabase, p, schoolYearId)] as [
								number,
								BudgetPressure | null
							]
					)
				),
		schoolYearId === null || statsProjects.length === 0
			? Promise.resolve([] as ProjectReportRow[])
			: projectReport(supabase, schoolYearId),
		schoolYearId === null || budgetProjects.length === 0
			? Promise.resolve([] as BudgetNode[])
			: budgetTree(supabase, schoolYearId)
	]);

	return mergeProjectOverviews(
		budgetProjects,
		statsProjects,
		new Map(pressureEntries),
		report,
		tree
	);
}
