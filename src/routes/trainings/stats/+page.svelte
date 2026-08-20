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

<section class="mx-auto max-w-5xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/trainings')}
		>← Pilotage des formations</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Statistiques</h1>
		<p class="mt-1 text-sm text-gray-400">
			Formations tenues et inscriptions confirmées, {formatRangeLabel(data.range)}.
		</p>
	</header>

	<div class="mb-6"><StatsRangeForm range={data.range} /></div>

	{#if data.failed}
		<p
			class="mb-6 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			Impossible de lire les formations. Il manque probablement le droit de lecture sur les créneaux
			ou les inscriptions.
		</p>
	{:else if empty}
		<p
			class="mb-6 rounded-lg border border-dashed border-gray-600 px-4 py-8 text-center text-gray-400"
		>
			Aucune formation terminée sur cette plage : élargissez les dates pour voir des chiffres.
		</p>
	{/if}

	<StatsCard hint="Une ligne par semaine ISO, les semaines creuses comprises." title="Par semaine">
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
		boxed
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
		boxed
		hint="Le volume de formations, réparti par catégorie."
		title="Composition de l'offre"
	>
		<StackedAreaChart labels={periodLabels} series={data.stacked} />
	</StatsCard>

	<StatsCard
		boxed
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
</section>
