<script lang="ts">
	import { Button } from '@davincibot/components';
	import { resolve } from '$app/paths';
	import { euroFormat } from '$lib/components/charts/chartjs';
	import GroupedBarsChart from '$lib/components/charts/GroupedBarsChart.svelte';
	import RankingChart from '$lib/components/charts/RankingChart.svelte';
	import TrendChart from '$lib/components/charts/TrendChart.svelte';
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
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/treasury')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Rapports</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Les flux se lisent par exercice fiscal, les items et les budgets par année scolaire : les deux
			découpages ne se recouvrent pas, d'où deux sélecteurs.
		</p>
	</header>

	<form class="mb-6 flex flex-wrap items-end gap-3" method="GET">
		<label class="text-dark-light-blue text-xs">
			Exercice fiscal
			<select
				name="fy"
				class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
				value={data.fiscalYearId ?? ''}
			>
				{#each data.periods.fiscalYears as year (year.id)}
					<option value={year.id}>{year.label}</option>
				{/each}
			</select>
		</label>
		<label class="text-dark-light-blue text-xs">
			Année scolaire
			<select
				name="sy"
				class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
				value={data.schoolYearId ?? ''}
			>
				{#each data.periods.schoolYears as year (year.id)}
					<option value={year.id}>{year.label}</option>
				{/each}
			</select>
		</label>
		<Button size="sm" type="submit" variant="secondary">Afficher</Button>
	</form>

	<!-- TRESO-F-62 — rapport trimestriel -->
	{#if data.quarters}
		<div class="mb-8">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">
					Trimestres — exercice {data.quarters.label}
				</h2>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- route d'export, hors table de routage typée -->
				<Button
					href="/admin/treasury/reports/export?kind=quarterly&fy={data.fiscalYearId}"
					size="sm"
					variant="secondary">Exporter en CSV</Button
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>

			<div class="border-light-blue/20 overflow-x-auto rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-blue-gray/15 text-dark-light-blue text-left text-xs uppercase">
						<tr>
							<th class="px-4 py-2">Trimestre</th>
							<th class="px-4 py-2">Période</th>
							<th class="px-4 py-2 text-right">Recettes</th>
							<th class="px-4 py-2 text-right">Dépenses</th>
							<th class="px-4 py-2 text-right">Solde</th>
							<th class="px-4 py-2 text-right">Cumulé</th>
						</tr>
					</thead>
					<tbody class="divide-light-blue/10 divide-y">
						{#each data.quarters.quarters as q (q.label)}
							<tr>
								<td class="text-light-blue px-4 py-2 font-medium">{q.label}</td>
								<td class="text-dark-light-blue/70 px-4 py-2 text-xs">
									{day.format(new Date(q.from))} → {day.format(new Date(q.to))}
									{#if q.count > 0}· {q.count} mouvement(s){/if}
								</td>
								<td class="px-4 py-2 text-right text-emerald-300">{euro.format(q.credit)}</td>
								<td class="px-4 py-2 text-right text-red-400">{euro.format(q.debit)}</td>
								<td
									class="px-4 py-2 text-right {q.balance < 0 ? 'text-red-400' : 'text-light-blue'}"
									>{euro.format(q.balance)}</td
								>
								<td
									class="px-4 py-2 text-right font-medium {q.cumulative < 0
										? 'text-red-400'
										: 'text-light-blue'}">{euro.format(q.cumulative)}</td
								>
							</tr>
						{/each}
					</tbody>
					<tfoot class="border-light-blue/30 bg-blue-gray/15 border-t text-sm">
						<tr>
							<td class="text-light-blue px-4 py-2 font-semibold" colspan="2">Exercice</td>
							<td class="px-4 py-2 text-right text-emerald-300">{euro.format(yearTotal.credit)}</td>
							<td class="px-4 py-2 text-right text-red-400">{euro.format(yearTotal.debit)}</td>
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
			<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">Projets</h2>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- route d'export, hors table de routage typée -->
			<Button
				href="/admin/treasury/reports/export?kind=projects&sy={data.schoolYearId}"
				size="sm"
				variant="secondary">Exporter en CSV</Button
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>

		<p class="text-dark-light-blue/70 mb-3 text-xs">
			Trois colonnes qui ne disent pas la même chose : <strong>demandé</strong> est ce que les
			membres ont saisi, <strong>engagé</strong> ce qui est imputé sur un budget donc parti chez un
			fournisseur, <strong>reçu</strong> ce qui est arrivé.
		</p>

		{#if data.projects.length === 0}
			<p
				class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-8 text-center"
			>
				Aucun item sur cette année scolaire.
			</p>
		{:else}
			<div class="border-light-blue/20 overflow-x-auto rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-blue-gray/15 text-dark-light-blue text-left text-xs uppercase">
						<tr>
							<th class="px-4 py-2">Projet</th>
							<th class="px-4 py-2 text-right">Items</th>
							<th class="px-4 py-2 text-right">Demandé</th>
							<th class="px-4 py-2 text-right">Engagé</th>
							<th class="px-4 py-2 text-right">Reçu</th>
							<th class="px-4 py-2 text-right">Refusé</th>
						</tr>
					</thead>
					<tbody class="divide-light-blue/10 divide-y">
						{#each data.projects as p (p.projectId)}
							<tr>
								<td class="text-light-blue px-4 py-2">{p.projectName}</td>
								<td class="text-dark-light-blue px-4 py-2 text-right">{p.itemCount}</td>
								<td class="text-light-blue px-4 py-2 text-right">{euro.format(p.requestedTtc)}</td>
								<td class="text-light-blue px-4 py-2 text-right">{euro.format(p.committedTtc)}</td>
								<td class="px-4 py-2 text-right text-emerald-300">{euro.format(p.receivedTtc)}</td>
								<td class="text-dark-light-blue/70 px-4 py-2 text-right"
									>{euro.format(p.refusedTtc)}</td
								>
							</tr>
						{/each}
					</tbody>
					<tfoot class="border-light-blue/30 bg-blue-gray/15 border-t">
						<tr>
							<td class="text-light-blue px-4 py-2 font-semibold" colspan="2">Total</td>
							<td class="text-light-blue px-4 py-2 text-right font-semibold"
								>{euro.format(projectTotals.requested)}</td
							>
							<td class="text-light-blue px-4 py-2 text-right font-semibold"
								>{euro.format(projectTotals.committed)}</td
							>
							<td class="px-4 py-2 text-right font-semibold text-emerald-300"
								>{euro.format(projectTotals.received)}</td
							>
							<td class="text-dark-light-blue/70 px-4 py-2 text-right"
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
		<h2 class="text-dark-light-blue mb-3 text-sm font-semibold tracking-wide uppercase">
			Statistiques
		</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
				<h3 class="text-light-blue mb-3 text-sm font-medium">Solde cumulé, mois par mois</h3>
				<TrendChart
					format={euroFormat}
					points={data.charts.balanceByMonth}
					seriesLabel="Solde cumulé"
				/>
			</div>

			<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
				<h3 class="text-light-blue mb-3 text-sm font-medium">Recettes et dépenses par mois</h3>
				<GroupedBarsChart
					format={euroFormat}
					labels={['Recettes', 'Dépenses']}
					rows={data.charts.monthly.map((m) => ({
						label: m.label,
						first: m.credit,
						second: m.debit
					}))}
				/>
			</div>

			<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
				<h3 class="text-light-blue mb-3 text-sm font-medium">Budget par branche</h3>
				<GroupedBarsChart
					format={euroFormat}
					labels={['Alloué', 'Consommé']}
					pair="neutral"
					rows={data.charts.budgetRoots.map((b) => ({
						label: b.label,
						first: b.allocated,
						second: b.consumed
					}))}
				/>
			</div>

			<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
				<h3 class="text-light-blue mb-3 text-sm font-medium">Dépenses par projet</h3>
				<RankingChart format={euroFormat} rows={data.charts.byProject} seriesLabel="Engagé" />
			</div>

			<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5 md:col-span-2">
				<h3 class="text-light-blue mb-3 text-sm font-medium">Dépenses par marchand</h3>
				<p class="text-dark-light-blue/70 mb-3 text-xs">
					Le marchand est déduit du lien de chaque item, sans référentiel de fournisseurs.
				</p>
				<RankingChart format={euroFormat} rows={data.charts.byMerchant} seriesLabel="Engagé" />
			</div>
		</div>
	{/if}
</section>
