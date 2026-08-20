<script lang="ts">
	// Le rythme des formations, semaine par semaine.
	//
	// Quatre courbes sur un seul axe : effectifs, places et heures restent du
	// même ordre de grandeur d'une semaine à l'autre, et un second axe ferait
	// croire à des croisements qui n'existent pas.
	import { browser } from '$app/environment';
	import {
		baseOptions,
		countFormat,
		palette,
		registerChartJs
	} from '$lib/components/cash/charts/chartjs';
	import type { WeekRow } from '$lib/helpers/trainingStatsTypes';
	import { Line } from 'svelte-chartjs';

	interface Props {
		rows: WeekRow[];
		height?: string;
	}

	let { rows, height = '18rem' }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? palette() : null);

	const data = $derived.by(() => {
		const series = [
			{ label: 'Nb de formations', values: rows.map((row) => row.slots), color: theme?.slices[0] },
			{
				label: 'Nb de formé·es',
				values: rows.map((row) => row.attendees),
				color: theme?.slices[1]
			},
			{ label: 'Places proposées', values: rows.map((row) => row.seats), color: theme?.slices[2] },
			{ label: 'Somme de durée (h)', values: rows.map((row) => row.hours), color: theme?.slices[3] }
		];

		return {
			labels: rows.map((row) => row.label),
			datasets: series.map((item) => ({
				label: item.label,
				data: item.values,
				borderColor: item.color,
				backgroundColor: item.color,
				fill: false,
				tension: 0.3,
				pointRadius: 2,
				pointHoverRadius: 5,
				borderWidth: 2
			}))
		};
	});

	const options = $derived(theme ? baseOptions(theme, countFormat) : {});
</script>

<div style="height: {height}">
	{#if browser}
		<Line {data} {options} />
	{/if}
</div>
