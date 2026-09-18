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

	const fileTitle = $derived(
		`${DOCUMENT_KIND_LABELS[doc.kind]} ${doc.number} — ${doc.recipientName}`
			.replace(/[\\/:*?"<>|]/g, '-')
			.slice(0, 120)
			.trim()
	);
</script>

<svelte:head>
	<title>{fileTitle}</title>
</svelte:head>

<!-- Barre d'action : elle n'existe qu'à l'écran, jamais sur le papier. -->
<div class="no-print mx-auto mb-4 flex max-w-[21cm] flex-wrap items-center gap-3">
	<a
		class="text-dark-light-blue hover:text-light-blue text-sm"
		href={resolve('/treasury/documents')}>← Documents</a
	>
	<!-- Le téléchargement passe par le serveur : lui seul peut imposer le nom du fichier.
       Le bouton d'impression reste pour qui veut sortir la pièce sur papier. -->
	<button
		class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 ml-auto rounded-lg border px-4 py-2 text-sm"
		onclick={() => {
			window.print();
		}}
		type="button">Imprimer</button
	>
	<a
		class="bg-light-blue text-dark-blue rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-white"
		href={resolve('/treasury/documents/[id]/pdf', { id: String(doc.id) })}
	>
		Télécharger le PDF
	</a>
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
