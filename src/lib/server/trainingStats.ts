import { categoryOptions } from '$lib/helpers/trainingOptions';
import type {
	GroupRow,
	ParticipantRow,
	PivotRow,
	PivotTable,
	Series,
	StatsRange,
	StatsTotals,
	WeekRow
} from '$lib/helpers/trainingStatsTypes';
import type { Database } from '@davincibot/database-types';
import { getParisDateKey, type TrainingCategory } from '@davincibot/lib';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

const MILLISECONDS_PER_DAY = 86_400_000;

/** Faute de pseudo, une personne reste comptée plutôt que d'être perdue. */
const UNKNOWN_PERSON = 'Inconnu·e';

export type {
	GroupRow,
	ParticipantRow,
	PivotRow,
	PivotTable,
	Series,
	StatsRange,
	StatsTotals,
	WeekRow
} from '$lib/helpers/trainingStatsTypes';

/** Un créneau tenu, réduit à ce que les statistiques consomment. */
export interface StatsSlot {
	id: number;
	start: string;
	durationHours: number;
	/** Places sur site et à distance confondues. */
	seats: number;
	trainingId: number;
	trainingName: string;
	category: TrainingCategory;
	trainerName: string;
	/** Pseudos des inscrit·es confirmé·es. */
	attendees: string[];
}

/**
 * Les heures s'additionnent par quarts d'heure : sans arrondi, une somme de
 * `0.25` finit par afficher `10.750000000000002`.
 */
function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function categoryLabel(value: string): string {
	return categoryOptions.find((option) => option.value === value)?.text ?? value;
}

/** Numéro de jour depuis l'époque, pour comparer et décaler des dates civiles. */
function dayNumber(dateKey: string): number {
	const [year = 1970, month = 1, day = 1] = dateKey.split('-').map(Number);
	return Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY);
}

function dateKeyOf(day: number): string {
	return new Date(day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant ce jour. Le jour 0 (1970-01-01) est un jeudi. */
function mondayOf(day: number): number {
	return day - ((day + 3) % 7);
}

/**
 * Semaine ISO : celle du jeudi de la même semaine, ce qui rattache les
 * derniers jours de décembre à l'année suivante quand il le faut.
 */
function isoWeek(day: number): { year: number; week: number } {
	const thursday = mondayOf(day) + 3;
	const date = new Date(thursday * MILLISECONDS_PER_DAY);
	const year = date.getUTCFullYear();
	const firstThursday = mondayOf(dayNumber(`${String(year)}-01-04`)) + 3;
	return { year, week: Math.round((thursday - firstThursday) / 7) + 1 };
}

/** Jour parisien d'un créneau : à 00h30 à Paris, la formation est de la veille en UTC. */
function slotDay(slot: StatsSlot): number {
	return dayNumber(getParisDateKey(slot.start));
}

function shiftDays(dateKey: string, days: number): string {
	return dateKeyOf(dayNumber(dateKey) + days);
}

function shortDate(day: number): string {
	const [, month = '01', date = '01'] = dateKeyOf(day).split('-');
	return `${date}/${month}`;
}

function buildTotals(items: StatsSlot[]): StatsTotals {
	let hours = 0;
	let attendees = 0;
	let seats = 0;
	const trainings = new Set<number>();

	for (const item of items) {
		hours += item.durationHours;
		attendees += item.attendees.length;
		seats += item.seats;
		trainings.add(item.trainingId);
	}

	return {
		slots: items.length,
		hours: round(hours),
		attendees,
		seats,
		average: items.length === 0 ? null : attendees / items.length,
		fillRate: seats === 0 ? null : attendees / seats,
		trainingTypes: trainings.size
	};
}

/** Totaux tous créneaux confondus — la ligne « Total général » des tableaux. */
export function totals(slots: StatsSlot[]): StatsTotals {
	return buildTotals(slots);
}

function groupBy(
	slots: StatsSlot[],
	key: (slot: StatsSlot) => string,
	label: (slot: StatsSlot) => string
): GroupRow[] {
	const groups = new Map<string, { label: string; items: StatsSlot[] }>();

	for (const slot of slots) {
		const id = key(slot);
		const group = groups.get(id) ?? { label: label(slot), items: [] };
		group.items.push(slot);
		groups.set(id, group);
	}

	return [...groups.entries()]
		.map(([id, group]) => ({ key: id, label: group.label, ...buildTotals(group.items) }))
		.sort((a, b) => b.slots - a.slots || a.label.localeCompare(b.label, 'fr'));
}

export function categoryRows(slots: StatsSlot[]): GroupRow[] {
	return groupBy(
		slots,
		(slot) => slot.category,
		(slot) => categoryLabel(slot.category)
	);
}

export function trainerRows(slots: StatsSlot[]): GroupRow[] {
	return groupBy(
		slots,
		(slot) => slot.trainerName,
		(slot) => slot.trainerName
	);
}

/**
 * Une ligne par semaine ISO de la plage, y compris les semaines creuses.
 *
 * Le millésime n'est ajouté au libellé que si la plage change d'année civile :
 * sur une plage courte il n'apporte rien, sur douze mois glissants il évite de
 * lire deux « S15 » comme la même semaine.
 */
export function weeklyRows(slots: StatsSlot[], range: StatsRange): WeekRow[] {
	const counted = new Map<string, WeekRow>();
	const dated = range.from.slice(0, 4) !== range.to.slice(0, 4);

	const rows: WeekRow[] = [];
	const last = dayNumber(range.to);
	for (let day = mondayOf(dayNumber(range.from)); day <= last; day += 7) {
		const { year, week } = isoWeek(day);
		const row: WeekRow = {
			key: `${String(year)}-S${String(week)}`,
			label: dated ? `S${String(week)} · ${String(year).slice(2)}` : `S${String(week)}`,
			slots: 0,
			attendees: 0,
			seats: 0,
			hours: 0
		};
		rows.push(row);
		counted.set(row.key, row);
	}

	for (const slot of slots) {
		const { year, week } = isoWeek(slotDay(slot));
		const row = counted.get(`${String(year)}-S${String(week)}`);
		if (!row) {
			continue;
		}
		row.slots += 1;
		row.attendees += slot.attendees.length;
		row.seats += slot.seats;
		row.hours = round(row.hours + slot.durationHours);
	}

	return rows;
}

/**
 * Nombre de formations par tranche de `periodDays` jours et par catégorie.
 *
 * Les tranches partent de la date de début choisie, jamais d'un calendrier
 * imposé : deux plages différentes donnent donc des découpages différents, ce
 * qui est le propre d'un pas réglable.
 */
export function pivotByPeriod(slots: StatsSlot[], range: StatsRange): PivotTable {
	const width = Math.max(1, Math.trunc(range.periodDays));
	const start = dayNumber(range.from);
	const last = dayNumber(range.to);

	const categories = categoryOptions
		.filter((option) => slots.some((slot) => slot.category === option.value))
		.map((option) => ({ value: option.value as TrainingCategory, label: option.text }));

	const rows: PivotRow[] = [];
	for (let day = start; day <= last; day += width) {
		rows.push({
			key: dateKeyOf(day),
			label: `${shortDate(day)} → ${shortDate(Math.min(day + width - 1, last))}`,
			counts: categories.map(() => 0),
			total: 0
		});
	}

	for (const slot of slots) {
		const index = Math.floor((slotDay(slot) - start) / width);
		const column = categories.findIndex((category) => category.value === slot.category);
		// Un créneau hors des tranches ou d'une catégorie sans colonne ne peut pas
		// être placé : le chargeur a déjà borné la plage, ce cas n'arrive qu'à un
		// appel direct et ne doit pas fausser les totaux.
		const row = rows[index];
		if (!row || column < 0) {
			continue;
		}
		row.counts[column] = (row.counts[column] ?? 0) + 1;
		row.total += 1;
	}

	return {
		categories,
		rows,
		totals: {
			counts: categories.map((_, column) =>
				rows.reduce((sum, row) => sum + (row.counts[column] ?? 0), 0)
			),
			total: rows.reduce((sum, row) => sum + row.total, 0)
		}
	};
}

/** Une série par catégorie, alignée sur les périodes — pour les aires empilées. */
export function pivotSeries(table: PivotTable): Series[] {
	return table.categories.map((category, column) => ({
		label: category.label,
		values: table.rows.map((row) => row.counts[column] ?? 0)
	}));
}

/**
 * Les mêmes séries ramenées à cent pour cent par période.
 *
 * Chart.js n'empile pas en pourcentage : la normalisation se fait ici, où elle
 * se teste, plutôt que dans les options du graphique.
 */
export function pivotPercentSeries(table: PivotTable): Series[] {
	return table.categories.map((category, column) => ({
		label: category.label,
		values: table.rows.map((row) =>
			row.total === 0 ? 0 : ((row.counts[column] ?? 0) / row.total) * 100
		)
	}));
}

/** Assiduité : formations suivies et heures cumulées, des plus assidu·es aux moins. */
export function participantRows(slots: StatsSlot[]): ParticipantRow[] {
	const rows = new Map<string, ParticipantRow>();

	for (const slot of slots) {
		for (const name of slot.attendees) {
			const row = rows.get(name) ?? { name, slots: 0, hours: 0 };
			row.slots += 1;
			row.hours = round(row.hours + slot.durationHours);
			rows.set(name, row);
		}
	}

	return [...rows.values()].sort(
		(a, b) => b.slots - a.slots || b.hours - a.hours || a.name.localeCompare(b.name, 'fr')
	);
}

const DEFAULT_PERIOD_DAYS = 21;

/** Au-delà d'une année, une « période » du tableau croisé ne découpe plus rien. */
const MAX_PERIOD_DAYS = 366;

function isDateKey(value: string | null | undefined): value is string {
	return (
		typeof value === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(value) &&
		dateKeyOf(dayNumber(value)) === value
	);
}

function readPeriodDays(value: string | null | undefined): number {
	if (value === null || value === undefined || value.trim() === '') {
		return DEFAULT_PERIOD_DAYS;
	}
	const days = Number(value);
	if (!Number.isFinite(days)) {
		return DEFAULT_PERIOD_DAYS;
	}
	return Math.min(MAX_PERIOD_DAYS, Math.max(1, Math.trunc(days)));
}

/**
 * La plage à afficher, telle que l'URL la demande.
 *
 * `today` est passé en argument plutôt que lu ici : c'est ce qui rend la
 * fonction vérifiable, et le chargeur reste le seul endroit qui sait quel jour
 * on est. Une saisie invalide retombe sur le défaut au lieu d'échouer — un
 * paramètre d'URL abîmé ne doit pas coûter une page d'erreur.
 */
export function resolveRange(
	params: { from?: string | null; to?: string | null; period?: string | null },
	today: string
): StatsRange {
	const to = isDateKey(params.to) ? params.to : today;
	const [year = 1970, month = 1, day = 1] = today.split('-').map(Number);
	const defaultFrom = dateKeyOf(
		dayNumber(
			`${String(year - 1)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
		)
	);
	const from = isDateKey(params.from) ? params.from : defaultFrom;

	// Deux dates à l'envers décrivent la même intention que dans le bon ordre :
	// les remettre d'aplomb vaut mieux que rendre une plage vide.
	const [first, last]: [string, string] =
		dayNumber(from) <= dayNumber(to) ? [from, to] : [to, from];

	return { from: first, to: last, periodDays: readPeriodDays(params.period) };
}

/**
 * Ne garde que les créneaux dont le jour parisien tombe dans la plage.
 *
 * La requête élargit d'un jour de chaque côté parce qu'une borne exprimée en
 * UTC coupe au mauvais endroit : une formation à 01h00 à Paris le jour de début
 * est encore la veille en UTC. Le tri fin se fait donc ici, sur le jour civil.
 */
export function filterToRange(slots: StatsSlot[], range: StatsRange): StatsSlot[] {
	const first = dayNumber(range.from);
	const last = dayNumber(range.to);
	return slots.filter((slot) => {
		const day = slotDay(slot);
		return day >= first && day <= last;
	});
}

/** Une inscription recollée depuis `formation.trainer_registration_view`. */
export interface RegistrationRow {
	status: string;
	member_username: string | null;
}

/** La ligne telle que PostgREST la rend pour la requête du chargeur. */
export interface SlotRow {
	id: number;
	start: string;
	duration_hours: number;
	on_site_seats: number | null;
	remote_seats: number | null;
	training_id: number;
	name: string | null;
	category: string | null;
	trainer_username: string | null;
	registration: RegistrationRow[] | null;
}

function personName(username: string | null | undefined): string {
	const trimmed = username?.trim();
	return trimmed === undefined || trimmed === '' ? UNKNOWN_PERSON : trimmed;
}

/** Traduit les lignes de la base en créneaux exploitables par les agrégations. */
export function toStatsSlots(rows: SlotRow[]): StatsSlot[] {
	return rows.map((row) => ({
		id: row.id,
		start: row.start,
		durationHours: row.duration_hours,
		// Une capacité non renseignée n'est pas une place offerte : elle vaut zéro,
		// et le remplissage devient « — » plutôt qu'un taux inventé.
		seats: (row.on_site_seats ?? 0) + (row.remote_seats ?? 0),
		trainingId: row.training_id,
		trainingName: row.name ?? 'Formation',
		category: (row.category ?? 'other') as TrainingCategory,
		trainerName: personName(row.trainer_username),
		attendees: (row.registration ?? [])
			.filter((registration) => registration.status === 'registered')
			.map((registration) => personName(registration.member_username))
	}));
}

/**
 * Les créneaux tenus de la plage, inscriptions confirmées comprises.
 *
 * La lecture passe par `locals.supabase` : les policies `training.slot.read` et
 * `training.registration.read.all` tranchent, et une personne sans le second
 * droit verra des formations sans participant·es plutôt qu'une erreur.
 */
export async function fetchStatsSlots(
	supabase: Client,
	range: StatsRange
): Promise<{ slots: StatsSlot[]; failed: boolean }> {
	const { data, error } = await supabase
		.schema('formation')
		.from('training_slot_expanded_view')
		.select(
			'id, start, duration_hours, on_site_seats, remote_seats, training_id, name, category, trainer_username'
		)
		.eq('status', 'done')
		.gte('start', `${shiftDays(range.from, -1)}T00:00:00Z`)
		.lte('start', `${shiftDays(range.to, 1)}T00:00:00Z`)
		.order('start');

	if (error) {
		return { slots: [], failed: true };
	}

	const rows = data as unknown as SlotRow[];

	if (rows.length > 0) {
		const { data: registrations } = await supabase
			.schema('formation')
			.from('trainer_registration_view')
			.select('slot_id, status, member_username')
			.in(
				'slot_id',
				rows.map((row) => row.id)
			);

		const bySlot = new Map<number, RegistrationRow[]>();
		for (const entry of (registrations ?? []) as unknown as (RegistrationRow & {
			slot_id: number;
		})[]) {
			const list = bySlot.get(entry.slot_id) ?? [];
			list.push({ status: entry.status, member_username: entry.member_username });
			bySlot.set(entry.slot_id, list);
		}

		for (const row of rows) {
			row.registration = bySlot.get(row.id) ?? [];
		}
	}

	return { slots: filterToRange(toStatsSlots(rows), range), failed: false };
}
