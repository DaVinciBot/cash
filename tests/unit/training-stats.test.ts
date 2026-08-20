import { describe, expect, it } from 'vitest';

import {
	categoryRows,
	filterToRange,
	participantRows,
	pivotByPeriod,
	pivotPercentSeries,
	pivotSeries,
	resolveRange,
	toStatsSlots,
	totals,
	trainerRows,
	weeklyRows,
	type StatsRange,
	type StatsSlot
} from '$lib/server/trainingStats';

// Statistiques de formation (feuille « Stats » du classeur Planning Formations).
//
// Tout se calcule ici, sur des créneaux déjà filtrés par le chargeur : ces
// fonctions ne connaissent ni Supabase ni les dates du jour, ce qui les rend
// vérifiables sur des cas choisis plutôt que sur ce que contient la base.
//
// Repère de calendrier utilisé partout : la semaine ISO 15 de 2026 court du
// lundi 6 au dimanche 12 avril, la S16 du 13 au 19, la S17 du 20 au 26.

const range: StatsRange = { from: '2026-04-06', to: '2026-04-26', periodDays: 21 };

function slot(overrides: Partial<StatsSlot> = {}): StatsSlot {
	return {
		id: 1,
		start: '2026-04-08T10:00:00Z',
		durationHours: 1,
		seats: 5,
		trainingId: 10,
		trainingName: 'Impression résine',
		category: 'code',
		trainerName: 'Courrieu',
		attendees: [],
		...overrides
	};
}

describe('découpage hebdomadaire', () => {
	it('agrège les quatre grandeurs par semaine ISO', () => {
		const rows = weeklyRows(
			[
				slot({ start: '2026-04-08T10:00:00Z', durationHours: 1.5, seats: 6, attendees: ['Fay'] }),
				slot({
					id: 2,
					start: '2026-04-09T10:00:00Z',
					durationHours: 2,
					seats: 4,
					attendees: ['Roy', 'Bois']
				})
			],
			range
		);

		expect(rows[0]).toMatchObject({
			label: 'S15',
			slots: 2,
			attendees: 3,
			seats: 10,
			hours: 3.5
		});
	});

	it('conserve les semaines sans formation, à zéro', () => {
		const rows = weeklyRows(
			[slot({ start: '2026-04-08T10:00:00Z' }), slot({ id: 2, start: '2026-04-20T10:00:00Z' })],
			range
		);

		expect(rows.map((row) => row.label)).toEqual(['S15', 'S16', 'S17']);
		expect(rows[1]).toMatchObject({ slots: 0, attendees: 0, seats: 0, hours: 0 });
	});

	it('rattache un créneau de fin de soirée au jour parisien et non au jour UTC', () => {
		// 22h30 UTC le dimanche 12 avril, c'est 00h30 le lundi 13 à Paris : la
		// formation appartient à la S16, pas à la S15 qui s'achève ce dimanche-là.
		const rows = weeklyRows([slot({ start: '2026-04-12T22:30:00Z' })], range);

		expect(rows.find((row) => row.label === 'S15')?.slots).toBe(0);
		expect(rows.find((row) => row.label === 'S16')?.slots).toBe(1);
	});

	it('date la semaine quand la plage couvre plusieurs années ISO', () => {
		const rows = weeklyRows([], { from: '2025-12-29', to: '2026-01-11', periodDays: 7 });

		expect(rows.map((row) => row.label)).toEqual(['S1 · 26', 'S2 · 26']);
	});
});

describe('regroupement par catégorie', () => {
	const slots = [
		slot({ category: 'code', trainingId: 10, durationHours: 1, seats: 5, attendees: ['Fay'] }),
		slot({
			id: 2,
			start: '2026-04-09T10:00:00Z',
			category: 'code',
			trainingId: 11,
			durationHours: 2,
			seats: 5,
			attendees: ['Roy', 'Bois']
		}),
		slot({
			id: 3,
			start: '2026-04-10T10:00:00Z',
			category: 'code',
			trainingId: 10,
			durationHours: 1,
			seats: 2,
			attendees: ['Suhr']
		}),
		slot({
			id: 4,
			start: '2026-04-14T10:00:00Z',
			category: 'software',
			trainingId: 20,
			durationHours: 3,
			seats: 4,
			attendees: []
		})
	];

	it('somme les grandeurs et nomme la catégorie', () => {
		const row = categoryRows(slots).find((item) => item.key === 'code');

		expect(row).toMatchObject({
			label: 'Code',
			slots: 3,
			hours: 4,
			attendees: 4,
			seats: 12
		});
	});

	it('compte les formations distinctes, pas les créneaux', () => {
		// Trois créneaux de la catégorie « Code », mais seulement deux formations :
		// la 10 a été donnée deux fois.
		expect(categoryRows(slots).find((item) => item.key === 'code')?.trainingTypes).toBe(2);
	});

	it('calcule moyenne et remplissage', () => {
		const row = categoryRows(slots).find((item) => item.key === 'code');

		expect(row?.average).toBeCloseTo(4 / 3);
		expect(row?.fillRate).toBeCloseTo(4 / 12);
	});

	it('classe les catégories de la plus fournie à la moins fournie', () => {
		expect(categoryRows(slots).map((item) => item.key)).toEqual(['code', 'software']);
	});

	it('laisse le remplissage indéfini quand aucune place n’était proposée', () => {
		const rows = categoryRows([slot({ seats: 0, attendees: [] })]);

		expect(rows[0]?.fillRate).toBeNull();
	});
});

describe('regroupement par formateur·ice', () => {
	it('groupe sur le nom du formateur', () => {
		const rows = trainerRows([
			slot({ trainerName: 'Fromont', attendees: ['Fay'] }),
			slot({ id: 2, start: '2026-04-09T10:00:00Z', trainerName: 'Fromont', attendees: ['Roy'] }),
			slot({ id: 3, start: '2026-04-10T10:00:00Z', trainerName: 'Stawarski', attendees: [] })
		]);

		expect(rows.map((row) => row.label)).toEqual(['Fromont', 'Stawarski']);
		expect(rows[0]).toMatchObject({ slots: 2, attendees: 2 });
	});
});

describe('total général', () => {
	it('recalcule le remplissage sur les totaux et non en moyennant les taux', () => {
		// 1 inscrit sur 1 place (100 %) et 1 inscrit sur 9 places (11 %) : la
		// moyenne des taux dirait 56 %, le vrai remplissage est 2/10.
		const total = totals([
			slot({ seats: 1, attendees: ['Fay'] }),
			slot({ id: 2, start: '2026-04-09T10:00:00Z', seats: 9, attendees: ['Roy'] })
		]);

		expect(total.fillRate).toBeCloseTo(0.2);
		expect(total.slots).toBe(2);
		expect(total.seats).toBe(10);
	});

	it('ne rend ni moyenne ni remplissage sur un ensemble vide', () => {
		expect(totals([])).toMatchObject({ slots: 0, average: null, fillRate: null });
	});
});

describe('tableau croisé par période', () => {
	it('cale les tranches sur la date de début, en jours', () => {
		const table = pivotByPeriod([slot({ start: '2026-04-08T10:00:00Z' })], {
			from: '2026-04-06',
			to: '2026-05-17',
			periodDays: 21
		});

		expect(table.rows.map((row) => row.label)).toEqual(['06/04 → 26/04', '27/04 → 17/05']);
	});

	it('compte les formations par catégorie et totalise les deux sens', () => {
		const table = pivotByPeriod(
			[
				slot({ start: '2026-04-08T10:00:00Z', category: 'code' }),
				slot({ id: 2, start: '2026-04-09T10:00:00Z', category: 'code' }),
				slot({ id: 3, start: '2026-04-28T10:00:00Z', category: 'electronics' })
			],
			{ from: '2026-04-06', to: '2026-05-17', periodDays: 21 }
		);

		expect(table.categories.map((category) => category.value)).toEqual(['code', 'electronics']);
		expect(table.rows[0]).toMatchObject({ counts: [2, 0], total: 2 });
		expect(table.rows[1]).toMatchObject({ counts: [0, 1], total: 1 });
		expect(table.totals).toMatchObject({ counts: [2, 1], total: 3 });
	});

	it('n’ouvre pas de colonne pour une catégorie absente de la plage', () => {
		const table = pivotByPeriod([slot({ category: 'code' })], range);

		expect(table.categories).toHaveLength(1);
	});
});

describe('séries des aires empilées', () => {
	const table = pivotByPeriod(
		[
			slot({ start: '2026-04-08T10:00:00Z', category: 'code' }),
			slot({ id: 2, start: '2026-04-09T10:00:00Z', category: 'code' }),
			slot({ id: 3, start: '2026-04-10T10:00:00Z', category: 'electronics' }),
			slot({ id: 4, start: '2026-04-28T10:00:00Z', category: 'electronics' })
		],
		{ from: '2026-04-06', to: '2026-05-17', periodDays: 21 }
	);

	it('donne une série par catégorie, alignée sur les périodes', () => {
		expect(pivotSeries(table)).toEqual([
			{ label: 'Code', values: [2, 0] },
			{ label: 'Électronique', values: [1, 1] }
		]);
	});

	it('normalise chaque période à cent pour cent', () => {
		const series = pivotPercentSeries(table);

		expect(series[0]?.values[0]).toBeCloseTo(200 / 3);
		expect(series[1]?.values[0]).toBeCloseTo(100 / 3);
		expect(series[1]?.values[1]).toBeCloseTo(100);
	});

	it('rend une période vide à zéro plutôt qu’en division par zéro', () => {
		const empty = pivotByPeriod([slot({ start: '2026-04-08T10:00:00Z' })], {
			from: '2026-04-06',
			to: '2026-05-17',
			periodDays: 21
		});

		expect(pivotPercentSeries(empty)[0]?.values[1]).toBe(0);
	});
});

describe('classement des participants', () => {
	it('compte les formations suivies et la durée cumulée, du plus assidu au moins', () => {
		const rows = participantRows([
			slot({ durationHours: 1, attendees: ['Musialek', 'Roussille'] }),
			slot({ id: 2, start: '2026-04-09T10:00:00Z', durationHours: 2.5, attendees: ['Musialek'] })
		]);

		expect(rows).toEqual([
			{ name: 'Musialek', slots: 2, hours: 3.5 },
			{ name: 'Roussille', slots: 1, hours: 1 }
		]);
	});
});

describe('lecture des lignes de la base', () => {
	it('additionne les places sur place et à distance', () => {
		const [mapped] = toStatsSlots([
			{
				id: 7,
				start: '2026-04-08T10:00:00Z',
				duration_hours: 2,
				on_site_seats: 6,
				remote_seats: 4,
				training_id: 10,
				name: 'Impression résine',
				category: 'code',
				trainer_username: 'Courrieu',
				registration: [{ status: 'registered', member_username: 'Fay' }]
			}
		]);

		expect(mapped).toMatchObject({ seats: 10, attendees: ['Fay'], trainerName: 'Courrieu' });
	});

	it('compte zéro place quand la capacité n’est pas renseignée', () => {
		const [mapped] = toStatsSlots([
			{
				id: 7,
				start: '2026-04-08T10:00:00Z',
				duration_hours: 2,
				on_site_seats: null,
				remote_seats: null,
				training_id: 10,
				name: 'Impression résine',
				category: 'code',
				trainer_username: null,
				registration: []
			}
		]);

		expect(mapped?.seats).toBe(0);
	});

	it('écarte les inscriptions qui ne sont pas confirmées', () => {
		const [mapped] = toStatsSlots([
			{
				id: 7,
				start: '2026-04-08T10:00:00Z',
				duration_hours: 2,
				on_site_seats: 5,
				remote_seats: null,
				training_id: 10,
				name: 'Impression résine',
				category: 'code',
				trainer_username: 'Courrieu',
				registration: [
					{ status: 'registered', member_username: 'Fay' },
					{ status: 'waitlisted', member_username: 'Roy' },
					{ status: 'canceled_by_user', member_username: 'Bois' }
				]
			}
		]);

		expect(mapped?.attendees).toEqual(['Fay']);
	});

	it('nomme les personnes sans pseudo plutôt que de les perdre', () => {
		const [mapped] = toStatsSlots([
			{
				id: 7,
				start: '2026-04-08T10:00:00Z',
				duration_hours: 2,
				on_site_seats: 5,
				remote_seats: null,
				training_id: 10,
				name: 'Impression résine',
				category: 'code',
				trainer_username: null,
				registration: [{ status: 'registered', member_username: null }]
			}
		]);

		expect(mapped?.trainerName).toBe('Inconnu·e');
		expect(mapped?.attendees).toEqual(['Inconnu·e']);
	});
});

describe('bornes de la plage', () => {
	it('garde les créneaux des jours de début et de fin, heure de Paris', () => {
		// 23h00 UTC le 5 avril, c'est 01h00 le 6 à Paris : ce créneau appartient au
		// premier jour de la plage, qu'une comparaison en UTC aurait écarté.
		const kept = filterToRange(
			[slot({ start: '2026-04-05T23:00:00Z' }), slot({ id: 2, start: '2026-04-26T20:00:00Z' })],
			range
		);

		expect(kept).toHaveLength(2);
	});

	it('écarte les créneaux hors plage', () => {
		const kept = filterToRange(
			[slot({ start: '2026-04-05T10:00:00Z' }), slot({ id: 2, start: '2026-04-27T10:00:00Z' })],
			range
		);

		expect(kept).toEqual([]);
	});
});

describe('plage demandée par l’URL', () => {
	it('couvre les douze derniers mois quand l’URL ne dit rien', () => {
		expect(resolveRange({}, '2026-08-19')).toEqual({
			from: '2025-08-19',
			to: '2026-08-19',
			periodDays: 21
		});
	});

	it('retient les dates et le pas fournis', () => {
		expect(
			resolveRange({ from: '2026-04-06', to: '2026-04-26', period: '7' }, '2026-08-19')
		).toEqual({ from: '2026-04-06', to: '2026-04-26', periodDays: 7 });
	});

	it('remet à l’endroit une plage saisie à l’envers', () => {
		const resolved = resolveRange({ from: '2026-04-26', to: '2026-04-06' }, '2026-08-19');

		expect(resolved.from).toBe('2026-04-06');
		expect(resolved.to).toBe('2026-04-26');
	});

	it('ignore une date illisible et reprend le défaut', () => {
		expect(resolveRange({ from: 'hier', to: '2026-04-26' }, '2026-08-19').from).toBe('2025-08-19');
	});

	it('ramène un pas de période absurde à un jour au moins', () => {
		expect(resolveRange({ period: '0' }, '2026-08-19').periodDays).toBe(1);
		expect(resolveRange({ period: '-4' }, '2026-08-19').periodDays).toBe(1);
		expect(resolveRange({ period: 'trois' }, '2026-08-19').periodDays).toBe(21);
	});

	it('plafonne le pas à la longueur d’une année', () => {
		expect(resolveRange({ period: '5000' }, '2026-08-19').periodDays).toBe(366);
	});
});
