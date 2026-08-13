<script lang="ts">
	import { resolve } from '$app/paths';
	import GroupedBarsChart from '$lib/components/cash/charts/GroupedBarsChart.svelte';
	import RankingChart from '$lib/components/cash/charts/RankingChart.svelte';
	import TrendChart from '$lib/components/cash/charts/TrendChart.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const yearTotal = $derived(
		(data.quarters?.quarters ?? []).reduce(
			(acc, q) => ({ credit: acc.credit + q.credit, debit: acc.debit + q.debit }),
			{ credit: 0, debit: 0 }
		)
	);

	const projectTotals = $derived(
		data.projects.reduce(
			(acc, p) => ({
				requested: acc.requested + p.requestedTtc,
				committed: acc.committed + p.committedTtc,
				received: acc.received + p.receivedTtc,
				refused: acc.refused + p.refusedTtc
			}),
			{ requested: 0, committed: 0, received: 0, refused: 0 }
		)
	);
</script>

<svelte:head><title>Rapports — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury' as '/')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Rapports</h1>
		<p class="mt-1 text-sm text-gray-400">
			Les flux se lisent par exercice fiscal, les items et les budgets par année scolaire : les deux
			découpages ne se recouvrent pas, d'où deux sélecteurs.
		</p>
	</header>

	<form class="mb-6 flex flex-wrap items-end gap-3" method="GET">
		<label class="text-xs text-gray-300">
			Exercice fiscal
			<select
				name="fy"
				class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
				value={data.fiscalYearId ?? ''}
			>
				{#each data.periods.fiscalYears as year (year.id)}
					<option value={year.id}>{year.label}</option>
				{/each}
			</select>
		</label>
		<label class="text-xs text-gray-300">
			Année scolaire
			<select
				name="sy"
				class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
				value={data.schoolYearId ?? ''}
			>
				{#each data.periods.schoolYears as year (year.id)}
					<option value={year.id}>{year.label}</option>
				{/each}
			</select>
		</label>
		<button
			class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
			type="submit">Afficher</button
		>
	</form>

	<!-- TRESO-F-62 — rapport trimestriel -->
	{#if data.quarters}
		<div class="mb-8">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
					Trimestres — exercice {data.quarters.label}
				</h2>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- route d'export, hors table de routage typée -->
				<a
					class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
					href="/admin/treasury/reports/export?kind=quarterly&fy={data.fiscalYearId}"
					>Exporter en CSV</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>

			<div class="overflow-x-auto rounded-lg border border-gray-700">
				<table class="w-full text-sm">
					<thead class="bg-gray-800 text-left text-xs text-gray-400 uppercase">
						<tr>
							<th class="px-4 py-2">Trimestre</th>
							<th class="px-4 py-2">Période</th>
							<th class="px-4 py-2 text-right">Recettes</th>
							<th class="px-4 py-2 text-right">Dépenses</th>
							<th class="px-4 py-2 text-right">Solde</th>
							<th class="px-4 py-2 text-right">Cumulé</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-700">
						{#each data.quarters.quarters as q (q.label)}
							<tr>
								<td class="px-4 py-2 font-medium text-gray-100">{q.label}</td>
								<td class="px-4 py-2 text-xs text-gray-500">
									{day.format(new Date(q.from))} → {day.format(new Date(q.to))}
									{#if q.count > 0}· {q.count} mouvement(s){/if}
								</td>
								<td class="px-4 py-2 text-right text-emerald-300">{euro.format(q.credit)}</td>
								<td class="px-4 py-2 text-right text-rose-300">{euro.format(q.debit)}</td>
								<td class="px-4 py-2 text-right {q.balance < 0 ? 'text-rose-300' : 'text-gray-200'}"
									>{euro.format(q.balance)}</td
								>
								<td
									class="px-4 py-2 text-right font-medium {q.cumulative < 0
										? 'text-rose-300'
										: 'text-gray-100'}">{euro.format(q.cumulative)}</td
								>
							</tr>
						{/each}
					</tbody>
					<tfoot class="border-t border-gray-600 bg-gray-800/60 text-sm">
						<tr>
							<td class="px-4 py-2 font-semibold text-gray-200" colspan="2">Exercice</td>
							<td class="px-4 py-2 text-right text-emerald-300">{euro.format(yearTotal.credit)}</td>
							<td class="px-4 py-2 text-right text-rose-300">{euro.format(yearTotal.debit)}</td>
							<td class="px-4 py-2 text-right font-semibold text-white" colspan="2"
								>{euro.format(yearTotal.credit - yearTotal.debit)}</td
							>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	{/if}

	<!-- TRESO-F-62 — rapport par projet -->
	<div class="mb-8">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">Projets</h2>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- route d'export, hors table de routage typée -->
			<a
				class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
				href="/admin/treasury/reports/export?kind=projects&sy={data.schoolYearId}"
				>Exporter en CSV</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>

		<p class="mb-3 text-xs text-gray-500">
			Trois colonnes qui ne disent pas la même chose : <strong>demandé</strong> est ce que les
			membres ont saisi, <strong>engagé</strong> ce qui est imputé sur un budget donc parti chez un
			fournisseur, <strong>reçu</strong> ce qui est arrivé.
		</p>

		{#if data.projects.length === 0}
			<p
				class="rounded-lg border border-dashed border-gray-600 px-4 py-8 text-center text-gray-400"
			>
				Aucun item sur cette année scolaire.
			</p>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-gray-700">
				<table class="w-full text-sm">
					<thead class="bg-gray-800 text-left text-xs text-gray-400 uppercase">
						<tr>
							<th class="px-4 py-2">Projet</th>
							<th class="px-4 py-2 text-right">Items</th>
							<th class="px-4 py-2 text-right">Demandé</th>
							<th class="px-4 py-2 text-right">Engagé</th>
							<th class="px-4 py-2 text-right">Reçu</th>
							<th class="px-4 py-2 text-right">Refusé</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-700">
						{#each data.projects as p (p.projectId)}
							<tr>
								<td class="px-4 py-2 text-gray-100">{p.projectName}</td>
								<td class="px-4 py-2 text-right text-gray-400">{p.itemCount}</td>
								<td class="px-4 py-2 text-right text-gray-200">{euro.format(p.requestedTtc)}</td>
								<td class="px-4 py-2 text-right text-gray-200">{euro.format(p.committedTtc)}</td>
								<td class="px-4 py-2 text-right text-emerald-300">{euro.format(p.receivedTtc)}</td>
								<td class="px-4 py-2 text-right text-gray-500">{euro.format(p.refusedTtc)}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot class="border-t border-gray-600 bg-gray-800/60">
						<tr>
							<td class="px-4 py-2 font-semibold text-gray-200" colspan="2">Total</td>
							<td class="px-4 py-2 text-right font-semibold text-gray-100"
								>{euro.format(projectTotals.requested)}</td
							>
							<td class="px-4 py-2 text-right font-semibold text-gray-100"
								>{euro.format(projectTotals.committed)}</td
							>
							<td class="px-4 py-2 text-right font-semibold text-emerald-300"
								>{euro.format(projectTotals.received)}</td
							>
							<td class="px-4 py-2 text-right text-gray-500"
								>{euro.format(projectTotals.refused)}</td
							>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</div>

	<!-- TRESO-F-50 — graphiques -->
	{#if data.charts}
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-gray-300 uppercase">Statistiques</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
				<h3 class="mb-3 text-sm font-medium text-gray-200">Solde cumulé, mois par mois</h3>
				<TrendChart points={data.charts.balanceByMonth} />
			</div>

			<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
				<h3 class="mb-3 text-sm font-medium text-gray-200">Recettes et dépenses par mois</h3>
				<GroupedBarsChart
					labels={['Recettes', 'Dépenses']}
					rows={data.charts.monthly.map((m) => ({
						label: m.label,
						first: m.credit,
						second: m.debit
					}))}
				/>
			</div>

			<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
				<h3 class="mb-3 text-sm font-medium text-gray-200">Budget par branche</h3>
				<GroupedBarsChart
					labels={['Alloué', 'Consommé']}
					rows={data.charts.budgetRoots.map((b) => ({
						label: b.label,
						first: b.allocated,
						second: b.consumed
					}))}
					tint="budget"
				/>
			</div>

			<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
				<h3 class="mb-3 text-sm font-medium text-gray-200">Dépenses par projet</h3>
				<RankingChart rows={data.charts.byProject} seriesLabel="Engagé" />
			</div>

			<div class="rounded-lg border border-gray-700 bg-gray-800 p-4 md:col-span-2">
				<h3 class="mb-3 text-sm font-medium text-gray-200">Dépenses par marchand</h3>
				<p class="mb-3 text-xs text-gray-500">
					Le marchand est déduit du lien de chaque item, sans référentiel de fournisseurs.
				</p>
				<RankingChart rows={data.charts.byMerchant} seriesLabel="Engagé" />
			</div>
		</div>
	{/if}
</section>
