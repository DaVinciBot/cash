<script lang="ts">
	// Totaux calés à droite, comme dans les modèles.
	//
	// HT et TTC portent la MÊME valeur : l'association relève de la franchise en
	// base (art. 293 B), la TVA est donc nulle. Le schéma ne stocke qu'un montant,
	// et afficher deux colonnes identiques serait moins parlant que de nommer la
	// ligne « TVA 0 % » et de renvoyer à la mention légale.
	interface Props {
		total: number;
		/** L'astérisque ne renvoie à la mention de franchise que sur les pièces qui la portent. */
		footnote?: boolean;
	}

	let { total, footnote = false }: Props = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<div class="avoid-break mt-6 flex justify-end">
	<table class="text-sm">
		<tbody>
			<tr>
				<td class="py-1 pr-8 text-right">Total HT</td>
				<td class="py-1 text-right font-medium">{euro.format(total)}</td>
			</tr>
			<tr>
				<td class="py-1 pr-8 text-right"
					>TVA 0&nbsp;%{#if footnote}&nbsp;*{/if}</td
				>
				<td class="py-1 text-right font-medium">{euro.format(0)}</td>
			</tr>
			<tr class="border-dvb border-t-2">
				<td class="text-dvb py-2 pr-8 text-right font-bold">Total</td>
				<td class="py-2 text-right text-lg font-bold">{euro.format(total)}</td>
			</tr>
		</tbody>
	</table>
</div>
