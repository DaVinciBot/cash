import { describe, expect, it } from 'vitest';

import { orderIdsFrom, type SearchHit } from '$lib/server/audit';
import {
	ACTIVITY_BADGES,
	ACTIVITY_KINDS,
	CASH_ENTITY_LABELS,
	SOCLE_ACTIVITY_KINDS,
	SOCLE_ENTITY_LABELS,
	actorLabel,
	fieldLabel,
	formatJournalValue,
	isOpaqueField,
	summarizeActivity,
	type ActivityEntry
} from '@davincibot/lib';

function entry(over: Partial<ActivityEntry> = {}): ActivityEntry {
	return {
		id: 1,
		kind: 'updated',
		actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		actorName: 'Alice',
		occurredAt: '2026-08-14T10:00:00Z',
		changes: [],
		...over
	};
}

describe('référentiel des journaux (jalon 8)', () => {
	it('couvre exactement les enums de la base', () => {
		expect(ACTIVITY_KINDS).toEqual(['created', 'updated', 'state_changed', 'deleted']);
		// Le socle n'a pas d'état à changer : un rôle se pose ou se révoque.
		expect(SOCLE_ACTIVITY_KINDS).toEqual(['created', 'updated', 'deleted']);
	});

	it("donne un repère visuel distinct à chaque nature d'événement", () => {
		const classes = new Set(ACTIVITY_KINDS.map((k) => ACTIVITY_BADGES[k].className));
		expect(classes.size).toBe(ACTIVITY_KINDS.length);
		for (const kind of ACTIVITY_KINDS) {
			// La couleur n'est jamais seule porteuse : le libellé est toujours écrit.
			expect(ACTIVITY_BADGES[kind].label).toBeTruthy();
		}
	});

	it('nomme les entités journalisées des deux domaines', () => {
		expect(CASH_ENTITY_LABELS.item).toBe('Item');
		expect(CASH_ENTITY_LABELS.generated_document).toBeTruthy();
		expect(SOCLE_ENTITY_LABELS.profile_global_roles).toBeTruthy();
		expect(SOCLE_ENTITY_LABELS.blog).toBeTruthy();
	});
});

describe('libellés de champs', () => {
	it("traduit ce qu'il connaît", () => {
		expect(fieldLabel('refused_reason')).toBe('Motif du refus');
		expect(fieldLabel('unit_price_ttc')).toBe('Prix unitaire TTC');
	});

	it("laisse passer le nom de colonne pour ce qu'il ne connaît pas", () => {
		// Volontaire : une colonne ajoutée sans passer par le référentiel reste
		// lisible, et son absence se voit.
		expect(fieldLabel('colonne_inconnue')).toBe('colonne_inconnue');
	});

	it("tait les identifiants bruts, qui n'apprennent rien", () => {
		expect(isOpaqueField('project_id')).toBe(true);
		expect(isOpaqueField('requested_by')).toBe(true);
		expect(isOpaqueField('name')).toBe(false);
	});
});

describe('valeurs de journal', () => {
	it("dit l'absence en français, pas en JSON", () => {
		expect(formatJournalValue(null)).toBe('—');
		expect(formatJournalValue([])).toBe('—');
	});

	it('rend les booléens lisibles', () => {
		expect(formatJournalValue(true)).toBe('oui');
		expect(formatJournalValue(false)).toBe('non');
	});

	it('aplatit les tableaux, qui portent les tags et les domaines', () => {
		expect(formatJournalValue(['méca', 'élek'])).toBe('méca, élek');
	});

	it('laisse les nombres tels que PostgreSQL les sérialise', () => {
		// `to_jsonb` rend un numeric en chaîne pour ne pas perdre de précision :
		// le reformater ici risquerait d'arrondir un montant dans l'historique.
		expect(formatJournalValue('12.50')).toBe('12.50');
	});
});

describe("résumé d'une entrée (CMD-F-62)", () => {
	it('nomme la création et la suppression sans détail', () => {
		expect(summarizeActivity(entry({ kind: 'created' }))).toBe('Créé');
		expect(summarizeActivity(entry({ kind: 'deleted' }))).toBe('Supprimé');
	});

	it("met le changement d'état en avant (CMD-F-61)", () => {
		const summary = summarizeActivity(
			entry({
				kind: 'state_changed',
				changes: [
					{ field: 'refused_reason', old: null, new: 'Hors budget' },
					{ field: 'state', old: 'pending_cdp', new: 'refused_cdp' }
				]
			})
		);
		// L'état passe devant, même quand il n'est pas le premier champ modifié :
		// c'est la seule ligne qui raconte une décision.
		expect(summary).toBe('État : pending_cdp → refused_cdp');
	});

	it('compte les champs quand il y en a plusieurs', () => {
		expect(
			summarizeActivity(
				entry({
					changes: [
						{ field: 'name', old: 'a', new: 'b' },
						{ field: 'quantity', old: 1, new: 2 }
					]
				})
			)
		).toBe('2 champs modifiés');
	});

	it("nomme le champ quand il n'y en a qu'un", () => {
		expect(summarizeActivity(entry({ changes: [{ field: 'quantity', old: 1, new: 2 }] }))).toBe(
			'Quantité modifié'
		);
	});
});

describe("auteur d'une entrée", () => {
	it("dit « Système » quand aucun utilisateur n'est en cause", () => {
		// Un trigger déclenché hors session HTTP n'a pas d'acteur, et c'est
		// l'information juste : personne ne l'a fait à la main.
		expect(actorLabel({ actorId: null, actorName: null })).toBe('Système');
	});

	it("distingue un compte supprimé d'une action système", () => {
		expect(actorLabel({ actorId: 'x', actorName: null })).toBe('Compte supprimé');
	});

	it('donne le nom quand il existe', () => {
		expect(actorLabel({ actorId: 'x', actorName: 'Alice' })).toBe('Alice');
	});
});

describe('remontée des commandes depuis les items trouvés (CMD-F-70)', () => {
	function hit(id: number, orderId: number | null): SearchHit {
		return {
			id,
			name: `item ${String(id)}`,
			link: null,
			state: 'bundled',
			totalTtc: 10,
			quantity: 1,
			campus: 'nantes',
			projectId: 1,
			requestedBy: 'x',
			orderId,
			createdAt: '2026-08-14T10:00:00Z'
		};
	}

	it('dédoublonne les commandes atteintes par plusieurs items', () => {
		expect(orderIdsFrom([hit(1, 7), hit(2, 7), hit(3, 9)])).toEqual([7, 9]);
	});

	it('ignore les items non encore regroupés', () => {
		// Un item `pending_cdp` n'appartient à aucune commande : le remonter
		// fabriquerait une commande n° null.
		expect(orderIdsFrom([hit(1, null), hit(2, 4)])).toEqual([4]);
	});

	it('ne rend rien quand la recherche ne trouve rien', () => {
		expect(orderIdsFrom([])).toEqual([]);
	});
});
