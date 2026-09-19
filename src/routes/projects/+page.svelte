<script lang="ts">
	import { Button } from '@davincibot/components';
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
			<p class="text-dark-light-blue mt-1 text-sm">
				Chaque projet désigne un nœud de l'arbre budgétaire, à la profondeur qui lui convient. Le
				campus du projet sert à résoudre la destination des items qu'on y rattache.
			</p>
		</div>
		<Button onclick={() => (creating = !creating)} size="md" variant="primary"
			>{creating ? 'Annuler' : 'Nouveau projet'}</Button
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

	{#snippet projectForm(project: (typeof data.projects)[number] | null)}
		<form
			class="border-light-blue/30 bg-dark-blue/60 mb-3 flex flex-wrap items-end gap-3 rounded-lg border p-3"
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
			<label class="text-dark-light-blue text-xs">
				Nom
				<input
					name="name"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					required
					value={project?.name ?? ''}
				/>
			</label>
			<label class="text-dark-light-blue text-xs">
				Campus
				<select
					name="campus"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					value={project?.campus ?? ''}
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
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					value={project?.budgetId ?? ''}
				>
					<option value="">— aucun —</option>
					{#each data.tree as node (node.id)}
						<option value={node.id}>{'— '.repeat(node.depth)}{node.name}</option>
					{/each}
				</select>
			</label>
			<Button size="sm" type="submit" variant="primary">Enregistrer</Button>
		</form>
	{/snippet}

	{#if creating}
		{@render projectForm(null)}
	{/if}

	<ul class="space-y-2">
		{#each active as project (project.id)}
			<li class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
				<div class="flex flex-wrap items-center gap-3">
					<span class="font-medium text-white">{project.name}</span>
					{#if project.campus}
						<CampusBadge campus={project.campus} />
					{:else}
						<span class="text-xs text-amber-300">sans campus</span>
					{/if}
					<span class="text-dark-light-blue text-sm">
						{#if project.budgetPath}
							{project.budgetPath}
						{:else}
							<span class="text-amber-300">aucun budget désigné</span>
						{/if}
					</span>
					<span class="text-dark-light-blue/70 ml-auto text-xs">{project.itemCount} item(s)</span>
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Button
						onclick={() => (editing = editing === project.id ? null : project.id)}
						size="sm"
						variant="ghost">modifier</Button
					>
					<form action="?/toggleArchive" method="POST" use:enhance>
						<input name="id" type="hidden" value={project.id} />
						<input name="archive" type="hidden" value="1" />
						<Button size="sm" type="submit" variant="danger-ghost">archiver</Button>
					</form>
					{#if project.itemCount === 0}
						<form action="?/remove" method="POST" use:enhance>
							<input name="id" type="hidden" value={project.id} />
							<Button size="sm" type="submit" variant="danger-ghost">supprimer</Button>
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
		<h2 class="text-dark-light-blue mt-8 mb-2 text-sm font-semibold tracking-wide uppercase">
			Archivés
		</h2>
		<ul class="space-y-1">
			{#each archived as project (project.id)}
				<li class="text-dark-light-blue/70 flex items-center gap-3 text-sm">
					<span>{project.name}</span>
					<span class="text-xs">{project.itemCount} item(s)</span>
					<form action="?/toggleArchive" method="POST" use:enhance>
						<input name="id" type="hidden" value={project.id} />
						<input name="archive" type="hidden" value="0" />
						<Button size="sm" type="submit" variant="ghost">réactiver</Button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="text-dark-light-blue/70 mt-8 text-xs">
		La consommation budgétaire de chaque projet se lit sur <a
			class="hover:text-dark-light-blue underline"
			href={resolve('/budgets')}>l'arbre des budgets</a
		>, où elle est calculée nœud par nœud.
	</p>
</section>
