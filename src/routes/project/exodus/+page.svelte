<script>
	import Topbar from '$lib/components/share/Topbar.svelte';
	import Footer from '$lib/components/share/Footer.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';

	const keyFigures = [
		{
			value: '2024',
			label: 'Naissance du projet',
			description:
				"Création du projet initialement avec l'association DeVinci Fablab, début d'une aventure technologique."
		},
		{
			value: '12',
			label: 'Étudiants mobilisés',
			description:
				'Équipe pluridisciplinaire mêlant CAO, électronique, informatique embarquée et fabrication additive.'
		},
		{
			value: '3',
			label: 'Axes technologiques',
			description: "Trois piliers guide la conception : la légèreté, l'ergonomie et la polyvalence."
		}
	];

	const missionPillars = [
		{
			title: "Augmenter l'utilisateur",
			description:
				'Augmenter l’utilisateur en amplifiant sa force, sa précision et son endurance grâce à un exosquelette intelligent.'
		},
		{
			title: 'Préserver la liberté de mouvement',
			description:
				'Concevoir un exosquelette qui épouse les gestes de l’utilisateur en garantissant un confort optimal et une utilisation fluide.'
		},
		{
			title: 'Renforcer la sécurité',
			description:
				'Protéger les utilisateurs des risques de blessures en anticipant leurs mouvements et en adaptant l’assistance en temps réel.'
		}
	];

	const teamStreams = [
		{
			title: 'Conception mécanique',
			points: [
				"Modélisation 3D des différentes parties de l'exosquelette.",
				"Prototypage rapide à l' aide de la fabrication additive et soustractive.",
				'Recherche de nouveaux matériaux et procédés de fabrication pour allier légèreté et robustesse.'
			]
		},
		{
			title: 'Electronique et informatique embarquée.',
			points: [
				'Conception des cartes électroniques utiles pour le fonctionnement des capteurs et drivers.',
				"Développement d'un système de contrôle des moteurs intelligents et réactifs."
			]
		},
		{
			title: 'Expérience utilisateur',
			points: [
				"Interface permettant un paramétrage simple de l'exosquelette.",
				'Tests sur des personnes ayant des morphologies différetes pour un meilleur feedback.',
				'Processus de tests des composants mécaniques sur banc de test pour vérifier la solidité.'
			]
		}
	];

	const milestones = [
		{
			period: '2025-2026',
			title: 'Bras et liaison dorsale',
			description:
				'Recherche et développement pour la conception de la liaison dorsale et des bras avec les moteurs brushless.'
		},
		{
			period: '2026-2027',
			title: 'Développement du bassin',
			description:
				"Intégration d'un bassin aux précédents prototypes et développement d'une IA de prédiction des mouvements."
		},
		{
			period: '2027-2028',
			title: 'Intégration des jambes',
			description:
				"recherche et développement pour l'intégration des jambes et consolidation du reste de l'exosquelette."
		},
		{
			period: '2028-2029',
			title: 'Version Finale',
			description: "Tests finaux et présentation du modèle finale d'Exodus."
		}
	];

	const supportLinks = [
		{
			label: "Contacter l'équipe projet",
			href: 'mailto:davincibot@devinci.fr?subject=Projet%20CoHoMa'
		},
		{
			label: 'Proposer un partenariat',
			href: '/sponsors'
		},
		{
			label: 'Découvrir DaVinciBot',
			href: '/'
		}
	];
</script>

<svelte:head>
	<title>Projet Exodus — DaVinciBot</title>
	<meta
		name="description"
		content="Découvrez l'exosquelette robotique Exodus développé par DaVinciBot pour assister les ouvriers lorsqu'ils portent des charges lourdes."
	/>
	<link rel="canonical" href="https://davincibot.fr/project/exodus" />
	<meta name="keywords" content="Exodus, Exosquelette, DaVinciBot, robot d'assistance, recherche" />
	<meta name="robots" content="index, follow" />

	<meta property="og:title" content="Projet Exodus — DaVinciBot" />
	<meta
		property="og:description"
		content="Exosquelette robotique conçu pour assister les ouvriers dans le port de charges lourdes."
	/>
	<meta property="og:image" content="" />
	<meta property="og:url" content="https://davincibot.fr/project/exodus" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DaVinciBot" />
	<meta property="og:locale" content="fr_FR" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Projet Exodus — DaVinciBot" />
	<meta
		name="twitter:description"
		content="Focus sur notre exosquelette robotique assistant les ouvriers."
	/>
	<meta name="twitter:image" content="" />
</svelte:head>

<Topbar />

<main class="flex flex-col">
	<section
		class="relative overflow-hidden px-4 pt-24 pb-16 sm:px-8 md:px-16 lg:px-32 md:pt-28 lg:pt-36"
	>
		<div class="max-w-6xl mx-auto grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
			<div class="space-y-6">
				<p class="text-sm font-semibold tracking-[0.3em] uppercase text-white/70">Projet Exodus</p>
				<h1 class="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
					L'exosquelette optimisé pour le port de charges lourdes
				</h1>
				<p class="text-base leading-relaxed text-white/80 sm:text-lg">
					DaVinciBot conçoit un exosquelette intelligent, pensé pour les ouvriers et leurs besoins
					quotidiens. Notre objectif : proposer un équipement intuitif et réactif,capable de
					s’adapter en temps réel pour assister chaque mouvement avec précision.
				</p>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<CTAButton href="/#projets">Nos Projets</CTAButton>
					<CTAButton secondary={true} href="https://www.linkedin.com/company/davincibot/"
						>Suivre l'avancement</CTAButton
					>
				</div>
			</div>
			<div class="relative flex justify-center">
				<div
					class="absolute w-full h-full max-w-sm transition-transform duration-700 bg-dark-light-blue/20 blur-3xl rounded-3xl"
					aria-hidden="true"
				></div>
				<img
					src="/assets/projets/future_exodus.jpg"
					alt="Objectif d'Exodus"
					class="relative w-full max-w-md rounded-3xl border border-white/10 shadow-2xl shadow-dark-light-blue/40"
					loading="lazy"
				/>
			</div>
		</div>
	</section>

	<section class="px-4 py-12 sm:px-8 md:px-16 lg:px-32">
		<div class="max-w-6xl mx-auto grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
			{#each keyFigures as figure}
				<article class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
					<h2 class="text-3xl font-extrabold text-dark-light-blue sm:text-4xl">{figure.value}</h2>
					<p class="mt-2 text-lg font-semibold text-white/80">{figure.label}</p>
					<p class="mt-4 text-sm leading-relaxed text-white/70">{figure.description}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32">
		<div class="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
			<div class="space-y-6">
				<h2 class="text-3xl font-extrabold sm:text-4xl">Mission et contraintes</h2>
				<p class="text-base leading-relaxed text-white/75 sm:text-lg">
					L'exosquelette Exodus vise à améliorer la condition des employés amenés à porter des
					charges lourdes. Plusieurs défis sont à relever comme équilibrer puissance et légèreté ou
					garantir une autonomie pronlongée.Notre solution combine l'utilisation de matériaux
					avancés, une conception ergonomique et prédiction de mouvements avec l'IA.
				</p>
				<ul class="space-y-4">
					{#each missionPillars as item}
						<li class="rounded-xl border border-white/10 bg-white/5 p-4">
							<h3 class="text-xl font-semibold text-white">{item.title}</h3>
							<p class="mt-2 text-sm text-white/70">{item.description}</p>
						</li>
					{/each}
				</ul>
			</div>
			<div class="relative rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
				<h3 class="text-2xl font-bold">Architecture système</h3>
				<p class="mt-3 text-sm leading-relaxed text-white/75">
					Exodus s'articule autour d'une liaison dorsale et de 2 bras. Des moteurs brushless dédiés
					à chaque épaule assurent une assistance précise, tandis qu’une structure en TPU offre
					légèreté et résistance. Le réseau CAN garantit une communication fluide entre les
					composants, et un écran intégré permet à l’utilisateur de configurer en temps réel les
					paramètres d’assistance.
				</p>
				<div class="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-dark-blue/40 p-5 text-sm">
					<p class="font-semibold uppercase tracking-[0.25em] text-white/60">Composants clés</p>
					<ul class="space-y-2 text-white/75">
						<li>• Structure dorsale en TPU pour plus de flexibilité</li>
						<li>• Capteurs de force intégrés pour une meilleure assistance</li>
						<li>• Moteurs brushless pour plus de puissance</li>
						<li>• Systèmes embarqués capable de répondre en moins 250 ms</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32 bg-white/5">
		<div class="max-w-6xl mx-auto">
			<h2 class="text-3xl font-extrabold sm:text-4xl">Organisation de l'équipe</h2>
			<p class="mt-3 text-base text-white/70 sm:text-lg">
				L'équipe Exodus mobilise les compétences des trois écoles du Pôle Léonard de Vinci. Nos
				méthodes agiles permettent un protypage rapide afin de répondre efficacement aux besoins des
				utilisateurs.
			</p>
			<div class="mt-10 grid gap-6 lg:grid-cols-3">
				{#each teamStreams as stream}
					<article class="rounded-2xl border border-white/10 bg-white/5 p-6">
						<h3 class="text-xl font-semibold text-white">{stream.title}</h3>
						<ul class="mt-4 space-y-3 text-sm text-white/70">
							{#each stream.points as point}
								<li>• {point}</li>
							{/each}
						</ul>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32">
		<div class="max-w-5xl mx-auto">
			<h2 class="text-3xl font-extrabold sm:text-4xl">Feuille de route du projet</h2>
			<ol class="mt-10 space-y-8">
				{#each milestones as milestone, index}
					<li class="relative rounded-2xl border border-white/10 bg-dark-blue/60 p-6">
						<div
							class="absolute -left-8 top-6 hidden h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-dark-light-blue text-xl font-bold text-dark-blue lg:flex"
						>
							{index + 1}
						</div>
						<p class="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
							{milestone.period}
						</p>
						<h3 class="mt-2 text-2xl font-semibold text-white">{milestone.title}</h3>
						<p class="mt-3 text-sm leading-relaxed text-white/75">{milestone.description}</p>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32">
		<div
			class="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-10 text-center backdrop-blur"
		>
			<h2 class="text-3xl font-extrabold sm:text-4xl">Sponsoriser le projet Exodus</h2>
			<p class="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
				Nous cherchons des partenaires techniques, mentors tactiques et soutiens financiers pour
				accélérer le développement. Vous souhaitez contribuer à la prochaine génération de systèmes
				robotisés ? Parlons-en.
			</p>
			<div class="mt-8 grid gap-4 sm:grid-cols-3">
				{#each supportLinks as link}
					<CTAButton href={link.href} secondary={link.href !== '/contact'}>
						{link.label}
					</CTAButton>
				{/each}
			</div>
		</div>
	</section>
</main>

<Footer />
