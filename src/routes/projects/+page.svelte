<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import { CAMPUS_BADGES } from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const failure = $derived(form && 'message' in form ? form.message : null);

	let editing = $state<number | null>(null);
	let creating = $state(false);

	const active = $derived(data.projects.filter((p) => !p.archivedAt));
	const archived = $derived(data.projects.filter((p) => p.archivedAt));
	const campuses = Object.keys(CAMPUS_BADGES) as (keyof typeof CAMPUS_BADGES)[];
</script>

<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -- {@render} est vu comme une expression void imbriquée par la règle ; les snippets sont pourtant la bonne forme ici -->

<svelte:head><title>Projets — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-4xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Projets</h1>
			<p class="mt-1 text-sm text-gray-400">
				Chaque projet désigne un nœud de l'arbre budgétaire, à la profondeur qui lui convient. Le
				campus du projet sert à résoudre la destination des items qu'on y rattache.
			</p>
		</div>
		<button
			class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
			onclick={() => (creating = !creating)}
			type="button">{creating ? 'Annuler' : 'Nouveau projet'}</button
		>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	{#if data.schoolYear}
		<p class="mb-4 text-xs text-gray-500">
			Arbre de l'année {data.schoolYear.label}. L'arbre appartient à une année scolaire : le budget
			visé par un projet est à redésigner à chaque rentrée.
		</p>
	{:else}
		<p
			class="mb-4 rounded-lg bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/30"
		>
			Aucune année scolaire ne couvre la date du jour : ouvrez-en une depuis la trésorerie avant de
			rattacher un projet à un budget.
		</p>
	{/if}

	{#snippet projectForm(project: (typeof data.projects)[number] | null)}
		<form
			class="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-600 bg-gray-900/60 p-3"
			action={project ? '?/update' : '?/create'}
			method="POST"
			use:enhance={() =>
				({ update }) => {
					editing = null;
					creating = false;
					return update();
				}}
		>
			{#if project}
				<input name="id" type="hidden" value={project.id} />
			{/if}
			<label class="text-xs text-gray-300">
				Nom
				<input
					name="name"
					class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					required
					value={project?.name ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Campus
				<select
					name="campus"
					class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={project?.campus ?? ''}
				>
					<option value="">— aucun —</option>
					{#each campuses as campus (campus)}
						<option value={campus}>{CAMPUS_BADGES[campus].label}</option>
					{/each}
				</select>
			</label>
			<label class="flex-1 text-xs text-gray-300">
				Budget désigné
				<select
					name="budget_id"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={project?.budgetId ?? ''}
				>
					<option value="">— aucun —</option>
					{#each data.tree as node (node.id)}
						<option value={node.id}>{'— '.repeat(node.depth)}{node.name}</option>
					{/each}
				</select>
			</label>
			<button
				class="bg-primary-600 hover:bg-primary-800 rounded-lg px-3 py-2 text-sm font-medium text-white"
				type="submit">Enregistrer</button
			>
		</form>
	{/snippet}

	{#if creating}
		{@render projectForm(null)}
	{/if}

	<ul class="space-y-2">
		{#each active as project (project.id)}
			<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
				<div class="flex flex-wrap items-center gap-3">
					<span class="font-medium text-white">{project.name}</span>
					{#if project.campus}
						<CampusBadge campus={project.campus} />
					{:else}
						<span class="text-xs text-amber-300">sans campus</span>
					{/if}
					<span class="text-sm text-gray-400">
						{#if project.budgetPath}
							{project.budgetPath}
						{:else}
							<span class="text-amber-300">aucun budget désigné</span>
						{/if}
					</span>
					<span class="ml-auto text-xs text-gray-500">{project.itemCount} item(s)</span>
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<button
						class="text-xs text-gray-400 underline hover:text-gray-200"
						onclick={() => (editing = editing === project.id ? null : project.id)}
						type="button">modifier</button
					>
					<form action="?/toggleArchive" method="POST" use:enhance>
						<input name="id" type="hidden" value={project.id} />
						<input name="archive" type="hidden" value="1" />
						<button class="text-xs text-gray-400 underline hover:text-gray-200" type="submit"
							>archiver</button
						>
					</form>
					{#if project.itemCount === 0}
						<form action="?/remove" method="POST" use:enhance>
							<input name="id" type="hidden" value={project.id} />
							<button class="text-xs text-rose-400 underline hover:text-rose-200" type="submit"
								>supprimer</button
							>
						</form>
					{/if}
				</div>
				{#if editing === project.id}
					{@render projectForm(project)}
				{/if}
			</li>
		{/each}
	</ul>

	{#if archived.length > 0}
		<h2 class="mt-8 mb-2 text-sm font-semibold tracking-wide text-gray-400 uppercase">Archivés</h2>
		<ul class="space-y-1">
			{#each archived as project (project.id)}
				<li class="flex items-center gap-3 text-sm text-gray-500">
					<span>{project.name}</span>
					<span class="text-xs">{project.itemCount} item(s)</span>
					<form action="?/toggleArchive" method="POST" use:enhance>
						<input name="id" type="hidden" value={project.id} />
						<input name="archive" type="hidden" value="0" />
						<button class="text-xs text-gray-400 underline hover:text-gray-200" type="submit"
							>réactiver</button
						>
					</form>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="mt-8 text-xs text-gray-500">
		La consommation budgétaire de chaque projet se lit sur <a
			class="underline hover:text-gray-300"
			href={resolve('/budgets')}>l'arbre des budgets</a
		>, où elle est calculée nœud par nœud.
	</p>
</section>
