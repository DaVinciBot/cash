<script lang="ts">
	// Le rythme hebdomadaire. Les semaines creuses restent affichées à zéro : une
	// semaine sans formation est une information, et la sauter décalerait la
	// lecture du calendrier.
	import {
		CELL_LABEL,
		CELL_NUMBER,
		EMPTY,
		HEAD_CELL,
		HEAD_CELL_NUMBER,
		SCROLLER,
		TABLE,
		TOTAL_CELL,
		TOTAL_CELL_NUMBER
	} from '$lib/components/training/stats/statsTable';
	import { formatHours } from '$lib/helpers/trainingStatsFormat';
	import type { StatsTotals, WeekRow } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		rows: WeekRow[];
		total: StatsTotals;
	}

	let { rows, total }: Props = $props();
</script>

<div class={SCROLLER}>
	<table class={TABLE}>
		<thead>
			<tr>
				<th class={HEAD_CELL} scope="col">Semaine</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Nb de formations</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Nb de formé·es</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Places proposées</th>
				<th class={HEAD_CELL_NUMBER} scope="col">Somme de durée</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				<tr>
					<th class={CELL_LABEL} scope="row">{row.label}</th>
					<td class={CELL_NUMBER}>{row.slots}</td>
					<td class={CELL_NUMBER}>{row.attendees}</td>
					<td class={CELL_NUMBER}>{row.seats}</td>
					<td class={CELL_NUMBER}>{formatHours(row.hours)}</td>
				</tr>
			{:else}
				<tr>
					<td class={EMPTY} colspan="5">Aucune semaine dans la plage choisie.</td>
				</tr>
			{/each}
		</tbody>
		{#if rows.length > 0}
			<tfoot>
				<tr>
					<th class={TOTAL_CELL} scope="row">Total général</th>
					<td class={TOTAL_CELL_NUMBER}>{total.slots}</td>
					<td class={TOTAL_CELL_NUMBER}>{total.attendees}</td>
					<td class={TOTAL_CELL_NUMBER}>{total.seats}</td>
					<td class={TOTAL_CELL_NUMBER}>{formatHours(total.hours)}</td>
				</tr>
			</tfoot>
		{/if}
	</table>
</div>
