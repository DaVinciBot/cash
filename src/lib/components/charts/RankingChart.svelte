<script lang="ts">
	// Classement — barres horizontales.
	//
	// Horizontales et non verticales : les libellés sont des noms de projet, de
	// marchand ou de formateur·rice, longs et de longueurs inégales. À la
	// verticale, ils se chevauchent ou basculent en biais, et le graphique devient
	// un exercice de lecture.
	import { browser } from '$app/environment';
	import { Bar } from 'svelte-chartjs';
	import { chartOptions, chartPalette, registerChartJs, type ValueFormat } from './chartjs';

	interface Props {
		rows: { label: string; value: number }[];
		seriesLabel: string;
		/** Ce que mesure le classement : une somme, un décompte, un pourcentage. */
		format: ValueFormat;
		/** Au-delà, la traîne est agrégée sous « autres » plutôt que tronquée. */
		max?: number;
	}

	let { rows, seriesLabel, format, max = 8 }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? chartPalette() : null);

	const shown = $derived.by(() => {
		const sorted = [...rows].sort((a, b) => b.value - a.value);
		if (sorted.length <= max) {
			return sorted;
		}
		const head = sorted.slice(0, max);
		const rest = sorted.slice(max).reduce((sum, r) => sum + r.value, 0);
		return rest > 0 ? [...head, { label: 'autres', value: rest }] : head;
	});

	// La hauteur suit le nombre de lignes : figée, elle écraserait trois barres et
	// en tasserait douze.
	const height = $derived(`${String(Math.max(6, shown.length * 2.1 + 1.5))}rem`);

	const data = $derived({
		labels: shown.map((r) => r.label),
		datasets: [
			{
				label: seriesLabel,
				data: shown.map((r) => r.value),
				backgroundColor: theme?.series[0],
				hoverBackgroundColor: theme?.highlight,
				borderRadius: 3,
				maxBarThickness: 22
			}
		]
	});

	const options = $derived(
		theme ? chartOptions<'bar'>(theme, { format, valueAxis: 'x', legend: false }) : {}
	);
</script>

<div style="height: {height}">
	{#if browser}
		<Bar {data} {options} />
	{:else}
		<!-- Sans JavaScript le canevas reste vide : la liste, elle, se lit. -->
		<ul class="space-y-1 text-xs text-gray-400">
			{#each shown as row (row.label)}
				<li class="flex justify-between gap-3">
					<span class="truncate">{row.label}</span>
					<span>{format.value(row.value)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
