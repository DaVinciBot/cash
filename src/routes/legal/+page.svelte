<script>
	import ArticleFrame from '$lib/components/legal/ArticleFrame.svelte';
	import { canonicalFor } from '$lib/config/site.js';

	const updatedAt = '2025-11-15';
	const canonical = canonicalFor('/legal');
	const title = "Centre d'informations juridiques";
	const intro =
		"Retrouvez en un coup d'œil les documents légaux qui encadrent la consultation publique du blog davincibot.fr et l'utilisation de l'espace membre.";
	const sections = [
		{ id: 'essentiel', label: 'Pourquoi ces documents ?' },
		{ id: 'documents', label: 'Documents principaux' },
		{ id: 'contacts', label: 'Contacts utiles' }
	];

	const legalPages = [
		{
			href: '/legal/cgu',
			tag: 'CGU',
			title: "Conditions générales d'utilisation",
			description:
				"Règles d'accès au blog public, fonctionnement de l'espace membre et responsabilités associées.",
			updatedLabel: '15 novembre 2025'
		},
		{
			href: '/legal/mentions-legales',
			tag: 'Mentions légales',
			title: "Identification de l'éditeur",
			description:
				'Coordonnées officielles, rôle de Netlify et Supabase et modalités de contact (sans formulaire).',
			updatedLabel: '15 novembre 2025'
		},
		{
			href: '/legal/donnees-personnelles',
			tag: 'RGPD',
			title: 'Données personnelles',
			description:
				'Politique RGPD : absence de collecte pour les visiteurs et détails des données traitées pour les membres.',
			updatedLabel: '15 novembre 2025'
		}
	];
</script>

<svelte:head>
	<title>Informations légales — DaVinciBot</title>
	<link rel="canonical" href={canonical} />
	<meta
		name="description"
		content="Point d'accès unique aux conditions générales d'utilisation, mentions légales et politique RGPD de davincibot.fr."
	/>
	<meta name="robots" content="index,follow" />
	<meta property="og:title" content="Informations légales — DaVinciBot" />
	<meta
		property="og:description"
		content="Consultez facilement l'ensemble des documents juridiques de DaVinciBot."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content={canonical} />
</svelte:head>

<ArticleFrame {title} {intro} {updatedAt} {sections}>
	<div class="space-y-12">
		<section id="essentiel" aria-labelledby="heading-essentiel">
			<h2 id="heading-essentiel">Pourquoi ces documents ?</h2>
			<p>
				DaVinciBot est une association loi 1901. Notre site combine un blog public purement
				informatif et un espace membre réservé aux bénévoles pour gérer leurs commandes et services
				numériques. Nous mettons donc à disposition les informations exigées par la réglementation
				française et européenne (RGPD, LCEN, etc.) afin d'expliquer les règles d'usage et les
				données réellement traitées.
			</p>
			<p>
				Nos fournisseurs sont <a href="https://www.netlify.com" rel="external">Netlify, Inc.</a> pour
				l'hébergement statique du site public et Supabase (65 Chulia Street, Level 38 Unit 02/03, OCBC
				Centre, Singapore 049513) exploitant AWS Francfort (eu-central-1) pour notre base de données
				membres.
			</p>
		</section>

		<section id="documents" aria-labelledby="heading-documents">
			<h2 id="heading-documents">Documents principaux</h2>
			<div class="grid gap-6 sm:grid-cols-2">
				{#each legalPages as page}
					<a
						href={page.href}
						class="block h-full p-6 transition border rounded-2xl border-white/10 bg-white/5 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-dark-light-blue/80">
							{page.tag}
						</p>
						<h3 class="mt-2 text-2xl font-bold">{page.title}</h3>
						<p class="mt-3 text-sm text-dark-blue-gray">{page.description}</p>
						<p class="mt-4 text-xs text-gray-400">Mis à jour le {page.updatedLabel}</p>
						<span
							class="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-dark-light-blue"
						>
							Lire le document
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M5 12h14" />
								<path d="M12 5l7 7-7 7" />
							</svg>
						</span>
					</a>
				{/each}
			</div>
		</section>

		<section id="contacts" aria-labelledby="heading-contacts">
			<h2 id="heading-contacts">Contacts utiles</h2>
			<ul>
				<li>
					<strong>Questions juridiques :</strong>
					<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a> — DaVinciBot, 12 Av. Léonard
					de Vinci, 92400 Courbevoie.
				</li>
				<li>
					<strong>Hébergeur :</strong>
					<a href="https://www.netlify.com" rel="external">Netlify, Inc.</a>, 512 2nd Street, Fl 2,
					San Francisco, CA 94107, États-Unis (site public) et Supabase / AWS Francfort
					(eu-central-1) pour les données membres.
				</li>
				<li>
					<strong>Autorité de contrôle :</strong>
					<a href="https://www.cnil.fr/" rel="external"
						>Commission Nationale de l'Informatique et des Libertés (CNIL)</a
					> pour toute réclamation RGPD.
				</li>
			</ul>
		</section>
	</div>
</ArticleFrame>
