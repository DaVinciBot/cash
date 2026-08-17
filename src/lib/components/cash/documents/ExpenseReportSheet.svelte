<script lang="ts">
	// Note de frais — demande de remboursement INTERNE, pas une facture : elle ne
	// porte donc pas la mention de franchise en base, mais trois signatures. Une
	// dépense engage l'association, elle ne se rembourse pas sur la seule parole
	// du demandeur.
	import DocumentSheet from './DocumentSheet.svelte';
	import ExpenseLinesTable from './helpers/ExpenseLinesTable.svelte';
	import SignatureBlock from './helpers/SignatureBlock.svelte';
	import SubjectBlock from './helpers/SubjectBlock.svelte';
	import TotalsBlock from './helpers/TotalsBlock.svelte';
	import type { GeneratedDocument } from '$lib/server/reports';

	interface Props {
		doc: GeneratedDocument;
	}

	let { doc }: Props = $props();

	const round = (v: number) => Math.round(v * 100) / 100;
	const lines = $derived(doc.expenseLines);
	const totalHt = $derived(
		lines.length > 0 ? round(lines.reduce((sum, l) => sum + l.amountHt, 0)) : doc.amountTtc
	);
	const totalTtc = $derived(
		lines.length > 0 ? round(lines.reduce((sum, l) => sum + l.amountTtc, 0)) : doc.amountTtc
	);

	const SIGNATORIES = ['Président', 'Trésorier', 'Bénéficiaire'];

	// La consigne part dans une PROPRIÉTÉ et non dans du balisage : une entité
	// `&nbsp;` y arriverait telle quelle sur le papier, d'où les insécables
	// écrites en clair autour des guillemets.
	const SIGNATURE_HINT = 'suivi de la mention « lu et approuvé »';
</script>

<DocumentSheet {doc}>
	{#snippet recipientExtra()}
		{#if doc.beneficiaryIban}
			<p class="mt-2"><span class="font-bold">IBAN</span> {doc.beneficiaryIban}</p>
		{/if}
	{/snippet}

	{#snippet body()}
		<section class="mt-8">
			<ExpenseLinesTable {lines} />
			<TotalsBlock {totalHt} {totalTtc} />
		</section>

		{#if doc.subject}
			<SubjectBlock text={doc.subject} title="Description" />
		{/if}
	{/snippet}

	{#snippet footer()}
		<SignatureBlock hint={SIGNATURE_HINT} slots={SIGNATORIES.map((role) => ({ role }))} />
	{/snippet}
</DocumentSheet>
