<script lang="ts">
	// Aires empilées du tableau croisé : la composition de l'offre, période après
	// période.
	//
	// Chart.js n'a pas de contrôleur « aire » : une aire, c'est une courbe
	// remplie sur un axe empilé. La variante à cent pour cent, elle, arrive déjà
	// normalisée du serveur — la bibliothèque ne sait pas empiler en pourcentage.
	import { browser } from '$app/environment';
	import {
		baseOptions,
		countFormat,
		palette,
		percentFormat,
		registerChartJs
	} from '$lib/components/cash/charts/chartjs';
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

	const theme = $derived(browser ? palette() : null);

	const data = $derived({
		labels,
		datasets: series.map((item, index) => {
			const color = theme?.slices[index % theme.slices.length];
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

	const options = $derived.by(() => {
		if (!theme) {
			return {};
		}
		const base = baseOptions(theme, normalized ? percentFormat : countFormat);
		const scales = base.scales as { x: object; y: object };
		return {
			...base,
			scales: {
				...scales,
				y: { ...scales.y, stacked: true, ...(normalized ? { max: 100, min: 0 } : {}) }
			}
		};
	});
</script>

<div style="height: {height}">
	{#if browser}
		<Line {data} {options} />
	{/if}
</div>
