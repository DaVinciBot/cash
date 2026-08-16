<script lang="ts">
	// Devis — il précède l'engagement : d'où la clause d'acceptation et la durée
	// de validité, à la place des conditions de règlement.
	import DocumentSheet from './DocumentSheet.svelte';
	import LinesTable from './helpers/LinesTable.svelte';
	import SignatureBlock from './helpers/SignatureBlock.svelte';
	import SubjectBlock from './helpers/SubjectBlock.svelte';
	import TotalsBlock from './helpers/TotalsBlock.svelte';
	import type { GeneratedDocument } from '$lib/server/reports';

	interface Props {
		doc: GeneratedDocument;
	}

	let { doc }: Props = $props();

	const issuer = $derived(doc.issuer);
	const total = $derived(
		doc.lines.length > 0
			? doc.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceTtc, 0)
			: doc.amountTtc
	);
</script>

<DocumentSheet {doc}>
	{#snippet body()}
		<section class="mt-8">
			<LinesTable lines={doc.lines} />
			<TotalsBlock footnote {total} />
		</section>

		{#if doc.subject}
			<SubjectBlock text={doc.subject} title="Informations complémentaires" />
		{/if}
	{/snippet}

	{#snippet footer()}
		<section class="mt-10 text-sm">
			<p class="text-dvb font-bold">Acceptation du devis</p>
			<p class="mt-1">
				Si ce devis vous convient, veuillez nous le retourner daté et signé dans le cadre
				ci-dessous, précédé de la mention «&nbsp;Lu et approuvé, bon pour accord&nbsp;».
			</p>
			<p class="mt-1 text-gray-600">Devis valable un mois à compter de sa date d'émission.</p>
		</section>

		<SignatureBlock slots={[{ role: 'Client', name: doc.recipientName }]} title="Bon pour accord" />

		<p class="mt-8 text-center text-xs text-gray-500 italic">
			{#if issuer?.vatNumber}
				N° TVA intracommunautaire : {issuer.vatNumber}
			{:else}
				* TVA non applicable, art. 293 B du Code général des impôts
			{/if}
		</p>
	{/snippet}
</DocumentSheet>
