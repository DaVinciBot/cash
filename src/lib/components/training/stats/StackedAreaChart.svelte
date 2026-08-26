<script lang="ts">
	// Aires empilées du tableau croisé : la composition de l'offre, période après
	// période.
	//
	// Chart.js n'a pas de contrôleur « aire » : une aire, c'est une courbe
	// remplie sur un axe empilé. La variante à cent pour cent, elle, arrive déjà
	// normalisée du serveur — la bibliothèque ne sait pas empiler en pourcentage.
	import { browser } from '$app/environment';
	import {
		chartOptions,
		chartPalette,
		countFormat,
		percentFormat,
		registerChartJs
	} from '$lib/components/charts/chartjs';
	import type { Series } from '$lib/helpers/trainingStatsTypes';
	import { Line } from 'svelte-chartjs';

	interface Props {
		labels: string[];
		series: Series[];
		/** Séries déjà exprimées en pourcentage : l'axe se borne alors à cent. */
		normalized?: boolean;
		height?: string;
	}

	let { labels, series, normalized = false, height = '18rem' }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? chartPalette() : null);

	const data = $derived({
		labels,
		datasets: series.map((item, index) => {
			const color = theme?.series[index % theme.series.length];
			return {
				label: item.label,
				data: item.values,
				borderColor: color,
				backgroundColor: color,
				fill: true,
				tension: 0.25,
				pointRadius: 0,
				pointHoverRadius: 4,
				borderWidth: 1
			};
		})
	});

	const options = $derived(
		theme
			? chartOptions<'line'>(theme, {
					format: normalized ? percentFormat : countFormat,
					stacked: true,
					range: normalized ? { min: 0, max: 100 } : undefined
				})
			: {}
	);
</script>

<div style="height: {height}">
	{#if browser}
		<Line {data} {options} />
	{/if}
</div>
