<script lang="ts">
	// Note de frais — demande de remboursement INTERNE, pas une facture : elle ne
	// porte donc pas la mention de franchise en base, mais trois signatures. Une
	// dépense engage l'association, elle ne se rembourse pas sur la seule parole
	// du demandeur.
	import DocumentSheet from './DocumentSheet.svelte';
    import SignatureBlock from './helpers/SignatureBlock.svelte';
	import LinesTable from './helpers/LinesTable.svelte';
	import SubjectBlock from './helpers/SubjectBlock.svelte';
	import TotalsBlock from './helpers/TotalsBlock.svelte';
	import type { GeneratedDocument } from '$lib/server/reports';

	interface Props {
		doc: GeneratedDocument;
	}

	let { doc }: Props = $props();

	const total = $derived(
		doc.lines.length > 0
			? doc.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceTtc, 0)
			: doc.amountTtc
	);

	const SIGNATORIES = ['Président', 'Trésorier', 'Bénéficiaire'];
</script>

<DocumentSheet {doc}>
	{#snippet body()}
		<section class="mt-8">
			<LinesTable lines={doc.lines} />
			<TotalsBlock {total} />
		</section>

		{#if doc.subject}
			<SubjectBlock text={doc.subject} title="Description" />
		{/if}

		{#if doc.beneficiaryIban}
			<section class="avoid-break mt-8 text-sm">
				<p class="text-dvb font-bold">Informations</p>
				<p class="mt-1"><span class="font-bold">IBAN</span> {doc.beneficiaryIban}</p>
			</section>
		{/if}
	{/snippet}

	{#snippet footer()}
		<SignatureBlock slots={SIGNATORIES.map((role) => ({ role }))} />
	{/snippet}
</DocumentSheet>
