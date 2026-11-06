<script lang="ts">
	import {
		FilterChip,
		Table,
		type ParseItems,
		type TableCell,
		type TableColumn
	} from '@davincibot/components';
	import { resolve } from '$app/paths';
	import {
		AUDIT_DB,
		AUDIT_FILTERS,
		AUDIT_SEARCH,
		parseCashActivities,
		parseFormationActivities,
		parseRejected,
		parseSocleActivities,
		type ActivityRow,
		type RejectedRow
	} from '#lib/auditTable.js';
	import {
		ACTIVITY_BADGES,
		actorLabel,
		fieldLabel,
		formatJournalValue,
		isOpaqueField,
		type JournalChange
	} from '#lib/types/audit.js';
	import { CASH_ERROR_MESSAGES } from '#lib/types/domain.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const TABS = [
		{ id: 'socle', label: 'Socle', hint: 'Permissions, rattachements, blog' },
		{ id: 'cash', label: 'Cash', hint: 'Commandes et trésorerie' },
		{ id: 'formation', label: 'Formation', hint: 'Formations, créneaux et inscriptions' },
		{ id: 'rejets', label: 'Écritures rejetées', hint: 'Ce que les règles ont refusé' }
	] as const;

	const moment = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

	// `resolve` est appelé ici, une fois : les liens ci-dessous n'en sont que des
	// variantes de query string. La règle `no-navigation-without-resolve` ne sait
	// pas suivre l'appel à travers la fonction ; l'exemption vit désormais dans
	// FilterChip, qui porte le `href`.
	function tabHref(tab: string): string {
		return `${resolve('/audit')}?${new URLSearchParams({ tab }).toString()}`;
	}

	const activityColumns: TableColumn[] = [
		{ key: 'occurred_at', label: 'Date', sortable: true, width: '9rem' },
		{ key: 'action', label: 'Action' },
		{ key: 'before', label: 'Avant' },
		{ key: 'after', label: 'Après' },
		{ key: 'actor', label: 'Modifiant', width: '10rem' }
	];

	const rejectedColumns: TableColumn[] = [
		{ key: 'occurred_at', label: 'Quand', sortable: true, width: '9rem' },
		{ key: 'sqlstate', label: 'Code', sortable: true, width: '6rem' },
		{ key: 'refusal', label: 'Refus' },
		{ key: 'target', label: 'Cible', width: '12rem' },
		{ key: 'actor', label: 'Auteur', width: '10rem' }
	];

	// Une activité tient sur une ligne : ses champs modifiés se lisent en liste dans
	// « Avant » et « Après », là où une ligne par champ ferait compter les pages
	// autrement que les activités.
	const activityCells = (value: ActivityRow): TableCell[] => [
		{ value, cell: dateCell },
		{ value, cell: actionCell },
		{ value, cell: beforeCell },
		{ value, cell: afterCell },
		{ value, cell: actorCell }
	];

	const parseSocle: ParseItems = (rows) => parseSocleActivities(rows).map(activityCells);

	const parseFormation: ParseItems = async (rows) =>
		(await parseFormationActivities(rows)).map(activityCells);

	const parseCash: ParseItems = async (rows) =>
		(await parseCashActivities(rows)).map(activityCells);

	const parseRejectedRows: ParseItems = (rows) =>
		parseRejected(rows).map((value) => [
			{ value, cell: rejectedDateCell },
			{ value, cell: codeCell },
			{ value, cell: refusalCell },
			{ value, cell: targetCell },
			{ value, cell: rejectedActorCell }
		]);

	const activity = (cell: TableCell | undefined) => cell?.value as ActivityRow;
	const rejected = (cell: TableCell | undefined) => cell?.value as RejectedRow;

	const ACTION_LABELS = {
		created: 'Création',
		updated: 'Modification',
		state_changed: "Changement d'état",
		deleted: 'Suppression'
	} as const;

	// Les identifiants du socle sont parfois un uuid, un slug ou un rôle : « n° » ne
	// se dit que d'un numéro.
	const isNumeric = (id: string | null): id is string => id !== null && /^\d+$/.test(id);

	// Une création n'a pas d'« avant », une suppression pas d'« après » : leur
	// instantané ne montre que le côté qui existe, sans les colonnes vides ni les
	// identifiants bruts.
	function shownChanges(row: ActivityRow, side: 'old' | 'new') {
		if (row.kind === 'created') {
			return side === 'old' ? [] : row.changes.filter(isFilled);
		}
		if (row.kind === 'deleted') {
			return side === 'new' ? [] : row.changes.filter(isFilled);
		}
		return row.changes;
	}

	const isFilled = (change: JournalChange) =>
		!isOpaqueField(change.field) && (change.new ?? change.old) !== null;

	const parsers = { socle: parseSocle, cash: parseCash, formation: parseFormation } as const;
</script>

<svelte:head><title>Audit — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Audit</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Ce qui a changé, qui l'a changé, et ce que les règles ont refusé. L'historique d'une ligne
			précise, lui, se lit sur la ligne elle-même.
		</p>
	</header>

	<nav class="mb-6 flex flex-wrap gap-2">
		{#each TABS as tab (tab.id)}
			<FilterChip href={tabHref(tab.id)} pressed={data.tab === tab.id} title={tab.hint}>
				{tab.label}
			</FilterChip>
		{/each}
	</nav>

	<!-- Une instance par onglet : chaque journal a sa table, sa page, ses filtres. -->
	{#key data.tab}
		<!-- TRANS-NF-52 — au premier chef les tentatives d'écriture sur une période
		     close : c'est le refus qu'on subit sans comprendre, et celui qu'on
		     vient chercher ici. -->
		{#if data.tab === 'rejets'}
			<Table
				columns={rejectedColumns}
				dbInfo={AUDIT_DB.rejets}
				filters={AUDIT_FILTERS.rejets}
				pageSize={20}
				parseItems={parseRejectedRows}
				searchable={AUDIT_SEARCH.rejets}
			/>
		{:else}
			<Table
				columns={activityColumns}
				dbInfo={AUDIT_DB[data.tab]}
				filters={AUDIT_FILTERS[data.tab]}
				pageSize={20}
				parseItems={parsers[data.tab]}
				searchable={AUDIT_SEARCH[data.tab]}
			/>
		{/if}
	{/key}
</section>

{#snippet dateCell(cell: TableCell)}
	<time class="whitespace-nowrap" datetime={activity(cell).occurredAt}
		>{moment.format(new Date(activity(cell).occurredAt))}</time
	>
{/snippet}

{#snippet actionCell(cell: TableCell)}
	{@const row = activity(cell)}
	<span>
		<span
			class="mr-1.5 rounded px-1.5 py-0.5 text-xs font-medium {ACTIVITY_BADGES[row.kind].className}"
			>{row.entity}</span
		>
		<span class="text-light-blue">{ACTION_LABELS[row.kind]}</span>
		{#if isNumeric(row.entityId)}
			<span class="text-dark-light-blue/70 text-xs">n° {row.entityId}</span>
		{:else}
			<span class="text-dark-light-blue/70 text-xs">{row.entityId}</span>
		{/if}
	</span>
{/snippet}

{#snippet beforeCell(cell: TableCell)}
	<ul class="space-y-0.5">
		{#each shownChanges(activity(cell), 'old') as change (change.field)}
			<li>
				<span class="text-dark-light-blue/70 text-xs">{fieldLabel(change.field)}</span>
				{#if !isOpaqueField(change.field)}{formatJournalValue(change.old)}{/if}
			</li>
		{:else}
			<li class="text-dark-light-blue/70">—</li>
		{/each}
	</ul>
{/snippet}

{#snippet afterCell(cell: TableCell)}
	<ul class="space-y-0.5">
		{#each shownChanges(activity(cell), 'new') as change (change.field)}
			<li>
				<span class="text-dark-light-blue/70 text-xs">{fieldLabel(change.field)}</span>
				{#if isOpaqueField(change.field)}
					<span class="text-dark-light-blue/70">modifié</span>
				{:else}
					<span class="text-light-blue">{formatJournalValue(change.new)}</span>
				{/if}
			</li>
		{:else}
			<li class="text-dark-light-blue/70">—</li>
		{/each}
	</ul>
{/snippet}

{#snippet actorCell(cell: TableCell)}
	{actorLabel(activity(cell))}
{/snippet}

{#snippet rejectedDateCell(cell: TableCell)}
	<time class="whitespace-nowrap" datetime={rejected(cell).occurredAt}
		>{moment.format(new Date(rejected(cell).occurredAt))}</time
	>
{/snippet}

{#snippet codeCell(cell: TableCell)}
	<span class="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-xs text-red-400"
		>{rejected(cell).sqlstate}</span
	>
{/snippet}

{#snippet refusalCell(cell: TableCell)}
	<span class="text-light-blue"
		>{CASH_ERROR_MESSAGES[rejected(cell).sqlstate] ?? rejected(cell).message}</span
	>
{/snippet}

{#snippet targetCell(cell: TableCell)}
	{@const row = rejected(cell)}
	{#if row.entity}
		{row.entity}
		{#if isNumeric(row.entityId)}
			<span class="text-dark-light-blue/70">n° {row.entityId}</span>
		{:else}
			<span class="text-dark-light-blue/70">{row.entityId}</span>
		{/if}
	{:else}
		—
	{/if}
{/snippet}

{#snippet rejectedActorCell(cell: TableCell)}
	{rejected(cell).actor}
{/snippet}
