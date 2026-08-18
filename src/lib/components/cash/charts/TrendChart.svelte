<script lang="ts">
	// Série temporelle — courbe remplie.
	//
	// Une courbe et non des barres : la valeur suivie PASSE PAR ZÉRO et peut être
	// négative. Une barre proportionnelle au maximum ne sait pas représenter ça,
	// elle ne connaît que des longueurs positives.
	import { browser } from '$app/environment';
	import { Line } from 'svelte-chartjs';
	import { baseOptions, palette, registerChartJs } from './chartjs';

	interface Props {
		points: { label: string; value: number }[];
		seriesLabel?: string;
		height?: string;
	}

	let { points, seriesLabel = 'Solde cumulé', height = '14rem' }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? palette() : null);

	const data = $derived({
		labels: points.map((p) => p.label),
		datasets: [
			{
				label: seriesLabel,
				data: points.map((p) => p.value),
				borderColor: theme?.primary,
				// L'aplat vient du thème et non d'un alpha calculé : sur le fond nuit,
				// une transparence laisse voir la grille au travers de la courbe.
				backgroundColor: theme?.primarySoft,
				fill: true,
				tension: 0.3,
				pointRadius: 2,
				pointHoverRadius: 5,
				borderWidth: 2
			}
		]
	});

	const options = $derived.by(() => {
		if (!theme) {
			return {};
		}
		const base = baseOptions(theme);
		return { ...base, plugins: { ...(base.plugins as object), legend: { display: false } } };
	});
</script>

<div style="height: {height}">
	{#if browser}
		<Line {data} {options} />
	{/if}
</div>
