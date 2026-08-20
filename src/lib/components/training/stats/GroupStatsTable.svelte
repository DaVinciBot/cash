<script lang="ts">
	// Le tableau à sept colonnes du classeur, servi tel quel par catégorie puis
	// par formateur·ice : seule change la colonne de gauche, d'où un composant
	// unique plutôt que deux tableaux jumeaux à maintenir en parallèle.
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
	import { formatDecimal, formatHours, formatRatio } from '$lib/helpers/trainingStatsFormat';
	import type { GroupRow, StatsTotals } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		rows: GroupRow[];
		total: StatsTotals;
		/** Ce que nomme la première colonne : « Catégorie », « Formateur·ice ». */
		headLabel: string;
	}

	let { rows, total, headLabel }: Props = $props();
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
			{#each rows as row (row.key)}
				<tr>
					<th class={CELL_LABEL} scope="row">{row.label}</th>
					<td class={CELL_NUMBER}>{row.slots}</td>
					<td class={CELL_NUMBER}>{formatHours(row.hours)}</td>
					<td class={CELL_NUMBER}>{row.attendees}</td>
					<td class={CELL_NUMBER}>{row.seats}</td>
					<td class={CELL_NUMBER}>{formatDecimal(row.average)}</td>
					<td class={CELL_NUMBER}>{formatRatio(row.fillRate)}</td>
					<td class={CELL_NUMBER}>{row.trainingTypes}</td>
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
