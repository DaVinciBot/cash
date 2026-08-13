<script lang="ts">
	// Feuille imprimable — reprend les modèles Word et LaTeX de l'association
	// (`template/`) : bandeau pleine largeur, intitulés de section en DVBlue,
	// tableau « Quantité · Désignation · Prix Unit. HT · Montant HT », totaux
	// HT / TVA / Total, et un pied de page propre à chaque type de pièce.
	//
	// HT et TTC portent ici la MÊME valeur : l'association relève de la franchise
	// en base (art. 293 B), la TVA est donc nulle. Le schéma ne stocke qu'un
	// montant, et afficher deux colonnes identiques serait moins parlant que de
	// nommer la ligne « TVA 0 % » et de renvoyer à la mention légale.
	import { resolve } from '$app/paths';
	import { DOCUMENT_KIND_LABELS, amountInWords } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const doc = $derived(data.document);
	const issuer = $derived(doc.issuer);

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

	const inWords = $derived(amountInWords(doc.amountTtc));
	const linesTotal = $derived(doc.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceTtc, 0));
	const sheetTotal = $derived(doc.lines.length > 0 ? linesTotal : doc.amountTtc);

	// Le destinataire ne porte pas le même nom selon la pièce — c'est le libellé
	// des modèles, et il dit la nature de la relation.
	const recipientLabel = $derived(
		{
			invoice: 'Facturé à',
			quote: 'Adressé à',
			expense_report: 'Pour',
			tax_receipt: 'Donateur'
		}[doc.kind]
	);

	// Facture et devis sont les seules pièces adressées à un tiers : elles seules
	// portent la mention de franchise en base.
	const commercial = $derived(doc.kind === 'invoice' || doc.kind === 'quote');

	const SIGNATORIES = ['Président', 'Trésorier', 'Bénéficiaire'];
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

<article class="sheet mx-auto max-w-[21cm] bg-white text-black shadow-lg">
	<!-- Bandeau : pleine largeur de la feuille, comme dans le modèle LaTeX. -->
	<img class="block w-full" alt="" src="/admin/banner-dvb.png" />

	<div class="px-[1.6cm] pt-2 pb-[1.4cm]">
		<header>
			<h1 class="text-dvb text-2xl font-bold tracking-wide uppercase">
				{DOCUMENT_KIND_LABELS[doc.kind]}
				<span class="font-mono text-xl">{doc.number}</span>
			</h1>
			<p class="mt-1 text-sm text-gray-600">{day.format(new Date(doc.issuedOn))}</p>
		</header>

		<!-- Destinataire à gauche, émetteur à droite : disposition des modèles. -->
		<section class="mt-8 flex items-start justify-between gap-10 text-sm leading-relaxed">
			<div>
				<p class="text-dvb font-bold">{recipientLabel}</p>
				<p class="font-bold">{doc.recipientName}</p>
				{#if doc.recipientAddress}
					<p class="whitespace-pre-line">{doc.recipientAddress}</p>
				{/if}
			</div>

			{#if issuer}
				<div class="text-right">
					<p class="text-dvb font-bold">De la part de</p>
					<p class="font-bold uppercase">{issuer.legalName}</p>
					<p>{issuer.addressLine}</p>
					<p>{issuer.postalCode} {issuer.city}</p>
					{#if issuer.country !== 'France'}<p>{issuer.country}</p>{/if}
					<p>Association loi 1901</p>
					{#if issuer.siret}<p>SIRET {issuer.siret}</p>{/if}
					{#if issuer.rna}<p>RNA {issuer.rna}</p>{/if}
					{#if issuer.vatNumber}<p>N° TVA {issuer.vatNumber}</p>{/if}
				</div>
			{/if}
		</section>

		{#if doc.kind === 'tax_receipt'}
			<!-- Cerfa 11580 : les mentions ci-dessous sont celles que le formulaire
			     impose. Le montant en toutes lettres en fait partie. -->
			<section class="avoid-break mt-8 border-t-2 border-black pt-4 text-sm leading-relaxed">
				<p class="text-dvb font-bold">
					Reçu au titre des dons à certains organismes d'intérêt général
				</p>
				<p class="mt-1 text-xs text-gray-600">
					Articles 200, 238 bis et 978 du code général des impôts (CGI)
				</p>

				{#if issuer}
					<p class="mt-4">
						Le bénéficiaire est&nbsp;: <span class="font-medium">{issuer.taxCategory}</span>
					</p>
					<p class="mt-1">
						Le don ouvre droit à réduction d'impôt au titre des
						<span class="font-medium">{issuer.taxArticles}</span>.
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
		{:else}
			<section class="mt-8">
				{#if doc.lines.length > 0}
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr class="border-b-2 border-black text-left">
								<th class="w-20 py-2 text-right">Quantité</th>
								<th class="py-2 pl-6">Désignation</th>
								<th class="w-32 py-2 text-right">Prix Unit. HT</th>
								<th class="w-32 py-2 text-right">Montant HT</th>
							</tr>
						</thead>
						<tbody>
							{#each doc.lines as line, i (i)}
								<tr class="border-b border-gray-300">
									<td class="py-2 text-right">{line.quantity}</td>
									<td class="py-2 pl-6">{line.label}</td>
									<td class="py-2 text-right">{euro.format(line.unitPriceTtc)}</td>
									<td class="py-2 text-right">
										{euro.format(line.quantity * line.unitPriceTtc)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}

				<!-- Bloc de totaux calé à droite, comme dans les modèles. -->
				<div class="avoid-break mt-6 flex justify-end">
					<table class="text-sm">
						<tbody>
							<tr>
								<td class="py-1 pr-8 text-right">Total HT</td>
								<td class="py-1 text-right font-medium">{euro.format(sheetTotal)}</td>
							</tr>
							<tr>
								<!-- L'astérisque ne renvoie à la mention de franchise que sur les
								     pièces qui la portent : sur une note de frais, il n'appellerait
								     rien. -->
								<td class="py-1 pr-8 text-right">
									TVA 0&nbsp;%{#if commercial}&nbsp;*{/if}
								</td>
								<td class="py-1 text-right font-medium">{euro.format(0)}</td>
							</tr>
							<tr class="border-t-2 border-black">
								<td class="text-dvb py-2 pr-8 text-right font-bold">Total</td>
								<td class="py-2 text-right text-lg font-bold">{euro.format(sheetTotal)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		{#if doc.subject}
			<section class="avoid-break mt-8 text-sm">
				<p class="text-dvb font-bold">
					{doc.kind === 'expense_report' ? 'Description' : 'Informations complémentaires'}
				</p>
				<p class="mt-1 whitespace-pre-line">{doc.subject}</p>
			</section>
		{/if}

		<!-- Pied de page : ce que chaque type de pièce doit porter. Le tout dans un
		     SEUL bloc insécable — laissée libre, la mention de franchise partait
		     seule sur une page de plus. -->
		<footer class="avoid-break">
			{#if doc.kind === 'invoice'}
				<section class="avoid-break mt-10 grid grid-cols-2 gap-10 text-sm">
					<div>
						<p class="text-dvb font-bold">Conditions et modalités de paiement</p>
						<p class="mt-1 leading-relaxed">
							Le paiement est dû dans <strong>30 jours</strong>. Tout retard entraînera une
							<strong>pénalité</strong>
							de <strong>10 %</strong> de la somme demandée, majorée de 1 % par semaine au-delà de ce délai,
							ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement. Aucun escompte pour
							paiement anticipé.
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
			{:else if doc.kind === 'quote'}
				<section class="avoid-break mt-10 text-sm">
					<p class="text-dvb font-bold">Acceptation du devis</p>
					<p class="mt-1">
						Si ce devis vous convient, veuillez nous le retourner signé, précédé de la mention
						«&nbsp;Lu et approuvé, bon pour accord&nbsp;».
					</p>
					<p class="mt-1 text-gray-600">Devis valable un mois à compter de sa date d'émission.</p>
				</section>
			{:else if doc.kind === 'expense_report'}
				{#if doc.beneficiaryIban}
					<section class="avoid-break mt-8 text-sm">
						<p class="text-dvb font-bold">Informations</p>
						<p class="mt-1"><span class="font-bold">IBAN</span> {doc.beneficiaryIban}</p>
					</section>
				{/if}
				<!-- Trois signatures : la dépense engage l'association, elle ne se
				     rembourse pas sur la seule parole du demandeur. -->
				<section class="avoid-break mt-10 text-sm">
					<p class="text-dvb font-bold">Signatures</p>
					<p class="text-xs text-gray-600">suivi de la mention «&nbsp;lu et approuvé&nbsp;»</p>
					<div class="mt-4 grid grid-cols-3 gap-8">
						{#each SIGNATORIES as role (role)}
							<div>
								<p class="font-medium">{role}</p>
								<div class="mt-12 border-t border-black"></div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#if doc.kind === 'tax_receipt' && issuer}
				<div class="mt-8 flex items-end justify-end text-sm">
					<div class="text-right">
						<p class="text-xs">{issuer.signatoryTitle}</p>
						<p class="font-medium">{issuer.signatoryName}</p>
						<div class="mt-10 w-48 border-t border-black"></div>
						<p class="mt-1 text-xs text-gray-600">Signature</p>
					</div>
				</div>
			{/if}

			<!-- Franchise en base : mention obligatoire sur ce que l'association ÉMET
			     vers un tiers. Une note de frais est une demande de remboursement
			     interne, pas une facture : elle n'a pas à la porter. -->
			{#if commercial}
				<p class="mt-8 text-center text-xs text-gray-500 italic">
					{#if issuer?.vatNumber}
						N° TVA intracommunautaire : {issuer.vatNumber}
					{:else}
						* TVA non applicable, art. 293 B du Code général des impôts
					{/if}
				</p>
			{/if}
		</footer>
	</div>
</article>

<style>
	/* Le document existe pour être imprimé : à l'impression, seule la feuille
	   subsiste — ni menu, ni barre d'action, ni ombre. */
	/* DVBlue du modèle LaTeX — RGB(9, 88, 239), soit le `primary-500` du thème.
	   En dur ici et non via une variable : la feuille est en noir sur blanc,
	   indépendante du thème sombre de l'application. */
	.text-dvb {
		color: #0958ef;
	}

	/* Les pages de SUITE prennent une marge haute et basse : sans elle, le
	   tableau reprend collé au bord du papier, dans la zone que la plupart des
	   imprimantes ne savent pas atteindre. La première page, elle, reste à fleur
	   pour que le bandeau touche les bords comme dans le modèle. */
	@page {
		size: A4;
		margin: 1.2cm 0;
	}

	@page :first {
		margin: 0;
	}

	@media print {
		/* Ce qui ne doit jamais être coupé en deux par une fin de page. Le tableau
		   des lignes en est exclu à dessein : l'empêcher de se couper le pousserait
		   entier sur une page, et un tableau de trente lignes déborderait. */
		.avoid-break {
			break-inside: avoid;
		}
		/* Une ligne de tableau se coupe mal : l'entête, lui, se répète. */
		tr {
			break-inside: avoid;
		}
		thead {
			display: table-header-group;
		}
		p {
			orphans: 3;
			widows: 3;
		}

		/* La mise en page de l'admin réserve la place de son ossature : `pt-20`
		   pour l'en-tête fixe, `ml-64` pour la barre latérale. À l'impression ces
		   réserves n'ont plus d'objet, et sans ce retrait la feuille descend d'un
		   pouce et part vers la droite au lieu d'être calée en haut du papier. */
		:global(main) {
			margin: 0 !important;
			padding: 0 !important;
			min-height: 0 !important;
		}
		:global(html),
		:global(body) {
			height: auto !important;
			min-height: 0 !important;
			margin: 0 !important;
			padding: 0 !important;
			background: white !important;
		}
		/* Les enveloppes de la mise en page portent le fond nuit et un
		   `min-h-screen`. Sur papier, cet aplat sombre s'imprimerait sous la
		   feuille et jusqu'au bas de la page. On les vise par leur classe et non
		   par leur profondeur : un niveau de `div` ajouté au gabarit ferait
		   silencieusement revenir le fond noir. */
		:global(.bg-dark-blue),
		:global(.bg-gray-900),
		:global(body > div) {
			background: white !important;
			min-height: 0 !important;
		}
		:global(nav),
		:global(aside),
		:global(header.app-header),
		.no-print {
			display: none !important;
		}

		.sheet {
			margin: 0 !important;
			width: 100%;
			max-width: none !important;
			box-shadow: none !important;
		}
	}
</style>
