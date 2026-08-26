<script lang="ts">
	// Deux séries comparées catégorie par catégorie — barres groupées.
	import { browser } from '$app/environment';
	import { Bar } from 'svelte-chartjs';
	import { chartOptions, chartPalette, registerChartJs, type ValueFormat } from './chartjs';

	interface Props {
		rows: { label: string; first: number; second: number }[];
		labels: [string, string];
		/** Ce que mesurent les barres : une somme, un décompte, un pourcentage. */
		format: ValueFormat;
		/**
		 * `signed` oppose ce qui entre à ce qui sort — la lecture est immédiate.
		 * `neutral` confronte deux mesures d'une même grandeur, un prévu et un
		 * réalisé : deux teintes de même poids, parce qu'il ne s'agit pas d'un bien
		 * et d'un mal.
		 */
		pair?: 'signed' | 'neutral';
		height?: string;
	}

	let { rows, labels, format, pair = 'signed', height = '14rem' }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? chartPalette() : null);

	const colors = $derived.by(() => {
		if (!theme) {
			return ['', ''];
		}
		return pair === 'signed' ? theme.signedPair : theme.neutralPair;
	});

	const data = $derived({
		labels: rows.map((r) => r.label),
		datasets: [
			{
				label: labels[0],
				data: rows.map((r) => r.first),
				backgroundColor: colors[0],
				borderRadius: 3,
				maxBarThickness: 28
			},
			{
				label: labels[1],
				data: rows.map((r) => r.second),
				backgroundColor: colors[1],
				borderRadius: 3,
				maxBarThickness: 28
			}
		]
	});

	const options = $derived(theme ? chartOptions<'bar'>(theme, { format }) : {});
</script>

<div style="height: {height}">
	{#if browser}
		<Bar {data} {options} />
	{/if}
</div>
