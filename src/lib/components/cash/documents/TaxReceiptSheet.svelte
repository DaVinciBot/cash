<script lang="ts">
	// Reçu fiscal — Cerfa 11580. Les mentions ci-dessous sont celles que le
	// formulaire impose ; le montant en toutes lettres en fait partie, et c'est la
	// seule pièce qui le porte.
	import DocumentSheet from './DocumentSheet.svelte';
	import SignatureBlock from './helpers/SignatureBlock.svelte';
	import SubjectBlock from './helpers/SubjectBlock.svelte';
	import { officerTitle } from '$lib/documents';
	import { amountInWords } from '@davincibot/lib';
	import type { GeneratedDocument } from '$lib/server/reports';

	interface Props {
		doc: GeneratedDocument;
	}

	let { doc }: Props = $props();

	const issuer = $derived(doc.issuer);
	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
	const inWords = $derived(amountInWords(doc.amountTtc));
</script>

<DocumentSheet {doc}>
	{#snippet body()}
		<section class="avoid-break mt-8 border-t-2 border-black pt-4 text-sm leading-relaxed">
			<p class="text-dvb font-bold">
				Reçu au titre des dons à certains organismes d'intérêt général
			</p>
			<p class="mt-1 text-xs text-gray-600">
				Le bénéficiaire certifie sur l'honneur que les dons et versements qu'il reçoit ouvrent droit
				à la réduction d'impôt prévue à l'article 200 du Code Général des Impôts.
			</p>
			<p class="text-xs text-gray-600">
				Particulier : vous pouvez bénéficier d'une réduction d'impôt égale à 66 % du montant de
				votre don, dans la limite de 20 % de votre revenu imposable.
			</p>

			{#if issuer}
				<p class="mt-4">
					<span class="font-bold">{issuer.legalName} - {issuer.taxCategory}</span> est le bénéficiaire
				</p>
				<p class="mt-2 text-xs text-gray-600">
					<span class="font-semibold">Objet de l'association&nbsp;:</span>
					{issuer.purpose}
				</p>
			{/if}

			<p class="mt-4">
				Le bénéficiaire reconnaît avoir reçu, au titre des dons ouvrant droit à réduction d'impôt,
				la somme de&nbsp;:
			</p>
			<p class="mt-2 text-xl font-bold">{euro.format(doc.amountTtc)}</p>
			{#if inWords}
				<p class="text-sm text-gray-700 italic">({inWords})</p>
			{/if}
			<p class="mt-2">Date du versement&nbsp;: {day.format(new Date(doc.issuedOn))}</p>

			{#if doc.donation}
				<div class="mt-4 grid grid-cols-2 gap-4">
					<p><span class="font-semibold">Nature du don :</span> {doc.donation.nature}</p>
					<p><span class="font-semibold">Mode de versement :</span> {doc.donation.method}</p>
				</div>
			{/if}
		</section>

		{#if doc.subject}
			<SubjectBlock text={doc.subject} title="Informations complémentaires" />
		{/if}
	{/snippet}

	{#snippet footer()}
		{#if issuer}
			<SignatureBlock
				slots={[
					{
						role: officerTitle('president', issuer.presidentGender),
						name: issuer.presidentName
					}
				]}
				title="Signature"
			/>
		{/if}
	{/snippet}
</DocumentSheet>
