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
		<p class="mt-1 text-sm text-gray-400">
			Ce qui a changé, qui l'a changé, et ce que les règles ont refusé. L'historique d'une ligne
			précise, lui, se lit sur la ligne elle-même.
		</p>
	</header>

	<!-- eslint-disable svelte/no-navigation-without-resolve -- voir tabHref -->
	<nav class="mb-6 flex flex-wrap gap-2">
		{#each TABS as tab (tab.id)}
			<a
				class="rounded-lg px-3 py-2 text-sm {data.tab === tab.id
					? 'bg-white text-gray-900'
					: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
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
				class="rounded-full px-3 py-1 text-xs font-medium {data.sqlstate
					? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
					: 'bg-white text-gray-900'}"
				href={tabHref('rejets')}>Tous ({data.rejected.length})</a
			>
			{#each codes as code (code)}
				<a
					class="rounded-full px-3 py-1 text-xs font-medium {data.sqlstate === code
						? 'bg-white text-gray-900'
						: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					href={tabHref('rejets', { code })}
					title={CASH_ERROR_MESSAGES[code] ?? ''}>{code}</a
				>
			{/each}
		</div>

		{#if data.rejected.length === 0}
			<p class="text-sm text-gray-500">Aucune écriture rejetée enregistrée.</p>
		{:else}
			<div class="overflow-x-auto rounded-lg ring-1 ring-gray-700">
				<table class="w-full min-w-3xl text-left text-sm">
					<thead class="bg-gray-800 text-xs text-gray-400 uppercase">
						<tr>
							<th class="px-4 py-2">Quand</th>
							<th class="px-4 py-2">Code</th>
							<th class="px-4 py-2">Refus</th>
							<th class="px-4 py-2">Cible</th>
							<th class="px-4 py-2">Auteur</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-700">
						{#each data.rejected as row (row.id)}
							<tr class="hover:bg-gray-800/50">
								<td class="px-4 py-2 text-xs whitespace-nowrap text-gray-400"
									>{moment.format(new Date(row.occurredAt))}</td
								>
								<td class="px-4 py-2">
									<span class="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-xs text-rose-300"
										>{row.sqlstate}</span
									>
								</td>
								<td class="px-4 py-2 text-gray-200">
									{CASH_ERROR_MESSAGES[row.sqlstate] ?? row.message}
								</td>
								<td class="px-4 py-2 text-xs text-gray-400">
									{#if row.entityType}
										{CASH_ENTITY_LABELS[row.entityType] ?? row.entityType}
										{#if row.entityId}<span class="text-gray-600"> n° {row.entityId}</span>{/if}
									{:else}
										—
									{/if}
								</td>
								<td class="px-4 py-2 text-xs text-gray-400"
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
				class="rounded-full px-3 py-1 text-xs font-medium {data.entityType
					? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
					: 'bg-white text-gray-900'}"
				href={tabHref(data.tab)}>Tout</a
			>
			{#each Object.entries(entities) as [id, label] (id)}
				<a
					class="rounded-full px-3 py-1 text-xs font-medium {data.entityType === id
						? 'bg-white text-gray-900'
						: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					href={tabHref(data.tab, { entity: id })}>{label}</a
				>
			{/each}
		</div>

		{#if entries.length === 0}
			<p class="text-sm text-gray-500">Aucun mouvement enregistré.</p>
		{:else}
			<ul class="space-y-3">
				{#each entries as entry (entry.id)}
					<li class="rounded-lg bg-gray-800/40 p-3 ring-1 ring-gray-700">
						<p class="mb-1 text-xs text-gray-500">
							{entities[entry.entityType] ?? entry.entityType}
							<span class="text-gray-600">n° {entry.entityId}</span>
						</p>
						<HistoryTimeline entries={[entry]} title="" />
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</section>
