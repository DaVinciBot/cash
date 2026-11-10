<script lang="ts">
	import {
		Button,
		Table,
		type ParseItems,
		type TableCell,
		type TableColumn
	} from '@davincibot/components';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '#lib/components/cash/CampusBadge.svelte';
	import RowMenu from '#lib/components/cash/RowMenu.svelte';
	import {
		PROJECT_FILTERS,
		ACTIVE_PROJECTS_DB,
		ARCHIVED_PROJECTS_DB,
		parseProjectRows,
		type ProjectRow
	} from '#lib/projectTable.js';
	import { CAMPUS_BADGES, triggerTableRefresh } from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const failure = $derived(form && 'message' in form ? form.message : null);

	const TABLE_TOPIC = 'projects';

	// Un seul formulaire, au-dessus de la table : `null` le ferme, `'new'` crée,
	// un projet se modifie.
	let editing = $state<ProjectRow | 'new' | null>(null);
	const target = $derived(editing === 'new' ? null : editing);
	const campuses = Object.keys(CAMPUS_BADGES) as (keyof typeof CAMPUS_BADGES)[];

	const columns: TableColumn[] = [
		{ key: 'name', label: 'Projet', sortable: true },
		{ key: 'campus', label: 'Campus', width: '9rem', sortable: true },
		{ key: 'budget_id', label: 'Budget désigné' },
		{ key: 'items', label: 'Items', width: '6rem' },
		{ key: 'id', label: 'Actions', width: '5rem', align: 'right' }
	];

	const project = (cell: TableCell | undefined) => cell?.value as ProjectRow;

	const parseProjects: ParseItems = async (rows) =>
		(await parseProjectRows(rows)).map((value) => [
			{ value, cell: nameCell },
			{ value, cell: campusCell },
			{ value, cell: budgetCell },
			{ value, cell: itemsCell },
			{ value, cell: actionsCell }
		]);

	/** Après une action réussie, la table se recharge et le formulaire se ferme. */
	const submit: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				editing = null;
				triggerTableRefresh(TABLE_TOPIC);
			}
		};
	};
</script>

<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -- {@render} est vu comme une expression void imbriquée par la règle ; les snippets sont pourtant la bonne forme ici -->

<svelte:head><title>Projets — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Projets</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Chaque projet désigne un nœud de l'arbre budgétaire, à la profondeur qui lui convient. Le
				campus du projet sert à résoudre la destination des items qu'on y rattache.
			</p>
		</div>
		<Button onclick={() => (editing = editing === 'new' ? null : 'new')} size="md" variant="primary"
			>{editing === 'new' ? 'Annuler' : 'Nouveau projet'}</Button
		>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if data.schoolYear}
		<p class="text-dark-light-blue/70 mb-4 text-xs">
			Arbre de l'année {data.schoolYear.label}. L'arbre appartient à une année scolaire : le budget
			visé par un projet est à redésigner à chaque rentrée.
		</p>
	{:else}
		<p
			class="mb-4 rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-500/30"
		>
			Aucune année scolaire ne couvre la date du jour : ouvrez-en une depuis la trésorerie avant de
			rattacher un projet à un budget.
		</p>
	{/if}

	{#if editing}
		{#key editing === 'new' ? 'new' : editing.id}
			<form
				class="border-rule-strong bg-dark-blue/60 mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-3"
				action={target ? '?/update' : '?/create'}
				method="POST"
				use:enhance={submit}
			>
				{#if target}
					<input name="id" type="hidden" value={target.id} />
				{/if}
				<label class="text-dark-light-blue text-xs">
					Nom
					<input
						name="name"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						required
						value={target?.name ?? ''}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Campus
					<select
						name="campus"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						value={target?.campus ?? ''}
					>
						<option value="">— aucun —</option>
						{#each campuses as campus (campus)}
							<option value={campus}>{CAMPUS_BADGES[campus].label}</option>
						{/each}
					</select>
				</label>
				<label class="text-dark-light-blue flex-1 text-xs">
					Budget désigné
					<select
						name="budget_id"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						value={target?.budgetId ?? ''}
					>
						<option value="">— aucun —</option>
						{#each data.tree as node (node.id)}
							<option value={node.id}>{'— '.repeat(node.depth)}{node.name}</option>
						{/each}
					</select>
				</label>
				<Button size="sm" type="submit" variant="primary">Enregistrer</Button>
			</form>
		{/key}
	{/if}

	<div class="overflow-x-auto">
		<Table
			{columns}
			dbInfo={ACTIVE_PROJECTS_DB}
			filters={PROJECT_FILTERS}
			pageSize={20}
			parseItems={parseProjects}
			refreshTopic={TABLE_TOPIC}
			searchable="name"
		/>
	</div>

	<h2 class="text-dark-light-blue mt-8 mb-2 text-sm font-semibold tracking-wide uppercase">
		Archivés
	</h2>
	<div class="overflow-x-auto">
		<Table
			{columns}
			dbInfo={ARCHIVED_PROJECTS_DB}
			filters={PROJECT_FILTERS}
			pageSize={10}
			parseItems={parseProjects}
			refreshTopic={TABLE_TOPIC}
			searchable="name"
		/>
	</div>

	<p class="text-dark-light-blue/70 mt-8 text-xs">
		La consommation budgétaire de chaque projet se lit sur <a
			class="hover:text-dark-light-blue underline"
			href={resolve('/budgets')}>l'arbre des budgets</a
		>, où elle est calculée nœud par nœud.
	</p>
</section>

{#snippet nameCell(cell: TableCell)}
	{@const row = project(cell)}
	<span class={row.archivedAt ? 'text-dark-light-blue/70' : 'font-medium text-white'}>
		{row.name}
	</span>
	{#if row.skipsReview}
		<span class="text-dark-light-blue ml-2 text-xs">sans revue CDP</span>
	{/if}
{/snippet}

{#snippet campusCell(cell: TableCell)}
	{@const row = project(cell)}
	{#if row.campus}
		<CampusBadge campus={row.campus} />
	{:else}
		<span class="text-xs text-amber-300">sans campus</span>
	{/if}
{/snippet}

{#snippet budgetCell(cell: TableCell)}
	{@const row = project(cell)}
	{#if row.budgetPath}
		<span class="text-dark-light-blue">{row.budgetPath}</span>
	{:else}
		<span class="text-amber-300">aucun budget désigné</span>
	{/if}
{/snippet}

{#snippet itemsCell(cell: TableCell)}
	<span class="text-dark-light-blue">{project(cell).itemCount}</span>
{/snippet}

{#snippet actionsCell(cell: TableCell)}
	{@const row = project(cell)}
	<RowMenu>
		{#snippet children(close: () => void)}
			<Button
				class="w-full justify-start"
				onclick={() => {
					editing = row;
					close();
				}}
				size="sm"
				variant="secondary">Modifier</Button
			>
			{#if row.locked}
				<p class="text-dark-light-blue px-2 py-1 text-xs">
					Projet de l'association : il ne s'archive ni ne se supprime.
				</p>
			{:else}
				<form action="?/toggleArchive" method="POST" use:enhance={submit}>
					<input name="id" type="hidden" value={row.id} />
					<input name="archive" type="hidden" value={row.archivedAt ? '0' : '1'} />
					<Button
						class="w-full justify-start"
						size="sm"
						type="submit"
						variant={row.archivedAt ? 'primary' : 'secondary'}
						>{row.archivedAt ? 'Réactiver' : 'Archiver'}</Button
					>
				</form>
				{#if row.itemCount === 0}
					<form action="?/remove" method="POST" use:enhance={submit}>
						<input name="id" type="hidden" value={row.id} />
						<Button class="w-full justify-start" size="sm" type="submit" variant="danger"
							>Supprimer</Button
						>
					</form>
				{/if}
			{/if}
		{/snippet}
	</RowMenu>
{/snippet}
