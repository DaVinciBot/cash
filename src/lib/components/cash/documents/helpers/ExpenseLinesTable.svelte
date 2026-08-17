<script lang="ts">
	// Tableau des dépenses d'une note de frais — colonnes et ordre du modèle :
	// la date d'abord, puis la nature, puis les deux montants.
	//
	// La date de la dépense n'est pas décorative : c'est elle qui rattache le
	// justificatif à la note, et elle diffère toujours de la date d'émission.
	import type { ExpenseLine } from '$lib/server/reports';

	interface Props {
		lines: ExpenseLine[];
	}

	let { lines }: Props = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });
</script>

{#if lines.length > 0}
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr class="border-dvb border-b-3 text-left">
				<th class="w-24 py-2 pr-5 text-right">Date</th>
				<th class="py-2 pl-5">Type de dépense</th>
				<th class="w-32 py-2 pr-2 text-right">Montant HT</th>
				<th class="w-32 py-2 pr-2 text-right">Montant TTC</th>
			</tr>
		</thead>
		<tbody>
			{#each lines as line, i (i)}
				<tr class="border-b border-gray-300">
					<td class="py-2 pr-5 text-right">{day.format(new Date(line.occurredOn))}</td>
					<td class="border-dvb border-l-3 py-2 pl-5">{line.label}</td>
					<td class="py-2 pr-2 text-right">{euro.format(line.amountHt)}</td>
					<td class="py-2 pr-2 text-right">{euro.format(line.amountTtc)}</td>
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
