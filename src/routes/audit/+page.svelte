<script lang="ts">
	import { resolve } from '$app/paths';
	import HistoryTimeline from '$lib/components/cash/HistoryTimeline.svelte';
	import { CASH_ENTITY_LABELS, CASH_ERROR_MESSAGES, SOCLE_ENTITY_LABELS } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const TABS = [
		{ id: 'socle', label: 'Socle', hint: 'Permissions, rattachements, blog' },
		{ id: 'metier', label: 'Métier', hint: 'Commandes et trésorerie' },
		{ id: 'rejets', label: 'Écritures rejetées', hint: 'Ce que les règles ont refusé' }
	] as const;

	const entities = $derived(data.tab === 'socle' ? SOCLE_ENTITY_LABELS : CASH_ENTITY_LABELS);

	const entries = $derived(data.tab === 'socle' ? data.socle : data.business);

	// Les codes proposés au filtre sont ceux effectivement présents : offrir la
	// liste complète des DVBxx laisserait choisir des filtres qui ne rendent rien.
	const codes = $derived([...new Set(data.rejected.map((r) => r.sqlstate))].sort());

	const moment = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

	// `resolve` est appelé ici, une fois : les liens ci-dessous n'en sont que des
	// variantes de query string. La règle `no-navigation-without-resolve` ne sait
	// pas suivre l'appel à travers la fonction, d'où les exemptions ponctuelles.
	function tabHref(tab: string, params: Record<string, string> = {}): string {
		const query = new URLSearchParams({ tab, ...params });
		return `${resolve('/audit')}?${query.toString()}`;
	}
</script>

<svelte:head><title>Audit — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Audit</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Ce qui a changé, qui l'a changé, et ce que les règles ont refusé. L'historique d'une ligne
			précise, lui, se lit sur la ligne elle-même.
		</p>
	</header>

	<!-- eslint-disable svelte/no-navigation-without-resolve -- voir tabHref -->
	<nav class="mb-6 flex flex-wrap gap-2">
		{#each TABS as tab (tab.id)}
			<a
				class="cursor-pointer rounded-xl border px-3 py-2 text-sm transition-colors {data.tab ===
				tab.id
					? 'border-light-blue bg-light-blue text-dark-blue'
					: 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'}"
				href={tabHref(tab.id)}
				title={tab.hint}>{tab.label}</a
			>
		{/each}
	</nav>

	{#if data.tab === 'rejets'}
		<!-- TRANS-NF-52 — au premier chef les tentatives d'écriture sur une période
		     close : c'est le refus qu'on subit sans comprendre, et celui qu'on
		     vient chercher ici. -->
		<div class="mb-4 flex flex-wrap items-center gap-2">
			<a
				class="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {data.sqlstate
					? 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'
					: 'border-light-blue bg-light-blue text-dark-blue'}"
				href={tabHref('rejets')}>Tous ({data.rejected.length})</a
			>
			{#each codes as code (code)}
				<a
					class="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {data.sqlstate ===
					code
						? 'border-light-blue bg-light-blue text-dark-blue'
						: 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'}"
					href={tabHref('rejets', { code })}
					title={CASH_ERROR_MESSAGES[code] ?? ''}>{code}</a
				>
			{/each}
		</div>

		{#if data.rejected.length === 0}
			<p class="text-dark-light-blue/70 text-sm">Aucune écriture rejetée enregistrée.</p>
		{:else}
			<div class="ring-light-blue/20 overflow-x-auto rounded-lg ring-1">
				<table class="w-full min-w-3xl text-left text-sm">
					<thead class="bg-blue-gray/15 text-dark-light-blue text-xs uppercase">
						<tr>
							<th class="px-4 py-2">Quand</th>
							<th class="px-4 py-2">Code</th>
							<th class="px-4 py-2">Refus</th>
							<th class="px-4 py-2">Cible</th>
							<th class="px-4 py-2">Auteur</th>
						</tr>
					</thead>
					<tbody class="divide-light-blue/10 divide-y">
						{#each data.rejected as row (row.id)}
							<tr class="hover:bg-blue-gray/15">
								<td class="text-dark-light-blue px-4 py-2 text-xs whitespace-nowrap"
									>{moment.format(new Date(row.occurredAt))}</td
								>
								<td class="px-4 py-2">
									<span class="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-xs text-red-400"
										>{row.sqlstate}</span
									>
								</td>
								<td class="text-light-blue px-4 py-2">
									{CASH_ERROR_MESSAGES[row.sqlstate] ?? row.message}
								</td>
								<td class="text-dark-light-blue px-4 py-2 text-xs">
									{#if row.entityType}
										{CASH_ENTITY_LABELS[row.entityType] ?? row.entityType}
										{#if row.entityId}<span class="text-dark-light-blue/70">
												n° {row.entityId}</span
											>{/if}
									{:else}
										—
									{/if}
								</td>
								<td class="text-dark-light-blue px-4 py-2 text-xs"
									>{row.actorName ?? (row.actorId ? 'Compte supprimé' : 'Système')}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else}
		<div class="mb-4 flex flex-wrap items-center gap-2">
			<a
				class="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {data.entityType
					? 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'
					: 'border-light-blue bg-light-blue text-dark-blue'}"
				href={tabHref(data.tab)}>Tout</a
			>
			{#each Object.entries(entities) as [id, label] (id)}
				<a
					class="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {data.entityType ===
					id
						? 'border-light-blue bg-light-blue text-dark-blue'
						: 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'}"
					href={tabHref(data.tab, { entity: id })}>{label}</a
				>
			{/each}
		</div>

		{#if entries.length === 0}
			<p class="text-dark-light-blue/70 text-sm">Aucun mouvement enregistré.</p>
		{:else}
			<ul class="space-y-3">
				{#each entries as entry (entry.id)}
					<li class="bg-blue-gray/15 ring-light-blue/20 rounded-lg p-3 ring-1">
						<p class="text-dark-light-blue/70 mb-1 text-xs">
							{entities[entry.entityType] ?? entry.entityType}
							<span class="text-dark-light-blue/70">n° {entry.entityId}</span>
						</p>
						<HistoryTimeline entries={[entry]} title="" />
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</section>
