<script lang="ts">
	import { resolve } from '$app/paths';
	import CampusBadge from '#lib/components/cash/CampusBadge.svelte';
	import ItemStateBadge from '#lib/components/cash/ItemStateBadge.svelte';
	import { ITEM_STATE_BADGES, ITEM_STATES, type ItemState } from '#lib/types/domain.js';
	import { Button, Checkbox, FilterChip } from '@davincibot/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	let showArchived = $state(false);

	/** Filtre d'état propre à chaque projet : un CDP de deux projets ne trie pas les deux d'un coup. */
	const stateFilters = $state<Record<number, ItemState | 'all'>>({});

	const hasArchived = $derived(
		data.projects.some((project) => project.tree.some((node) => node.archivedAt))
	);

	/**
	 * Part du budget déjà mobilisée, engagée ET demandée.
	 *
	 * La jauge suit la même lecture que l'indicateur de saisie (CMD-F-06) : ce
	 * qui est demandé mais pas encore imputé compte, sinon l'alerte n'arrive
	 * qu'une fois la commande passée, c'est-à-dire trop tard.
	 */
	function usedRatio(allocated: number, consumed: number, requested: number) {
		if (allocated <= 0) {
			return consumed + requested > 0 ? 1 : 0;
		}
		return Math.min((consumed + requested) / allocated, 1);
	}
</script>

<svelte:head><title>Mon projet — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Mon projet</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Le budget des projets auxquels vous êtes rattaché, découpé comme le trésorier l'a découpé, et
			les commandes de tous leurs membres avec leur état. Consultation seule : le montant d'une
			feuille et la forme de l'arbre se changent en trésorerie.
		</p>
	</header>

	<div class="mb-4 flex flex-wrap items-center gap-4">
		{#if data.schoolYears.length > 1}
			<form method="GET">
				<label class="text-dark-light-blue text-xs">
					Année scolaire
					<select
						name="year"
						class="border-rule-strong bg-dark-blue/60 text-light-blue focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2"
						onchange={(event) => event.currentTarget.form?.requestSubmit()}
						value={data.schoolYearId ?? ''}
					>
						{#each data.schoolYears as year (year.id)}
							<option value={year.id}>{year.label}{year.closedAt ? ' (close)' : ''}</option>
						{/each}
					</select>
				</label>
			</form>
		{/if}
		{#if hasArchived}
			<label class="text-dark-light-blue mt-4 flex items-center gap-2 text-sm">
				<Checkbox className="size-4" bind:checked={showArchived} />
				Afficher les sous-budgets archivés
			</label>
		{/if}
	</div>

	{#if data.projects.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucun projet ne vous est rattaché. Le rattachement est posé par le responsable projets.
		</p>
	{/if}

	<div class="space-y-6">
		{#each data.projects as project (project.projectId)}
			{@const budget = project.budget}
			{@const nodes = project.tree.filter((node) => showArchived || !node.archivedAt)}
			<article class="border-rule bg-dark-blue/40 rounded-xl border p-5">
				<header class="mb-4 flex flex-wrap items-baseline gap-3">
					<h2 class="text-lg font-semibold text-white">{project.projectName}</h2>
					{#if project.campus}
						<CampusBadge campus={project.campus} />
					{/if}
					{#if budget}
						<span class="text-dark-light-blue/70 text-sm">sur le budget {budget.name}</span>
					{/if}
				</header>

				{#if project.budgetReadable}
					{#if budget === null}
						<p class="text-dark-light-blue mb-5 text-sm">
							Aucun budget n'est désigné pour ce projet sur cette année. Le rattachement à l'arbre
							est redésigné à chaque rentrée : demandez-le au trésorier avant votre première
							commande.
						</p>
					{:else}
						{@const overrun = budget.remainingTtc < 0}
						<div class="bg-dark-blue/80 h-2 w-full overflow-hidden rounded-full">
							<div
								style="width: {usedRatio(
									budget.allocatedTtc,
									budget.consumedTtc,
									budget.requestedTtc
								) * 100}%"
								class="h-full rounded-full {overrun ? 'bg-red-400' : 'bg-light-blue'}"
							></div>
						</div>

						<dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
							<div>
								<dt class="text-dark-light-blue/70 text-xs">Alloué</dt>
								<dd class="text-light-blue font-medium">{euro.format(budget.allocatedTtc)}</dd>
							</div>
							<div>
								<dt class="text-dark-light-blue/70 text-xs">Engagé</dt>
								<dd class="text-light-blue font-medium">{euro.format(budget.consumedTtc)}</dd>
							</div>
							<div>
								<dt class="text-dark-light-blue/70 text-xs">Demandé, non imputé</dt>
								<dd class="text-light-blue font-medium">{euro.format(budget.requestedTtc)}</dd>
							</div>
							<div>
								<dt class="text-dark-light-blue/70 text-xs">Restant</dt>
								<dd class="font-medium {overrun ? 'text-red-300' : 'text-emerald-300'}">
									{euro.format(budget.remainingTtc)}
								</dd>
							</div>
						</dl>

						{#if overrun}
							<p class="mt-3 text-sm text-red-300">
								Budget dépassé de {euro.format(-budget.remainingTtc)}. Le dépassement ne bloque
								aucune commande, mais le trésorier le voit aussi.
							</p>
						{/if}

						<!-- Le découpage, et non le seul total : c'est là que se lit où part l'argent. -->
						{#if nodes.length > 1}
							<h3 class="text-dark-light-blue mt-6 mb-2 text-sm font-semibold">
								Découpage du budget
							</h3>
							<ul class="space-y-1">
								{#each nodes as node (node.id)}
									<li
										style="margin-left: {node.depth * 1.5}rem"
										class="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm {node.depth ===
										0
											? 'border-rule-strong bg-blue-gray/25'
											: 'border-rule bg-blue-gray/15'}"
									>
										<span
											class="font-medium {node.archivedAt
												? 'text-dark-light-blue/70'
												: 'text-white'}">{node.name}</span
										>
										{#if node.depth === 0}
											<span
												class="text-light-blue ring-rule-strong rounded-full bg-sky-500/10 px-2 py-0.5 text-xs ring-1"
												>budget du projet</span
											>
										{/if}
										{#if node.isDefault}
											<span
												class="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-sky-500/30"
												title="Les items du projet sont imputés ici par défaut."
												>imputation par défaut</span
											>
										{/if}
										{#if node.archivedAt}
											<span
												class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
												>archivé</span
											>
										{/if}
										{#each node.projects.filter((name) => name !== project.projectName) as name (name)}
											<span
												class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
												title="Ce sous-budget est aussi visé par un autre projet.">{name}</span
											>
										{/each}

										<span class="ml-auto text-right">
											<span class="text-dark-light-blue">{euro.format(node.allocatedTtc)}</span>
											<span class="text-dark-light-blue/70"> alloués · </span>
											<span class="text-light-blue font-medium"
												>{euro.format(node.consumedTtc)}</span
											>
											<span class="text-dark-light-blue/70"> consommés · </span>
											<span
												class={node.remainingTtc < 0
													? 'font-medium text-red-400'
													: 'text-dark-light-blue'}>{euro.format(node.remainingTtc)}</span
											>
											<span class="text-dark-light-blue/70"> restants</span>
										</span>
									</li>
								{/each}
							</ul>
						{:else if nodes.length === 1}
							<p class="text-dark-light-blue/70 mt-6 text-sm">
								Ce budget n'est pas subdivisé : tout ce que le projet dépense s'impute sur
								{budget.name}.
							</p>
						{:else}
							<!-- Un budget appartient à une année (TRESO-F-03) : le projet pointe encore
							     celui d'un exercice précédent, et rien de cette année ne s'y imputera. -->
							<p class="mt-6 text-sm text-amber-300">
								{budget.name} n'appartient pas à l'année affichée. Demandez au trésorier de redésigner
								le budget du projet pour cette rentrée.
							</p>
						{/if}
					{/if}
				{/if}

				{#if project.stats}
					{@const stats = project.stats}
					<h3 class="text-dark-light-blue mt-6 mb-2 text-sm font-semibold">Items de l'année</h3>
					<dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
						<div>
							<dt class="text-dark-light-blue/70 text-xs">Demandé</dt>
							<dd class="text-light-blue font-medium">{euro.format(stats.requestedTtc)}</dd>
						</div>
						<div>
							<dt class="text-dark-light-blue/70 text-xs">Engagé</dt>
							<dd class="text-light-blue font-medium">{euro.format(stats.committedTtc)}</dd>
						</div>
						<div>
							<dt class="text-dark-light-blue/70 text-xs">Reçu</dt>
							<dd class="text-light-blue font-medium">{euro.format(stats.receivedTtc)}</dd>
						</div>
						<div>
							<dt class="text-dark-light-blue/70 text-xs">Refusé</dt>
							<dd class="text-dark-light-blue font-medium">{euro.format(stats.refusedTtc)}</dd>
						</div>
						<div>
							<dt class="text-dark-light-blue/70 text-xs">Items</dt>
							<dd class="text-light-blue font-medium">{stats.itemCount}</dd>
						</div>
					</dl>
				{/if}

				{#if project.items}
					{@const items = project.items}
					{@const filter = stateFilters[project.projectId] ?? 'all'}
					{@const visible = items.filter((item) => filter === 'all' || item.state === filter)}
					<h3 class="text-dark-light-blue mt-6 mb-2 text-sm font-semibold">Commandes du projet</h3>
					{#if items.length === 0}
						<p class="text-dark-light-blue/70 text-sm">
							Aucune commande sur ce projet pour cette année.
						</p>
					{:else}
						<div class="mb-3 flex flex-wrap items-center gap-2">
							<FilterChip
								onclick={() => (stateFilters[project.projectId] = 'all')}
								pressed={filter === 'all'}
							>
								Toutes ({items.length})
							</FilterChip>
							{#each ITEM_STATES as state (state)}
								{@const count = items.filter((item) => item.state === state).length}
								{#if count > 0}
									<FilterChip
										onclick={() => (stateFilters[project.projectId] = state)}
										pressed={filter === state}
									>
										{ITEM_STATE_BADGES[state].label} ({count})
									</FilterChip>
								{/if}
							{/each}
						</div>
						<ul class="space-y-2">
							{#each visible as item (item.id)}
								<li
									class="border-rule bg-blue-gray/15 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
								>
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<span class="truncate font-medium text-white">{item.name}</span>
											<ItemStateBadge compact state={item.state} />
										</div>
										<p class="text-dark-light-blue mt-1 text-xs">
											{item.requesterName} · {item.quantity} × {euro.format(item.unitPriceTtc)} =
											<span class="text-light-blue font-medium">{euro.format(item.totalTtc)}</span>
											· demandé le {day.format(new Date(item.createdAt))}
										</p>
										{#if item.refusedReason}
											<p class="mt-1 text-xs text-red-300">Motif du refus : {item.refusedReason}</p>
										{/if}
									</div>
									<Button
										href={resolve('/items/[id]', { id: String(item.id) })}
										size="sm"
										variant="secondary"
									>
										Détail
									</Button>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</article>
		{/each}
	</div>
</section>
