<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

	const failure = $derived(form && 'message' in form ? form.message : null);

	let editing = $state<number | null>(null);
	let creatingUnder = $state<number | null | undefined>(undefined);
	let showArchived = $state(false);

	const visible = $derived(data.tree.filter((b) => showArchived || !b.archivedAt));
	// Un parent possible est un nœud qui ne porte pas de montant : y déplacer un
	// budget ferait cesser la cible d'être une feuille, ce que `check_budget_tree`
	// refuse. Une feuille à montant n'est plus une impasse pour autant — elle
	// s'ouvre par « transformer en parent », pas en la choisissant ici.
	const parentOptions = $derived(data.tree.filter((b) => !b.archivedAt && b.amountTtc === null));
</script>

<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -- {@render} est vu comme une expression void imbriquée par la règle ; les snippets sont pourtant la bonne forme ici -->

<svelte:head><title>Budgets — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Budgets</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Un arbre autonome, par année scolaire. Seules les feuilles portent un montant ; celui d'un
			nœud est la somme de ses descendants.
		</p>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	<!-- CMD-F-54 — le dépassement apparu après coup ne bloque rien mais reste visible -->
	{#if data.overdrawn.length > 0}
		<div class="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4">
			<h2 class="text-sm font-semibold text-rose-200">
				{data.overdrawn.length} budget(s) en dépassement
			</h2>
			<ul class="text-dark-light-blue mt-2 space-y-1 text-sm">
				{#each data.overdrawn as budget (budget.id)}
					<li>
						{budget.name} <span class="text-dark-light-blue/70 text-xs">({budget.year})</span> —
						{euro.format(budget.consumedTtc)} consommés pour {euro.format(budget.allocatedTtc)}
						alloués,
						<span class="font-medium text-rose-200"
							>dépassé de {euro.format(budget.consumedTtc - budget.allocatedTtc)}</span
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<form method="GET">
			<label class="text-dark-light-blue text-xs">
				Année scolaire
				<select
					name="year"
					class="border-light-blue/30 bg-dark-blue/60 mt-1 block rounded-lg border p-2 text-sm text-white"
					onchange={(event) => event.currentTarget.form?.requestSubmit()}
					value={data.schoolYearId ?? ''}
				>
					{#each data.schoolYears as year (year.id)}
						<option value={year.id}>{year.label}{year.closedAt ? ' (close)' : ''}</option>
					{/each}
				</select>
			</label>
		</form>
		<label class="text-dark-light-blue mt-4 flex items-center gap-2 text-sm">
			<input
				class="border-light-blue/30 bg-dark-blue/60 size-4 rounded"
				type="checkbox"
				bind:checked={showArchived}
			/>
			Afficher les archivés
		</label>
		<button
			class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 mt-4 ml-auto rounded-lg border px-3 py-1.5 text-sm"
			onclick={() => (creatingUnder = creatingUnder === null ? undefined : null)}
			type="button">Ajouter une racine</button
		>
	</div>

	{#snippet budgetForm(parentId: number | null, node: (typeof data.tree)[number] | null)}
		<form
			class="border-light-blue/30 bg-dark-blue/60 mb-2 flex flex-wrap items-end gap-3 rounded-lg border p-3"
			action={node ? '?/update' : '?/create'}
			method="POST"
			use:enhance={() =>
				({ update }) => {
					editing = null;
					creatingUnder = undefined;
					return update();
				}}
		>
			{#if node}
				<input name="id" type="hidden" value={node.id} />
			{:else}
				<input name="school_year_id" type="hidden" value={data.schoolYearId} />
				<input name="parent_id" type="hidden" value={parentId ?? ''} />
			{/if}
			<label class="text-dark-light-blue text-xs">
				Nom
				<input
					name="name"
					class="border-light-blue/30 bg-dark-blue/60 mt-1 block rounded-lg border p-2 text-sm text-white"
					required
					value={node?.name ?? ''}
				/>
			</label>
			{#if node}
				<label class="text-dark-light-blue text-xs">
					Parent
					<select
						name="parent_id"
						class="border-light-blue/30 bg-dark-blue/60 mt-1 block rounded-lg border p-2 text-sm text-white"
						value={node.parentId ?? ''}
					>
						<option value="">— racine —</option>
						{#each parentOptions.filter((p) => p.id !== node.id) as option (option.id)}
							<option value={option.id}>{'— '.repeat(option.depth)}{option.name}</option>
						{/each}
					</select>
				</label>
			{/if}
			<label class="text-dark-light-blue text-xs">
				Montant TTC <span class="text-dark-light-blue/70">(feuille uniquement)</span>
				<input
					name="amount_ttc"
					class="border-light-blue/30 bg-dark-blue/60 mt-1 block w-32 rounded-lg border p-2 text-sm text-white"
					inputmode="decimal"
					placeholder="—"
					value={node?.amountTtc === null || node === null
						? ''
						: node.amountTtc.toFixed(2).replace('.', ',')}
				/>
			</label>
			<button
				class="bg-primary-600 hover:bg-primary-800 rounded-lg px-3 py-2 text-sm font-medium text-white"
				type="submit">Enregistrer</button
			>
			<button
				class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-2 text-sm"
				onclick={() => {
					editing = null;
					creatingUnder = undefined;
				}}
				type="button">Annuler</button
			>
		</form>
	{/snippet}

	{#if creatingUnder === null}
		{@render budgetForm(null, null)}
	{/if}

	{#if visible.length === 0}
		<p
			class="border-light-blue/30 text-dark-light-blue rounded-lg border border-dashed px-4 py-12 text-center"
		>
			Aucun budget sur cette année. Créez une racine, puis ses feuilles.
		</p>
	{:else}
		<ul class="space-y-1">
			{#each visible as node (node.id)}
				<li>
					<div
						style="margin-left: {node.depth * 1.5}rem"
						class="border-light-blue/20 bg-blue-gray/15 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
					>
						<span class="font-medium {node.archivedAt ? 'text-dark-light-blue/70' : 'text-white'}"
							>{node.name}</span
						>
						{#if node.isDefault}
							<span
								class="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-sky-500/30"
								>défaut</span
							>
						{/if}
						{#if node.archivedAt}
							<span class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
								>archivé</span
							>
						{/if}
						{#each node.projects as project (project)}
							<span class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
								>{project}</span
							>
						{/each}

						<span class="ml-auto text-right">
							<span class="text-dark-light-blue">{euro.format(node.allocatedTtc)}</span>
							<span class="text-dark-light-blue/70"> alloués · </span>
							<span class="text-dark-light-blue">{euro.format(node.consumedTtc)}</span>
							<span class="text-dark-light-blue/70"> consommés · </span>
							<span
								class={node.remainingTtc < 0 ? 'font-medium text-rose-300' : 'text-dark-light-blue'}
								>{euro.format(node.remainingTtc)}</span
							>
							<span class="text-dark-light-blue/70"> restants</span>
						</span>
					</div>

					<div
						style="margin-left: {node.depth * 1.5 + 1}rem"
						class="mt-1 mb-2 flex flex-wrap items-center gap-2"
					>
						<button
							class="text-dark-light-blue hover:text-light-blue text-xs underline"
							onclick={() => (editing = editing === node.id ? null : node.id)}
							type="button">modifier</button
						>
						{#if node.amountTtc === null && !node.archivedAt}
							<button
								class="text-dark-light-blue hover:text-light-blue text-xs underline"
								onclick={() => (creatingUnder = creatingUnder === node.id ? undefined : node.id)}
								type="button">ajouter dessous</button
							>
						{/if}
						{#if node.isLeaf && !node.archivedAt}
							<form action="?/split" method="POST" use:enhance>
								<input name="id" type="hidden" value={node.id} />
								<button
									class="text-dark-light-blue hover:text-light-blue text-xs underline"
									title="Crée {node.name}_default sous ce budget, qui reprend son montant et ses dépenses."
									type="submit">transformer en parent</button
								>
							</form>
						{/if}
						{#if node.isLeaf && !node.isDefault && !node.archivedAt}
							<form action="?/setDefault" method="POST" use:enhance>
								<input name="id" type="hidden" value={node.id} />
								<input name="parent_id" type="hidden" value={node.parentId ?? ''} />
								<button
									class="text-dark-light-blue hover:text-light-blue text-xs underline"
									type="submit">marquer par défaut</button
								>
							</form>
						{/if}
						{#if node.archivedAt}
							<form action="?/restore" method="POST" use:enhance>
								<input name="id" type="hidden" value={node.id} />
								<button
									class="text-dark-light-blue hover:text-light-blue text-xs underline"
									type="submit">réactiver</button
								>
							</form>
						{:else}
							<form action="?/archive" method="POST" use:enhance>
								<input name="id" type="hidden" value={node.id} />
								<button
									class="text-dark-light-blue hover:text-light-blue text-xs underline"
									type="submit">archiver</button
								>
							</form>
						{/if}
						<form action="?/remove" method="POST" use:enhance>
							<input name="id" type="hidden" value={node.id} />
							<button class="text-xs text-rose-400 underline hover:text-rose-200" type="submit"
								>supprimer</button
							>
						</form>
					</div>

					{#if editing === node.id}
						<div style="margin-left: {node.depth * 1.5 + 1}rem">
							{@render budgetForm(node.parentId, node)}
						</div>
					{/if}
					{#if creatingUnder === node.id}
						<div style="margin-left: {(node.depth + 1) * 1.5}rem">
							{@render budgetForm(node.id, null)}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
