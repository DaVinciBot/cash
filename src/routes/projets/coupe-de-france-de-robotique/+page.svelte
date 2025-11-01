<script>
	import Topbar from '$lib/components/share/Topbar.svelte';
	import Footer from '$lib/components/share/Footer.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';

	const eventMeta = {
		author: 'Urbain Lantrès',
		role: 'Président',
		published: '24 janvier 2025',
		updated: '26 août 2025'
	};

	const quickFacts = [
		{
			label: 'Qui',
			value: "Équipes d’écoles, IUT, universités, clubs et associations réunis autour de la robotique."
		},
		{
			label: 'Quoi',
			value:
				'Des matchs de robots 100 % autonomes sur une table thématisée qui change chaque année. Aucune téléopération.'
		},
		{
			label: 'Quand',
			value:
				'Traditionnellement la semaine de l’Ascension. Le règlement parait vers septembre pour l’édition suivante.'
		},
		{
			label: 'Où',
			value: 'Depuis 2016 au Parc des expositions de La Roche-sur-Yon (Vendée).'
		},
		{
			label: 'Combien',
			value: 'Environ 170 équipes françaises engagées en 2023, plus la sélection Eurobot.'
		},
		{
			label: 'Durée d’un match',
			value: 'Entre 90 et 100 secondes selon les éditions. Tout se joue très vite.'
		}
	];

	const phases = [
		{
			title: 'Homologation',
			description:
				'Contrôle sécurité, vérification des gabarits et démonstration des capacités minimales des robots avant d’entrer sur la table officielle.'
		},
		{
			title: 'Qualifications',
			description:
				'Séries de matchs pour classer toutes les équipes sur la base de leurs performances et de la maîtrise des missions du règlement.'
		},
		{
			title: 'Phases finales',
			description:
				'Tableau à élimination directe pour le top 16. Ambiance bon enfant, accès public gratuit et stands pour rencontrer les équipes.'
		}
	];

	const categories = [
		{
			title: 'Seniors',
			description: 'Catégorie principale pour les écoles, clubs et associations étudiantes ou indépendantes.'
		},
		{
			title: 'Légendes',
			description:
				'Introduite en 2023 pour les équipes d’anciens. L’objectif est de favoriser la médiation scientifique auprès du public.'
		},
		{
			title: 'Eurobot',
			description:
				"La Coupe de France sert de sélection nationale pour Eurobot, la finale internationale. La compétition est souvent organisée sur place."
		}
	];

	const historyPoints = [
		'Créée en 1994 et connue pendant longtemps sous le nom « Coupe E=M6 de robotique ».',
		'Coorganisée aujourd’hui par Planète Sciences et Oryon, avec un règlement renouvelé chaque année.',
		'Après des années à La Ferté-Bernard (festival ARTEC), la coupe s’est installée à La Roche-sur-Yon depuis 2016.'
	];

	const timeline = [
		{
			period: 'Septembre',
			title: 'Publication du règlement',
			description:
				'Annonce officielle du thème et des missions de jeu. Début des brainstormings et de la veille technique.'
		},
		{
			period: 'Automne / Hiver',
			title: 'Conception et prototypage',
			description:
				'Modélisation, simulations, prototypage rapide et précoupes locales. Les sous-équipes affinent leur feuille de route.'
		},
		{
			period: 'Printemps',
			title: 'Homologations et répétitions',
			description:
				'Assemblage final, réglages, tests grandeur nature et homologations pour valider la sécurité des robots.'
		},
		{
			period: 'Semaine de l’Ascension',
			title: 'Compétition officielle',
			description:
				"Quatre jours au Parc des expositions de La Roche-sur-Yon : homologations finales, qualifications, phases finales et remise des prix."
		}
	];

	const reasons = [
		'Un projet système complet : mécanique, électronique, logiciel et organisation convergent vers un même objectif.',
		'Un terrain d’expression parfait pour gagner en visibilité, recruter, convaincre des sponsors ou partager du contenu open-source.',
		'Une porte d’entrée vers Eurobot pour confronter ses robots à d’autres équipes internationales.'
	];
</script>

<svelte:head>
	<title>Coupe de France de Robotique | DaVinciBot</title>
	<meta
		name="description"
		content="Coupe de France de Robotique : aperçu rapide du projet phare de DaVinciBot, calendrier, catégories, déroulé et raisons de s’y engager."
	/>
</svelte:head>

<Topbar />

<div class="flex flex-col min-h-screen text-white bg-dark-blue">
	<header class="relative overflow-hidden pt-28 pb-24 md:pt-32">
		<div class="absolute inset-0 bg-gradient-to-br from-dark-blue via-[#050a2d] to-[#091f55]"></div>
		<div class="absolute inset-y-0 right-[-10rem] w-[28rem] rounded-full bg-main-blue/30 blur-3xl opacity-60"></div>
		<div class="absolute -top-32 -left-20 h-[26rem] w-[26rem] rounded-full bg-dark-light-blue/20 blur-3xl opacity-70"></div>

		<div class="relative z-10 px-6 mx-auto max-w-5xl space-y-8 text-left">
			<div class="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-white/20 bg-white/5 text-xs font-semibold tracking-[0.4em] uppercase text-white/70">
				<span>Projet phare</span>
			</div>
			<div class="space-y-6">
				<h1 class="text-4xl font-extrabold leading-tight sm:text-5xl">
					Coupe de France de Robotique&nbsp;: un aperçu rapide
				</h1>
				<p class="text-lg text-white/75 sm:text-xl">
					Une introduction à notre plus ancien projet ! Chaque saison, l’équipe DaVinciBot construit des robots autonomes pour relever le défi proposé par Planète Sciences et Oryon.
				</p>
			</div>

			<div class="flex flex-wrap gap-4 text-sm text-white/70">
				<span>Par {eventMeta.author} — {eventMeta.role}</span>
				<span>Publié le {eventMeta.published}</span>
				<span>Mis à jour le {eventMeta.updated}</span>
			</div>

			<div class="flex flex-col gap-4 pt-4 sm:flex-row">
				<div class="sm:w-48">
					<CTAButton href="/contact">Rejoindre l’équipe</CTAButton>
				</div>
				<div class="sm:w-48">
					<CTAButton secondary={true} href="/sponsors">Soutenir le projet</CTAButton>
				</div>
			</div>
		</div>
	</header>

	<main class="flex-1 bg-gradient-to-b from-[#060b2c] via-[#080f37] to-dark-blue/95">
		<section class="px-6 py-16 mx-auto max-w-4xl sm:py-20">
			<p class="text-white/80 leading-7">
				Chaque année, la Coupe de France de Robotique (CDR) réunit des centaines d’équipes étudiantes et de passionnés autour d’un défi technique 100&nbsp;% autonome. En 2025, l’événement se tient du 28 au 31 mai au Parc des expositions de La Roche-sur-Yon en Vendée, coorganisé par Planète Sciences et Oryon.
			</p>
			<p class="mt-6 text-white/80 leading-7">
				DaVinciBot y aligne ses robots depuis 2013. La coupe est notre fil conducteur : un terrain où toutes les compétences du pôle s’unissent, du design mécanique au logiciel embarqué, en passant par la gestion de projet et la logistique événementielle.
			</p>
		</section>

		<section class="px-6 pb-12 mx-auto max-w-6xl sm:pb-20">
			<h2 class="text-3xl font-bold sm:text-4xl">L’essentiel en 20 secondes</h2>
			<div class="grid gap-6 mt-10 sm:grid-cols-2 lg:grid-cols-3">
				{#each quickFacts as fact}
					<article class="h-full p-6 border rounded-2xl border-white/10 bg-white/5 backdrop-blur">
						<p class="text-xs font-semibold tracking-[0.35em] uppercase text-dark-light-blue/90">
							{fact.label}
						</p>
						<p class="mt-3 text-sm text-white/80 leading-6">{fact.value}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="px-6 py-12 mx-auto max-w-5xl sm:py-20">
			<h2 class="text-3xl font-bold sm:text-4xl">Comment se déroule la compétition&nbsp;?</h2>
			<div class="mt-10 space-y-8">
				{#each phases as phase, index}
					<article class="relative p-6 border rounded-3xl border-white/10 bg-white/5 backdrop-blur">
						<div class="absolute flex items-center justify-center font-semibold text-dark-blue bg-dark-light-blue w-8 h-8 rounded-full -left-4 top-6">
							{index + 1}
						</div>
						<h3 class="text-xl font-semibold">{phase.title}</h3>
						<p class="mt-3 text-sm leading-6 text-white/75">{phase.description}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="px-6 py-12 mx-auto max-w-4xl sm:py-20">
			<div class="grid gap-8 sm:grid-cols-[1fr_1.2fr] sm:items-center">
				<div class="order-2 sm:order-1">
					<h2 class="text-3xl font-bold sm:text-4xl">Rob, le robot de DaVinciBot</h2>
					<p class="mt-4 text-sm leading-6 text-white/75">
						Rob est l’architecture que nous faisons évoluer depuis 2022 pour répondre aux missions de la Coupe de France. Chaque nouvelle édition nous pousse à repenser ses modules, à fiabiliser ses actionneurs et à peaufiner son intelligence embarquée.
					</p>
				</div>
				<figure class="order-1 overflow-hidden border rounded-3xl border-white/10 bg-white/5 sm:order-2">
					<img
						src="/assets/projets/CDR.jpg"
						alt="Rob, le robot de DaVinciBot lors de la Coupe de France de Robotique 2024"
						class="object-cover w-full h-full"
						loading="lazy"
					/>
					<figcaption class="px-6 py-3 text-xs text-white/60 border-t border-white/10">
						Rob, le robot de DaVinciBot pour la Coupe 2024
					</figcaption>
				</figure>
			</div>
		</section>

		<section class="px-6 py-12 mx-auto max-w-5xl sm:py-20">
			<div class="grid gap-8 md:grid-cols-2">
				<article class="p-6 border rounded-3xl border-white/10 bg-white/5 backdrop-blur">
					<h2 class="text-3xl font-bold sm:text-4xl">Tables et thèmes qui changent chaque année</h2>
					<p class="mt-4 text-sm leading-6 text-white/75">
						Le thème annuel impose une table scénarisée, des objets à manipuler, des zones bonus et parfois des mécanismes spéciaux. Exemple 2025&nbsp;: <em>The Show Must Go On</em>. Résultat&nbsp;: nous repensons nos mécaniques, notre électronique et nos logiciels à chaque édition.
					</p>
				</article>
				<article class="p-6 border rounded-3xl border-white/10 bg-white/5 backdrop-blur">
					<h2 class="text-3xl font-bold sm:text-4xl">Catégories et passerelles</h2>
					<ul class="mt-4 space-y-3 text-sm leading-6 text-white/75">
						{#each categories as cat}
							<li>
								<span class="font-semibold text-dark-light-blue">{cat.title} :</span>
								<span class="ml-1">{cat.description}</span>
							</li>
						{/each}
					</ul>
				</article>
			</div>
		</section>

		<section class="px-6 py-12 mx-auto max-w-4xl sm:py-20">
			<h2 class="text-3xl font-bold sm:text-4xl">Un peu d’histoire</h2>
			<ul class="mt-6 space-y-3 text-sm leading-6 text-white/75">
				{#each historyPoints as point}
					<li class="flex gap-3">
						<span
							class="flex items-center justify-center w-5 h-5 mt-0.5 text-xs font-semibold rounded-full border border-dark-light-blue text-dark-light-blue"
							aria-hidden="true"
						>
							•
						</span>
						<span>{point}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section class="px-6 py-12 mx-auto max-w-5xl sm:py-20">
			<h2 class="text-3xl font-bold sm:text-4xl">Calendrier type d’une saison</h2>
			<div class="mt-10 space-y-10 border-l border-white/15 pl-8">
				{#each timeline as step}
					<div class="relative">
						<span class="absolute flex items-center justify-center w-6 h-6 -left-12 top-1 rounded-full border border-dark-light-blue bg-dark-blue">
							<span class="w-2 h-2 rounded-full bg-dark-light-blue"></span>
						</span>
						<p class="text-xs font-semibold tracking-[0.25em] uppercase text-white/60">
							{step.period}
						</p>
						<h3 class="mt-2 text-xl font-semibold">{step.title}</h3>
						<p class="mt-3 text-sm leading-6 text-white/75">{step.description}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="px-6 py-12 mx-auto max-w-4xl sm:py-20">
			<h2 class="text-3xl font-bold sm:text-4xl">Pourquoi viser la CDR quand on est étudiant&nbsp;?</h2>
			<ul class="mt-6 space-y-3 text-sm leading-6 text-white/75">
				{#each reasons as reason}
					<li class="flex gap-3">
						<span
							class="flex items-center justify-center w-5 h-5 mt-0.5 text-xs font-semibold rounded-full border border-dark-light-blue text-dark-light-blue"
							aria-hidden="true"
						>
							+
						</span>
						<span>{reason}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section class="px-6 py-12 mx-auto max-w-4xl sm:py-20">
			<h2 class="text-3xl font-bold sm:text-4xl">À propos de DaVinciBot</h2>
			<p class="mt-4 text-sm leading-6 text-white/75">
				DaVinciBot participe à la Coupe de France de Robotique depuis 2013, avec une architecture modulaire que nous faisons évoluer depuis 2022. En parallèle, nous développons d’autres projets robotiques que vous pouvez découvrir sur notre blog et lors de nos événements de médiation.
			</p>
		</section>

		<section class="px-6 py-16 mx-auto max-w-4xl text-center sm:py-20">
			<h2 class="text-3xl font-bold sm:text-4xl">Envie d’en savoir plus&nbsp;?</h2>
			<p class="mt-4 text-base text-white/75">
				Que vous soyez futur membre, alumni ou partenaire industriel, la Coupe de France de Robotique est l’occasion idéale de nous rencontrer. Parlons de vos idées, de vos besoins ou d’un futur partenariat.
			</p>
			<div class="flex flex-col gap-4 mt-8 sm:flex-row sm:justify-center">
				<div class="sm:w-48">
					<CTAButton href="/blog">Découvrir nos projets</CTAButton>
				</div>
				<div class="sm:w-48">
					<CTAButton secondary={true} href="/contact">Échanger avec l’équipe</CTAButton>
				</div>
			</div>
		</section>
	</main>

	<Footer />
</div>

<style>
	@media (max-width: 640px) {
		header {
			padding-top: 6.5rem;
			padding-bottom: 6rem;
		}
	}
</style>
