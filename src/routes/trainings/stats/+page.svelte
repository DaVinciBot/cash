<script lang="ts">
	import GroupStatsTable from '$lib/components/training/stats/GroupStatsTable.svelte';
	import ParticipantsStatsTable from '$lib/components/training/stats/ParticipantsStatsTable.svelte';
	import PivotStatsTable from '$lib/components/training/stats/PivotStatsTable.svelte';
	import StackedAreaChart from '$lib/components/training/stats/StackedAreaChart.svelte';
	import StatsCard from '$lib/components/training/stats/StatsCard.svelte';
	import StatsRangeForm from '$lib/components/training/stats/StatsRangeForm.svelte';
	import WeeklyStatsTable from '$lib/components/training/stats/WeeklyStatsTable.svelte';
	import WeeklyTrendChart from '$lib/components/training/stats/WeeklyTrendChart.svelte';
	import { formatRangeLabel } from '$lib/helpers/trainingStatsFormat';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const periodLabels = $derived(data.pivot.rows.map((row) => row.label));
	const empty = $derived(data.grandTotal.slots === 0);
</script>

<svelte:head><title>Statistiques des formations — DaVinciBot</title></svelte:head>

<section class="px-4 py-6 sm:px-6 sm:py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
		<header
			class="border-light-blue/15 bg-dark-blue/70 flex flex-col gap-5 rounded-[28px] border p-5 shadow-[0_20px_50px_rgba(1,7,32,0.35)] sm:p-6"
		>
			<div>
				<a class="text-light-blue/60 hover:text-light-blue text-sm" href={resolve('/trainings')}>
					← Pilotage des formations
				</a>
				<h1 class="mt-3 text-2xl font-bold text-white sm:text-3xl">Statistiques</h1>
				<p class="text-light-blue/70 mt-2 text-sm">
					Formations tenues et inscriptions confirmées, {formatRangeLabel(data.range)}.
				</p>
			</div>
			<StatsRangeForm range={data.range} />
		</header>

		{#if data.failed}
			<p class="text-waiting text-sm">
				Impossible de lire les formations. Il manque probablement le droit de lecture sur les
				créneaux ou les inscriptions.
			</p>
		{:else if empty}
			<p class="text-light-blue/60 text-sm">
				Aucune formation terminée sur cette plage : élargissez les dates pour voir des chiffres.
			</p>
		{/if}

		<StatsCard
			hint="Une ligne par semaine ISO, les semaines creuses comprises."
			title="Par semaine"
		>
			<WeeklyStatsTable rows={data.weeks} total={data.grandTotal} />
		</StatsCard>

		<StatsCard
			hint="Le remplissage rapporte les formé·es aux places proposées ; « — » quand aucune place n'était ouverte."
			title="Par catégorie"
		>
			<GroupStatsTable headLabel="Catégorie" rows={data.categories} total={data.grandTotal} />
		</StatsCard>

		<StatsCard hint="Les mêmes grandeurs, du côté de qui a formé." title="Par formateur·ice">
			<GroupStatsTable headLabel="Formateur·ice" rows={data.trainers} total={data.grandTotal} />
		</StatsCard>

		<StatsCard
			hint="Formations, formé·es, places et heures sur un même axe."
			title="Rythme hebdomadaire"
		>
			<WeeklyTrendChart rows={data.weeks} />
		</StatsCard>

		<StatsCard
			hint="Nombre de formations par tranche de {data.range
				.periodDays} jours, comptée depuis la date de début."
			title="Formations par période et par catégorie"
		>
			<PivotStatsTable table={data.pivot} />
		</StatsCard>

		<StatsCard
			hint="Le volume de formations, réparti par catégorie."
			title="Composition de l'offre"
		>
			<StackedAreaChart labels={periodLabels} series={data.stacked} />
		</StatsCard>

		<StatsCard
			hint="Les mêmes périodes ramenées à cent pour cent : ce qui se lit ici, c'est l'équilibre entre catégories, pas le volume."
			title="Composition de l'offre, en part"
		>
			<StackedAreaChart labels={periodLabels} normalized series={data.stackedPercent} />
		</StatsCard>

		<StatsCard
			hint="Une ligne par personne inscrite ; le total compte les participations, pas les personnes."
			title="Par participant·e"
		>
			<ParticipantsStatsTable rows={data.participants} />
		</StatsCard>
	</div>
</section>
