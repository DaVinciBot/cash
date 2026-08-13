<script lang="ts">
	// La page ne fait qu'aiguiller : chaque type de pièce a son composant.
	import { resolve } from '$app/paths';
	import ExpenseReportSheet from '$lib/components/cash/documents/ExpenseReportSheet.svelte';
	import InvoiceSheet from '$lib/components/cash/documents/InvoiceSheet.svelte';
	import QuoteSheet from '$lib/components/cash/documents/QuoteSheet.svelte';
	import TaxReceiptSheet from '$lib/components/cash/documents/TaxReceiptSheet.svelte';
	import { DOCUMENT_KIND_LABELS } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const doc = $derived(data.document);
</script>

<svelte:head>
	<title>{doc.number} — {DOCUMENT_KIND_LABELS[doc.kind]}</title>
</svelte:head>

<!-- Barre d'action : elle n'existe qu'à l'écran, jamais sur le papier. -->
<div class="no-print mx-auto mb-4 flex max-w-[21cm] flex-wrap items-center gap-3">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury/documents' as '/')}
		>← Documents</a
	>
	<button
		class="bg-primary-600 hover:bg-primary-800 ml-auto rounded-lg px-4 py-2 text-sm font-medium text-white"
		onclick={() => {
			window.print();
		}}
		type="button">Imprimer / Enregistrer en PDF</button
	>
</div>

{#if doc.kind === 'invoice'}
	<InvoiceSheet {doc} />
{:else if doc.kind === 'quote'}
	<QuoteSheet {doc} />
{:else if doc.kind === 'expense_report'}
	<ExpenseReportSheet {doc} />
{:else}
	<TaxReceiptSheet {doc} />
{/if}
