<script>
	import Topbar from '$lib/components/share/Topbar.svelte';
	import Footer from '$lib/components/share/Footer.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';

	const keyFigures = [
		{
			value: '2027',
			label: 'Édition CoHoMa IV',
			description:
				'Participation à la quatrième édition du challenge CoHaMa organisé par le Battle Lab Terre.'
		},
		{
			value: '6',
			label: 'Étudiants mobilisés',
			description:
				"Équipe pluridisciplinaire mêlant mécatronique, IA, électronique et design d'expérience."
		},
		{
			value: '3',
			label: 'Sous-systèmes intégrés',
			description: 'Navigation autonome, perception 3D et interface opérateur augmentée.'
		},
		{
			value: '12+',
			label: 'Capteurs embarqués',
			description:
				'Lidar, caméras stéréo, IMU tactique, télémétrie GNSS et surveillance énergétique.'
		}
	];

	const missionPillars = [
		{
			title: 'Augmenter le soldat',
			description:
				"Offrir une aide robotique capable d'explorer, cartographier et sécuriser les abords d'une zone d'intervention."
		},
		{
			title: 'Assurer la cohabitation',
			description:
				"Concevoir une interface qui laisse l'humain au centre de la décision tout en exploitant les capacités du robot."
		},
		{
			title: 'Garder le rythme opérationnel',
			description:
				'Développer une plateforme robuste, rapide à déployer et autonome sur un cycle de mission complet.'
		}
	];

	const capabilities = [
		{
			title: 'Perception et fusion de données',
			description:
				'LiDAR 3D Hémisphérique, caméras RGB-D et odométrie sont fusionnés pour produire une carte locale dense et détecter les menaces.'
		},
		{
			title: 'Navigation adaptative',
			description:
				'Planification hybride : navigation autonome sur zones sûres, reprise manuelle instantanée via logiciel de contrôle.'
		},
		{
			title: 'Interaction homme-machine',
			description:
				"Interface tactile et casque X-AR affichent l'état du robot, les alertes terrain et les propositions de trajectoire."
		}
	];

	const teamStreams = [
		{
			title: 'Robotique & mécatronique',
			points: [
				"Intégration d'un châssis à assistance électrique tout-terrain",
				'Suspension modulaire pour franchir les obstacles du parcours de qualification',
				"Gestion thermique et énergétique pour 6h d'autonomie"
			]
		},
		{
			title: 'Perception & IA embarquée',
			points: [
				'Segmentation 3D en temps réel pour distinguer alliés, obstacles et zones de danger',
				'Suivi de chemin sécurisé avec recalage SLAM et géorepérage',
				'Pipeline ROS 2 optimisé pour Jetson Orin'
			]
		},
		{
			title: 'Expérience opérateur',
			points: [
				'Interface qui priorise les alertes critiques et simplifie la supervision des capteurs',
				'Visualisation AR pour projeter cartes et trajectoires directement dans le champ de vision',
				"Séquences d'entraînement gamifiées pour familiariser l'opérateur avant la compétition"
			]
		}
	];

	const milestones = [
		{
			period: 'Février 2026',
			title: 'Définition du cahier des charges',
			description: 'Reception du Cahier des Charges, analyse des besoins et des contraintes.'
		},
		{
			period: 'Juin 2026',
			title: 'Prototype terrain V1',
			description:
				'Assemblage châssis, capteurs principaux et téléopération sécurisée. Campagne de tests sur terrain accidenté.'
		},
		{
			period: 'Octobre 2026',
			title: 'Itération co-design',
			description:
				'Intégration des retours des instructeurs militaires : révision IHM, modes de secours et checklists opérateur.'
		},
		{
			period: 'Juin 2027',
			title: 'Qualification Challenge',
			description:
				'Présentation officielle, démonstrateur complet et simulations des épreuves de cohabitation homme-machine.'
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
	<title>Projet CoHoMa — DaVinciBot</title>
	<meta
		name="description"
		content="Découvrez la plateforme semi-autonome développée par DaVinciBot pour le challenge CoHoMa : perception 3D, navigation adaptative et cohabitation homme-machine."
	/>
	<link rel="canonical" href="https://davincibot.fr/projets/cohoma" />
	<meta
		name="keywords"
		content="CoHoMa, Cohabitation Homme Machine, DaVinciBot, robotique défense, Armée de Terre"
	/>
	<meta name="robots" content="index, follow" />

	<meta property="og:title" content="Projet CoHoMa — DaVinciBot" />
	<meta
		property="og:description"
		content="Plateforme robotique semi-autonome conçue avec l'Armée de Terre pour le challenge CoHoMa."
	/>
	<meta property="og:image" content="https://davincibot.fr/assets/projets/cohoma.png" />
	<meta property="og:url" content="https://davincibot.fr/projets/cohoma" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DaVinciBot" />
	<meta property="og:locale" content="fr_FR" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Projet CoHoMa — DaVinciBot" />
	<meta
		name="twitter:description"
		content="Focus sur notre système robotique cohabitant homme-machine développé avec le Battle Lab Terre."
	/>
	<meta name="twitter:image" content="https://davincibot.fr/assets/projets/cohoma.png" />
</svelte:head>

<Topbar />

<main class="flex flex-col">
	<section
		class="relative px-4 pt-24 pb-16 overflow-hidden sm:px-8 md:px-16 lg:px-32 md:pt-28 lg:pt-36"
	>
		<div
			class="absolute inset-0 -z-10 opacity-70"
			style="background: radial-gradient(circle at 10% 20%, rgba(2, 50, 255, 0.25), transparent 55%), radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.15), transparent 45%);"
			aria-hidden="true"
		></div>
		<div class="max-w-6xl mx-auto grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
			<div class="space-y-6">
				<p class="text-sm font-semibold tracking-[0.3em] uppercase text-white/70">Projet CoHoMa</p>
				<h1 class="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
					Une coopération homme-machine taillée pour le terrain
				</h1>
				<p class="text-base leading-relaxed text-white/80 sm:text-lg">
					DaVinciBot développe une plateforme robotique semi-autonome capable de partager la mission
					avec le soldat. Notre objectif : offrir un éclaireur fiable, conscient de son
					environnement et capable d'assister l'opérateur sans le remplacer.
				</p>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<CTAButton href="/contact">Échanger avec nous</CTAButton>
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
					src="/assets/projets/cohoma.webp"
					alt="Rendu 3D du robot CoHoMa développé par DaVinciBot"
					class="relative w-full max-w-md border shadow-2xl rounded-3xl border-white/10 shadow-dark-light-blue/40"
					loading="lazy"
				/>
			</div>
		</div>
	</section>

	<section class="px-4 py-12 sm:px-8 md:px-16 lg:px-32">
		<div class="grid max-w-6xl gap-6 mx-auto sm:grid-cols-2 xl:grid-cols-4">
			{#each keyFigures as figure}
				<article class="p-6 border rounded-2xl border-white/10 bg-white/5 backdrop-blur">
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
					Le challenge CoHoMa met l'accent sur la collaboration entre l'humain et la machine. Chaque
					épreuve impose un tempo soutenu, l'identification rapide des menaces et la capacité à
					explorer des zones à visibilité limitée. Notre réponse combine perception 3D, navigation
					assistée et une interface opérateur qui guide sans saturer l'attention.
				</p>
				<ul class="space-y-4">
					{#each missionPillars as item}
						<li class="p-4 border rounded-xl border-white/10 bg-white/5">
							<h3 class="text-xl font-semibold text-white">{item.title}</h3>
							<p class="mt-2 text-sm text-white/70">{item.description}</p>
						</li>
					{/each}
				</ul>
			</div>
			<div class="relative p-8 border rounded-3xl border-white/10 bg-white/5 backdrop-blur">
				<h3 class="text-2xl font-bold">Architecture système</h3>
				<p class="mt-3 text-sm leading-relaxed text-white/75">
					Le robot s'articule autour d'un châssis motorisé quatre roues motrices, d'un mât capteurs
					modulaire et d'une baie électronique refroidie passivement. Des rails de montage
					permettent d'ajouter facilement des charges utiles (bras robotique, capteurs NRBC, relais
					de communications). Une architecture ROS&nbsp;2 distribue la prise de décision sur trois
					ordinateurs embarqués reliés par un réseau temps réel.
				</p>
				<div class="grid gap-4 p-5 mt-6 text-sm border rounded-2xl border-white/10 bg-dark-blue/40">
					<p class="font-semibold uppercase tracking-[0.25em] text-white/60">Composants clés</p>
					<ul class="space-y-2 text-white/75">
						<li>• Compute Jetson Orin + MCU redondante pour la sécurité</li>
						<li>• Double réseau CAN pour la motorisation et les actionneurs secondaires</li>
						<li>• Lien radio crypté + 5G privée pour le retour vidéo et télémétrie</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32 bg-white/5">
		<div class="max-w-6xl mx-auto">
			<div class="flex flex-col gap-6 mb-12 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h2 class="text-3xl font-extrabold sm:text-4xl">Capacités principales</h2>
					<p class="mt-3 text-base text-white/70 sm:text-lg">
						Chaque sous-système est pensé pour apporter une information exploitable en quelques
						secondes par l'opérateur, tout en respectant les règles d'engagement.
					</p>
				</div>
			</div>
			<div class="grid gap-6 md:grid-cols-3">
				{#each capabilities as capability}
					<article
						class="flex flex-col gap-3 p-6 border rounded-2xl border-white/10 bg-dark-blue/60"
					>
						<h3 class="text-xl font-semibold text-white">{capability.title}</h3>
						<p class="text-sm leading-relaxed text-white/70">{capability.description}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32">
		<div class="max-w-6xl mx-auto">
			<h2 class="text-3xl font-extrabold sm:text-4xl">Organisation de l'équipe</h2>
			<p class="mt-3 text-base text-white/70 sm:text-lg">
				L'équipe CoHoMa mobilise les compétences des trois écoles du Pôle Léonard de Vinci. Nos
				méthodes agiles se combinent à une approche V&V (Verification &amp; Validation) inspirée de
				l'industrie défense.
			</p>
			<div class="grid gap-6 mt-10 lg:grid-cols-3">
				{#each teamStreams as stream}
					<article class="p-6 border rounded-2xl border-white/10 bg-white/5">
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

	<section class="px-4 py-16 sm:px-8 md:px-16 lg:px-32 bg-white/5">
		<div class="max-w-5xl mx-auto">
			<h2 class="text-3xl font-extrabold sm:text-4xl">Feuille de route 2025-2027</h2>
			<ol class="mt-10 space-y-8">
				{#each milestones as milestone, index}
					<li class="relative p-6 border rounded-2xl border-white/10 bg-dark-blue/60">
						<div
							class="absolute items-center justify-center hidden w-12 h-12 text-xl font-bold border rounded-full -left-8 top-6 border-white/20 bg-dark-light-blue text-dark-blue lg:flex"
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
			class="max-w-5xl p-10 mx-auto text-center border rounded-3xl border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur"
		>
			<h2 class="text-3xl font-extrabold sm:text-4xl">Collaborer autour de CoHoMa</h2>
			<p class="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
				Nous cherchons des partenaires techniques, mentors tactiques et soutiens financiers pour
				accélérer le développement. Vous souhaitez contribuer à la prochaine génération de systèmes
				robotisés ? Parlons-en.
			</p>
			<div class="grid gap-4 mt-8 sm:grid-cols-3">
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
