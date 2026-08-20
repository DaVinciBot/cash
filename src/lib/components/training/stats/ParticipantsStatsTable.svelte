<script lang="ts">
	// L'assiduité, personne par personne. La liste peut compter une centaine de
	// lignes : elle défile dans sa propre boîte plutôt que de repousser le reste
	// de la page hors de vue.
	import StatsTrendLegend from '$lib/components/training/stats/StatsTrendLegend.svelte';
	import {
		CELL_LABEL,
		cellNumber,
		EMPTY,
		HEAD_CELL,
		HEAD_CELL_NUMBER,
		TABLE,
		TOTAL_CELL,
		TOTAL_CELL_NUMBER
	} from '$lib/components/training/stats/statsTable';
	import { formatHours } from '$lib/helpers/trainingStatsFormat';
	import { compareToAverage } from '$lib/helpers/trainingStatsHighlight';
	import type { ParticipantRow } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		rows: ParticipantRow[];
	}

	let { rows }: Props = $props();

	// Le total compte les participations, pas les personnes : une même personne
	// venue trois fois pèse trois lignes de présence.
	const total = $derived(
		rows.reduce(
			(sum, row) => ({
				slots: sum.slots + row.slots,
				hours: Math.round((sum.hours + row.hours) * 100) / 100
			}),
			{ slots: 0, hours: 0 }
		)
	);

	const trends = $derived({
		slots: compareToAverage(rows.map((row) => row.slots)),
		hours: compareToAverage(rows.map((row) => row.hours))
	});
</script>

<div class="max-h-[28rem] overflow-auto rounded-lg border border-gray-700">
	<table class={TABLE}>
		<thead class="sticky top-0 bg-gray-800">
			<tr>
				<th class={HEAD_CELL} scope="col">Inscrit·e</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Nb de Fm</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Somme de durée</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, index (row.name)}
				<tr>
					<th class={CELL_LABEL} scope="row">{row.name}</th>
					<td class={cellNumber(trends.slots[index])}>{row.slots}</td>
					<td class={cellNumber(trends.hours[index])}>{formatHours(row.hours)}</td>
				</tr>
			{:else}
				<tr>
					<td class={EMPTY} colspan="3">Aucune inscription sur la période.</td>
				</tr>
			{/each}
		</tbody>
		{#if rows.length > 0}
			<tfoot>
				<tr>
					<th class={TOTAL_CELL} scope="row">Total général</th>
					<td class={TOTAL_CELL_NUMBER}>{total.slots}</td>
					<td class={TOTAL_CELL_NUMBER}>{formatHours(total.hours)}</td>
				</tr>
			</tfoot>
		{/if}
	</table>
</div>

{#if rows.length > 0}
	<StatsTrendLegend />
{/if}
