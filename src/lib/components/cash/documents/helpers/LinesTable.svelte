<script lang="ts">
	// Tableau des lignes — colonnes et ordre des modèles : la quantité vient en
	// premier, la désignation ensuite.
	import type { DocumentLine } from '$lib/server/reports';

	interface Props {
		lines: DocumentLine[];
	}

	let { lines }: Props = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

{#if lines.length > 0}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-dvb border-b-3 text-left">
				<th class="w-23 py-2 pr-5 text-right">Quantité</th>
				<th class="py-2 pl-5">Désignation</th>
				<th class="w-32 py-2 pr-2 text-right">Prix Unit. HT</th>
				<th class="w-32 py-2 pr-2 text-right">Montant HT</th>
			</tr>
		</thead>
		<tbody>
			{#each lines as line, i (i)}
				<tr class="border-b border-gray-300">
					<td class="py-2 pr-5 text-right">{line.quantity}</td>
					<td class="border-dvb border-l-3 py-2 pl-5">{line.label}</td>
					<td class="py-2 pr-2 text-right">{euro.format(line.unitPriceTtc)}</td>
					<td class="py-2 pr-2 text-right">{euro.format(line.quantity * line.unitPriceTtc)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	tbody tr:nth-child(odd) {
		background-color: #b3c2ff;
	}
	tbody tr td:first-child {
		background-color: white;
	}
</style>
