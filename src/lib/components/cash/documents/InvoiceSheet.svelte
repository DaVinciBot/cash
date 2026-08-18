<script lang="ts">
	// Facture — la pièce qui réclame un paiement : elle porte donc les conditions
	// de règlement et les coordonnées bancaires, sans quoi le client ne sait pas
	// où payer.
	//
	// Elle porte aussi les mentions que la facturation électronique impose et que
	// les autres pièces n'ont pas : DEUX dates (l'émission et la réalisation),
	// la référence du bon de commande, le SIREN du client, et la nature de l'opération.
	import DocumentSheet from './DocumentSheet.svelte';
	import LinesTable from './helpers/LinesTable.svelte';
	import SubjectBlock from './helpers/SubjectBlock.svelte';
	import TotalsBlock from './helpers/TotalsBlock.svelte';
	import { INVOICE_OPERATION_LABELS, formatSiren } from '$lib/documents';
	import type { GeneratedDocument } from '$lib/server/reports';

	interface Props {
		doc: GeneratedDocument;
	}

	let { doc }: Props = $props();

	const issuer = $derived(doc.issuer);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
	const total = $derived(
		doc.lines.length > 0
			? doc.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceTtc, 0)
			: doc.amountTtc
	);
</script>

<DocumentSheet {doc} issuedLabel="Date d'émission">
	{#snippet meta()}
		<dl class="mt-1 text-sm text-gray-600">
			{#if doc.serviceOn}
				<div class="flex gap-1">
					<dt>Date de la prestation ou de la livraison&nbsp;:</dt>
					<dd>{day.format(new Date(doc.serviceOn))}</dd>
				</div>
			{/if}
			{#if doc.operationKind}
				<div class="flex gap-1">
					<dt>Nature de l'opération&nbsp;:</dt>
					<dd>{INVOICE_OPERATION_LABELS[doc.operationKind]}</dd>
				</div>
			{/if}
			{#if doc.purchaseOrder}
				<div class="flex gap-1">
					<dt>Bon de commande&nbsp;:</dt>
					<dd class="font-mono">{doc.purchaseOrder}</dd>
				</div>
			{/if}
		</dl>
	{/snippet}

	{#snippet recipientExtra()}
		{#if doc.recipientSiren}
			<p>SIREN {formatSiren(doc.recipientSiren)}</p>
		{/if}
	{/snippet}

	{#snippet body()}
		<section class="mt-8">
			<LinesTable lines={doc.lines} />
			<TotalsBlock footnote totalHt={total} totalTtc={total} vatLabel="TVA 0 %" />
		</section>

		{#if doc.subject}
			<SubjectBlock text={doc.subject} title="Informations complémentaires" />
		{/if}
	{/snippet}

	{#snippet footer()}
		<section class="mt-10 grid grid-cols-2 gap-10 text-sm">
			<div>
				<p class="text-dvb font-bold">Conditions et modalités de paiement</p>
				<p class="mt-1 leading-relaxed">
					Le paiement est dû dans <strong>30 jours</strong>. Tout retard entraînera une
					<strong>pénalité</strong>
					de <strong>10 %</strong> de la somme demandée, majorée de 1 % par semaine au-delà de ce délai,
					ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement. Aucun escompte pour paiement
					anticipé.
				</p>
			</div>
			{#if issuer?.iban}
				<div>
					{#if issuer.bankName}<p class="font-bold">{issuer.bankName}</p>{/if}
					<p><span class="font-bold">IBAN</span> {issuer.iban}</p>
					{#if issuer.bic}<p><span class="font-bold">BIC</span> {issuer.bic}</p>{/if}
				</div>
			{/if}
		</section>

		<p class="mt-8 text-center text-xs text-gray-500 italic">
			{#if issuer?.vatNumber}
				N° TVA intracommunautaire : {issuer.vatNumber}
			{:else}
				* TVA non applicable, art. 293 B du Code général des impôts
			{/if}
		</p>
	{/snippet}
</DocumentSheet>
