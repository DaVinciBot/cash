<script lang="ts">
	// Le HT et le TTC sont donnés SÉPARÉMENT par l'appelant : sur une facture de
	// l'association ils coïncident (franchise en base, art. 293 B), mais une note
	// de frais rembourse des dépenses qui, elles, ont supporté de la TVA.

	interface Props {
		totalHt: number;
		totalTtc: number;
		/** L'astérisque ne renvoie à la mention de franchise que sur les pièces qui la portent. */
		footnote?: boolean;
		/**
		 * « TVA 0 % » quand le taux EST l'information (pièces sous franchise) ;
		 * « TVA » tout court quand c'est le montant qui parle.
		 */
		vatLabel?: string;
	}

	let { totalHt, totalTtc, footnote = false, vatLabel = 'TVA' }: Props = $props();

	const vat = $derived(Math.round((totalTtc - totalHt) * 100) / 100);
	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<div class="avoid-break mt-6 flex justify-end">
	<table class="text-sm">
		<tbody>
			<tr>
				<td class="py-1 pr-8 text-right">Total HT</td>
				<td class="py-1 text-right font-medium">{euro.format(totalHt)}</td>
			</tr>
			<tr>
				<td class="py-1 pr-8 text-right"
					>{vatLabel}{#if footnote}&nbsp;*{/if}</td
				>
				<td class="py-1 text-right font-medium">{euro.format(vat)}</td>
			</tr>
			<tr class="border-dvb border-t-2">
				<td class="text-dvb py-2 pr-8 text-right font-bold">Total TTC</td>
				<td class="py-2 text-right text-lg font-bold">{euro.format(totalTtc)}</td>
			</tr>
		</tbody>
	</table>
</div>
