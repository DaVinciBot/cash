<script lang="ts">
	// Deux séries comparées catégorie par catégorie — barres groupées.
	import { browser } from '$app/environment';
	import { Bar } from 'svelte-chartjs';
	import { baseOptions, palette, registerChartJs } from './chartjs';

	type Tint = 'flow' | 'budget';

	interface Props {
		rows: { label: string; first: number; second: number }[];
		labels: [string, string];
		/**
		 * `flow` oppose recettes et dépenses — vert contre rouge, la lecture est
		 * immédiate. `budget` compare une enveloppe à sa consommation : deux teintes
		 * de la même famille, parce qu'il ne s'agit pas d'un bien et d'un mal.
		 */
		tint?: Tint;
		height?: string;
	}

	let { rows, labels, tint = 'flow', height = '14rem' }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? palette() : null);

	const couples = $derived.by(() => {
		if (!theme) {
			return ['', ''];
		}
		return tint === 'flow' ? [theme.credit, theme.debit] : [theme.primary, theme.secondary];
	});

	const data = $derived({
		labels: rows.map((r) => r.label),
		datasets: [
			{
				label: labels[0],
				data: rows.map((r) => r.first),
				backgroundColor: couples[0],
				borderRadius: 3,
				maxBarThickness: 28
			},
			{
				label: labels[1],
				data: rows.map((r) => r.second),
				backgroundColor: couples[1],
				borderRadius: 3,
				maxBarThickness: 28
			}
		]
	});

	const options = $derived(theme ? baseOptions(theme) : {});
</script>

<div style="height: {height}">
	{#if browser}
		<Bar {data} {options} />
	{/if}
</div>
