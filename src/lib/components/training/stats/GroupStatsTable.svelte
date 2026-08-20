<script lang="ts">
	import StatsTrendLegend from '$lib/components/training/stats/StatsTrendLegend.svelte';
	import {
		CELL_LABEL,
		cellNumber,
		EMPTY,
		HEAD_CELL,
		HEAD_CELL_NUMBER,
		SCROLLER,
		TABLE,
		TOTAL_CELL,
		TOTAL_CELL_NUMBER
	} from '$lib/components/training/stats/statsTable';
	import { formatDecimal, formatHours, formatRatio } from '$lib/helpers/trainingStatsFormat';
	import { compareToAverage } from '$lib/helpers/trainingStatsHighlight';
	import type { GroupRow, StatsTotals } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		rows: GroupRow[];
		total: StatsTotals;
		/** Ce que nomme la première colonne : « Catégorie », « Formateur·ice ». */
		headLabel: string;
	}

	let { rows, total, headLabel }: Props = $props();

	const trends = $derived({
		slots: compareToAverage(rows.map((row) => row.slots)),
		hours: compareToAverage(rows.map((row) => row.hours)),
		attendees: compareToAverage(rows.map((row) => row.attendees)),
		seats: compareToAverage(rows.map((row) => row.seats)),
		average: compareToAverage(rows.map((row) => row.average)),
		fillRate: compareToAverage(rows.map((row) => row.fillRate)),
		trainingTypes: compareToAverage(rows.map((row) => row.trainingTypes))
	});
</script>

<div class={SCROLLER}>
	<table class={TABLE}>
		<thead>
			<tr>
				<th class={HEAD_CELL} scope="col">{headLabel}</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Nb de Fm</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Durée</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Formé·es</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Places</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Moyenne</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Remplissage</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Types de Fm</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, index (row.key)}
				<tr>
					<th class={CELL_LABEL} scope="row">{row.label}</th>
					<td class={cellNumber(trends.slots[index])}>{row.slots}</td>
					<td class={cellNumber(trends.hours[index])}>{formatHours(row.hours)}</td>
					<td class={cellNumber(trends.attendees[index])}>{row.attendees}</td>
					<td class={cellNumber(trends.seats[index])}>{row.seats}</td>
					<td class={cellNumber(trends.average[index])}>{formatDecimal(row.average)}</td>
					<td class={cellNumber(trends.fillRate[index])}>{formatRatio(row.fillRate)}</td>
					<td class={cellNumber(trends.trainingTypes[index])}>{row.trainingTypes}</td>
				</tr>
			{:else}
				<tr>
					<td class={EMPTY} colspan="8">Aucune formation sur la période.</td>
				</tr>
			{/each}
		</tbody>
		{#if rows.length > 0}
			<tfoot>
				<tr>
					<th class={TOTAL_CELL} scope="row">Total général</th>
					<td class={TOTAL_CELL_NUMBER}>{total.slots}</td>
					<td class={TOTAL_CELL_NUMBER}>{formatHours(total.hours)}</td>
					<td class={TOTAL_CELL_NUMBER}>{total.attendees}</td>
					<td class={TOTAL_CELL_NUMBER}>{total.seats}</td>
					<td class={TOTAL_CELL_NUMBER}>{formatDecimal(total.average)}</td>
					<td class={TOTAL_CELL_NUMBER}>{formatRatio(total.fillRate)}</td>
					<td class={TOTAL_CELL_NUMBER}>{total.trainingTypes}</td>
				</tr>
			</tfoot>
		{/if}
	</table>
</div>

{#if rows.length > 0}
	<StatsTrendLegend />
{/if}
