<script lang="ts">
	// Classement — barres horizontales.
	//
	// Horizontales et non verticales : les libellés sont des noms de projet ou de
	// marchand, longs et de longueurs inégales. À la verticale, ils se
	// chevauchent ou basculent en biais, et le graphique devient un exercice de
	// lecture.
	import { browser } from '$app/environment';
	import { Bar } from 'svelte-chartjs';
	import { palette, registerChartJs } from './chartjs';

	interface Props {
		rows: { label: string; value: number }[];
		seriesLabel?: string;
		/** Au-delà, la traîne est agrégée sous « autres » plutôt que tronquée. */
		max?: number;
	}

	let { rows, seriesLabel = 'Montant', max = 8 }: Props = $props();

	if (browser) {
		registerChartJs();
	}

	const theme = $derived(browser ? palette() : null);

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

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const euroCompact = new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: 0
	});

	const data = $derived({
		labels: shown.map((r) => r.label),
		datasets: [
			{
				label: seriesLabel,
				data: shown.map((r) => r.value),
				backgroundColor: theme?.primary,
				hoverBackgroundColor: theme?.slices[3],
				borderRadius: 3,
				maxBarThickness: 22
			}
		]
	});

	const options = $derived.by(() => {
		if (!theme) {
			return {};
		}
		return {
			indexAxis: 'y' as const,
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: theme.surface,
					borderColor: theme.grid,
					borderWidth: 1,
					titleColor: theme.textStrong,
					bodyColor: theme.textStrong,
					padding: 10,
					callbacks: {
						// `parsed.x` est nullable côté Chart.js : une barre sans valeur
						// afficherait « 0,00 € » plutôt que de faire tomber l'infobulle.
						label: (ctx: { parsed: { x: number | null } }) => ` ${euro.format(ctx.parsed.x ?? 0)}`
					}
				}
			},
			scales: {
				x: {
					ticks: {
						color: theme.text,
						font: { size: 10 },
						callback: (v: number | string) => euroCompact.format(Number(v))
					},
					grid: { color: theme.grid },
					border: { display: false }
				},
				y: {
					ticks: { color: theme.textStrong, font: { size: 11 } },
					grid: { display: false },
					border: { color: theme.grid }
				}
			}
		};
	});
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
					<span>{euro.format(row.value)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
