<script lang="ts">
	// Le tableau croisé : combien de formations par tranche de N jours, et dans
	// quelle catégorie. Les colonnes suivent les catégories réellement
	// rencontrées sur la plage — ouvrir une colonne vide pour chaque catégorie du
	// référentiel noierait celles qui portent des chiffres.
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
	import type { PivotTable } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		table: PivotTable;
	}

	let { table }: Props = $props();

	const columns = $derived(table.categories.length + 2);
</script>

<div class={SCROLLER}>
	<table class={TABLE}>
		<thead>
			<tr>
				<th class={HEAD_CELL} scope="col">Période</th>
				{#each table.categories as category (category.value)}
					<th class={HEAD_CELL_NUMBER} scope="col">{category.label}</th>
				{/each}
				<th class={HEAD_CELL_NUMBER} scope="col">Total</th>
			</tr>
		</thead>
		<tbody>
			{#each table.rows as row (row.key)}
				<tr>
					<th class={CELL_LABEL} scope="row">{row.label}</th>
					{#each row.counts as count, index (table.categories[index]?.value ?? index)}
						<td class={CELL_NUMBER}>{count === 0 ? '' : count}</td>
					{/each}
					<td class={CELL_NUMBER}>{row.total}</td>
				</tr>
			{:else}
				<tr>
					<td class={EMPTY} colspan={columns}>Aucune période dans la plage choisie.</td>
				</tr>
			{/each}
		</tbody>
		{#if table.rows.length > 0}
			<tfoot>
				<tr>
					<th class={TOTAL_CELL} scope="row">Total général</th>
					{#each table.totals.counts as count, index (table.categories[index]?.value ?? index)}
						<td class={TOTAL_CELL_NUMBER}>{count}</td>
					{/each}
					<td class={TOTAL_CELL_NUMBER}>{table.totals.total}</td>
				</tr>
			</tfoot>
		{/if}
	</table>
</div>
