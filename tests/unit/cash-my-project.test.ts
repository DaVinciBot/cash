import type { BudgetPressure } from '$lib/server/cash';
import { budgetSubtree, mergeProjectOverviews } from '$lib/server/projectOverview';
import type { ProjectReportRow } from '$lib/server/reports';
import type { BudgetNode } from '$lib/server/treasury';
import { describe, expect, it } from 'vitest';

// Suivi projet (CMD-F-50, TRESO-F-62). Les deux permissions de lecture
// scopées-projet sont indépendantes : `finance.budget.read.project` et
// `stats.read.project` peuvent être détenues séparément, et un porteur de l'une
// doit voir sa moitié plutôt qu'un écran vide.

const wei = { id: 1, name: 'WEI', campus: 'nantes' as const, budgetId: 10 };
const robot = { id: 2, name: 'Robot', campus: 'paris' as const, budgetId: 20 };

function pressure(budgetId: number, over = false): BudgetPressure {
	return {
		budgetId,
		name: 'Pôle robotique',
		allocatedTtc: 1000,
		consumedTtc: over ? 1200 : 400,
		requestedTtc: 100,
		remainingTtc: over ? -300 : 500
	};
}

function report(projectId: number, projectName: string): ProjectReportRow {
	return {
		projectId,
		projectName,
		requestedTtc: 500,
		committedTtc: 400,
		receivedTtc: 300,
		refusedTtc: 50,
		itemCount: 4
	};
}

describe('périmètre du suivi projet', () => {
	it('réunit les deux périmètres sans exiger les deux permissions', () => {
		const rows = mergeProjectOverviews([wei], [robot], new Map([[wei.id, pressure(10)]]), [
			report(robot.id, robot.name)
		]);

		expect(rows.map((r) => r.projectName)).toEqual(['Robot', 'WEI']);

		const weiRow = rows.find((r) => r.projectId === wei.id);
		expect(weiRow?.budgetReadable).toBe(true);
		expect(weiRow?.budget?.allocatedTtc).toBe(1000);
		expect(weiRow?.stats).toBeNull();

		const robotRow = rows.find((r) => r.projectId === robot.id);
		expect(robotRow?.budgetReadable).toBe(false);
		expect(robotRow?.budget).toBeNull();
		expect(robotRow?.stats?.itemCount).toBe(4);
	});

	// C'est la distinction qui manquait : un projet sans dépense renvoyait la
	// même absence qu'un projet interdit de lecture, et l'écran ne pouvait pas
	// dire lequel des deux il montrait.
	it('rend une ligne à zéro pour un projet lisible mais sans dépense', () => {
		const [row] = mergeProjectOverviews([], [wei], new Map(), []);

		expect(row?.stats).not.toBeNull();
		expect(row?.stats?.itemCount).toBe(0);
		expect(row?.stats?.requestedTtc).toBe(0);
	});

	// Le rapport couvre toute l'année et remonte donc les projets où le membre
	// ne voit que ses propres items. Les laisser passer publierait des totaux
	// qu'aucune permission ne couvre.
	it('ignore les lignes de rapport hors du périmètre de la permission stats', () => {
		const rows = mergeProjectOverviews([], [wei], new Map(), [
			report(wei.id, wei.name),
			report(robot.id, robot.name)
		]);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.projectId).toBe(wei.id);
	});

	// Un projet sans nœud budgétaire désigné n'est pas un refus d'accès : la
	// permission est détenue, c'est le rattachement à l'arbre qui manque
	// (TRESO-F-03, redésigné à chaque rentrée).
	it('distingue le budget non désigné de la permission absente', () => {
		const [row] = mergeProjectOverviews([wei], [], new Map([[wei.id, null]]), []);

		expect(row?.budgetReadable).toBe(true);
		expect(row?.budget).toBeNull();
	});

	it('remonte un dépassement tel que la vue le calcule', () => {
		const [row] = mergeProjectOverviews([robot], [], new Map([[robot.id, pressure(20, true)]]), []);

		expect(row?.budget?.remainingTtc).toBeLessThan(0);
	});
});

// Le sous-arbre affiché doit épouser exactement ce que
// `cash.budget_readable_by_project` ouvre : la fonction remonte l'ascendance
// d'un budget et le déclare lisible si elle croise le nœud d'un projet du
// lecteur. Sous ce nœud tout est lisible, au-dessus rien — découper ailleurs
// afficherait des consommés à zéro sans dire qu'ils sont tronqués.
describe('sous-arbre budgétaire du projet', () => {
	function node(id: number, parentId: number | null, depth: number, name: string): BudgetNode {
		return {
			id,
			name,
			parentId,
			schoolYearId: 1,
			amountTtc: null,
			isDefault: false,
			archivedAt: null,
			depth,
			isLeaf: false,
			allocatedTtc: 0,
			consumedTtc: 0,
			remainingTtc: 0,
			projects: []
		};
	}

	// Arbre de l'année, en ordre préfixe comme `budgetTree` le rend.
	const tree: BudgetNode[] = [
		node(1, null, 0, 'Association'),
		node(10, 1, 1, 'Pôle robotique'),
		node(11, 10, 2, 'Mécanique'),
		node(12, 10, 2, 'Électronique'),
		node(13, 12, 3, 'Cartes'),
		node(20, 1, 1, 'Pôle communication')
	];

	it('retient le nœud du projet et toute sa descendance', () => {
		expect(budgetSubtree(tree, 10).map((n) => n.name)).toEqual([
			'Pôle robotique',
			'Mécanique',
			'Électronique',
			'Cartes'
		]);
	});

	it("laisse dehors l'ascendance et les branches voisines", () => {
		const names = budgetSubtree(tree, 10).map((n) => n.name);

		expect(names).not.toContain('Association');
		expect(names).not.toContain('Pôle communication');
	});

	// L'indentation part du budget du projet : la racine de l'association n'est
	// pas lisible, l'aligner dessus décalerait tout l'arbre sans raison visible.
	it('recale les profondeurs sur la racine du sous-arbre', () => {
		expect(budgetSubtree(tree, 10).map((n) => n.depth)).toEqual([0, 1, 1, 2]);
	});

	it('rend un sous-arbre vide quand le projet ne désigne aucun budget', () => {
		expect(budgetSubtree(tree, null)).toEqual([]);
		expect(budgetSubtree(tree, 999)).toEqual([]);
	});

	it('attache le sous-arbre au seul projet dont le budget est lisible', () => {
		const rows = mergeProjectOverviews([wei], [robot], new Map(), [], tree);

		expect(rows.find((r) => r.projectId === wei.id)?.tree.map((n) => n.name)).toEqual([
			'Pôle robotique',
			'Mécanique',
			'Électronique',
			'Cartes'
		]);
		expect(rows.find((r) => r.projectId === robot.id)?.tree).toEqual([]);
	});
});
