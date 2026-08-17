<script lang="ts">
	// Coquille commune à toutes les pièces : bandeau, titre, parties, et les
	// règles d'impression. Ce qui change d'un type à l'autre — le corps et le
	// pied — arrive par snippets.
	//
	// Les styles d'impression vivent ICI et non dans la page : ils s'appliquent à
	// du balisage produit par les composants enfants, que la portée d'une feuille
	// de style de page n'atteindrait pas.
	import { DOCUMENT_KIND_LABELS } from '@davincibot/lib';
	import type { Snippet } from 'svelte';
	import type { GeneratedDocument } from '$lib/server/reports';

	interface Props {
		doc: GeneratedDocument;
		body: Snippet;
		footer?: Snippet;
		/**
		 * Nommer la date en tête n'a d'intérêt que sur les pièces qui en portent
		 * deux — ailleurs, une date seule sous le titre se comprend sans étiquette.
		 */
		issuedLabel?: string;
		/** Mentions propres à la pièce, sous le titre (dates, références). */
		meta?: Snippet;
		/** Complément d'identité du destinataire (SIREN, IBAN à rembourser…). */
		recipientExtra?: Snippet;
	}

	let { doc, body, footer, issuedLabel, meta, recipientExtra }: Props = $props();

	// Une note de frais est une pièce INTERNE : l'association n'y est pas un
	// émetteur qui s'adresse à un tiers, elle est les deux bouts de l'échange.
	// Répéter son adresse en face du bénéficiaire n'apprend donc rien.
	const showIssuer = $derived(doc.kind !== 'expense_report');
	const issuer = $derived(showIssuer ? doc.issuer : null);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

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
</script>

<!-- Ces règles sortent de la feuille : elles éteignent l'ossature de l'admin et
     redéfinissent la page papier. Portées par `<svelte:head>`, elles sont
     RETIRÉES du document quand le composant est démonté — sans quoi, après avoir
     consulté une pièce, l'impression de n'importe quelle autre page resterait
     sans barre de navigation jusqu'au prochain rechargement.
     Un `@page` ne sait pas se conditionner à une classe : le monter et le
     démonter est le seul moyen de le cantonner à cet écran. -->
<svelte:head>
	<style>
		/* La marge basse est RÉSERVÉE au pied de page : c'est là que Chromium
		   dessine « Page X/Y » au moment du rendu PDF (voir `$lib/server/pdf`).
		   Sans elle, le numéro se superposerait au bas du contenu. */
		@page {
			size: A4;
			margin: 1.2cm 0 1.1cm;
		}

		/* La première page reste à fleur EN HAUT pour que le bandeau touche les
		   bords, comme dans le modèle ; les suivantes prennent une marge, sans quoi
		   le tableau reprend dans la zone que les imprimantes n'atteignent pas. La
		   marge basse, elle, vaut pour toutes les pages : c'est la place du numéro. */
		@page :first {
			margin: 0 0 1.1cm;
		}

		@media print {
			/* La mise en page de l'admin réserve la place de son ossature : `pt-20`
			   pour l'en-tête fixe, `ml-64` pour la barre latérale. À l'impression ces
			   réserves n'ont plus d'objet, et sans ce retrait la feuille descend d'un
			   pouce et part vers la droite. */
			main {
				margin: 0 !important;
				padding: 0 !important;
				min-height: 0 !important;
			}
			html,
			body {
				height: auto !important;
				min-height: 0 !important;
				margin: 0 !important;
				padding: 0 !important;
				background: white !important;
			}
			/* Les enveloppes de la mise en page portent le fond nuit et un
			   `min-h-screen` : cet aplat s'imprimerait sous la feuille et jusqu'au bas
			   de la page. */
			.bg-dark-blue,
			.bg-gray-900,
			body > div {
				background: white !important;
				min-height: 0 !important;
			}
			nav,
			aside,
			header.app-header,
			.no-print {
				display: none !important;
			}
		}
	</style>
</svelte:head>

<article class="sheet mx-auto max-w-[21cm] bg-white text-black shadow-lg">
	<!-- Bandeau : pleine largeur de la feuille, comme dans le modèle LaTeX. -->
	<img class="block w-full" alt="" src="/admin/banner-dvb.png" />

	<div class="px-[1.6cm] pt-2 pb-[1.4cm]">
		<header>
			<h1 class="text-dvb text-2xl font-bold tracking-wide uppercase">
				{DOCUMENT_KIND_LABELS[doc.kind]}
				<span class="font-mono text-xl">{doc.number}</span>
			</h1>
			<p class="mt-1 text-sm text-gray-600">
				{#if issuedLabel}{issuedLabel}&nbsp;:
				{/if}{day.format(new Date(doc.issuedOn))}
			</p>
			{#if meta}{@render meta()}{/if}
		</header>

		<!-- Destinataire à gauche, émetteur à droite : disposition des modèles. -->
		<section class="mt-8 flex items-start justify-between gap-10 text-sm leading-relaxed">
			<div>
				<p class="text-dvb font-bold">{recipientLabel}</p>
				<p class="font-bold">{doc.recipientName}</p>
				{#if doc.recipientAddress}
					<p class="whitespace-pre-line">{doc.recipientAddress}</p>
				{/if}
				{#if recipientExtra}{@render recipientExtra()}{/if}
			</div>

			{#if issuer}
				<div class="text-right text-nowrap">
					<p class="text-dvb font-bold">De la part de</p>
					<p class="font-bold uppercase">{issuer.legalName}</p>
					<p>{issuer.addressLine}</p>
					<p>{issuer.postalCode} {issuer.city}</p>
					{#if issuer.country !== 'France'}<p>{issuer.country}</p>{/if}
					<p>Association loi 1901</p>
					{#if issuer.siret}<p>SIRET {issuer.siret}</p>{/if}
					<!-- Le RNA n'identifie l'association que devant l'administration : il
					     ne dit rien à un client, alors que le Cerfa 11580 l'exige. -->
					{#if doc.kind === 'tax_receipt' && issuer.rna}<p>RNA {issuer.rna}</p>{/if}
					{#if issuer.vatNumber}<p>N° TVA {issuer.vatNumber}</p>{/if}
				</div>
			{/if}
		</section>

		{@render body()}

		<!-- Le pied est un SEUL bloc insécable : laissée libre, la mention de
		     franchise partait seule sur une page de plus. -->
		{#if footer}
			<footer class="avoid-break">{@render footer()}</footer>
		{/if}
	</div>
</article>

<style>
	/* Ces règles ne visent QUE l'intérieur de la feuille : globales parce que le
	   balisage vient des composants enfants, mais préfixées par `.sheet` pour ne
	   pas déborder sur le reste de l'application. */
	/* soit le `primary-500` du thème. En dur, indépendant du thème sombre de l'application. */
	:global(.sheet .text-dvb) {
		color: #0958ef;
	}

	:global(.sheet .border-dvb) {
		border-color: #0958ef;
	}

	@media print {
		/* Ce qui ne doit jamais être coupé en deux par une fin de page. Le tableau
		   des lignes en est exclu à dessein : l'empêcher de se couper le pousserait
		   entier sur une page, et un tableau de trente lignes déborderait. */
		:global(.sheet .avoid-break) {
			break-inside: avoid;
		}

		/* Une ligne de tableau se coupe mal ; l'entête, lui, se répète. */
		:global(.sheet tr) {
			break-inside: avoid;
		}
		:global(.sheet thead) {
			display: table-header-group;
		}
		:global(.sheet p) {
			orphans: 3;
			widows: 3;
		}

		.sheet {
			margin: 0 !important;
			width: 100%;
			max-width: none !important;
			box-shadow: none !important;

			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}
</style>
