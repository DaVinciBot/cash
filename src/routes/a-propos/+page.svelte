<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import Topbar from '$lib/components/share/Topbar.svelte';
	import Footer from '$lib/components/share/Footer.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';
	import AnimatedNumber from '$lib/components/utils/AnimatedNumber.svelte';

	const heroImages = [
		{
			src: '/assets/projets/Travelers.webp',
			alt: "L'équipe Travelers lors d'une séance de tests",
			caption: 'Travelers, mission exploration 2024',
			details: 'Ingénierie système · Vision embarquée · Collaboration inter-écoles'
		},
		{
			src: '/assets/projets/CDR.webp',
			alt: 'Robot DaVinciBot aligné sur la table de la Coupe de France de Robotique',
			caption: 'Coupe de France de Robotique',
			details: 'Mécanique de précision · Automatisation · Esprit de compétition'
		},
		{
			src: '/assets/projets/exodus.webp',
			alt: 'Prototype du robot Exodus en phase de validation',
			caption: 'Exodus, robot autonome multi-terrain',
			details: 'Prototypage rapide · Gestion de projet · Innovation continue'
		}
	];

	const heroRotationDelay = 6000;
	let activeHero = 0;
	let heroTimer;

	function stopHeroTimer() {
		if (heroTimer) {
			clearInterval(heroTimer);
			heroTimer = null;
		}
	}

	function startHeroTimer() {
		stopHeroTimer();
		if (heroImages.length <= 1) return;
		heroTimer = setInterval(() => {
			activeHero = (activeHero + 1) % heroImages.length;
		}, heroRotationDelay);
	}

	function selectHero(index) {
		if (index === activeHero) return;
		activeHero = index;
		startHeroTimer();
	}

	onMount(() => {
		startHeroTimer();
	});

	onDestroy(() => {
		stopHeroTimer();
	});

	const pillars = [
		{
			title: 'Former par la pratique',
			description:
				"Nous transformons les idées en prototypes à travers des projets concrets tout au long de l'année.",
			points: [
				'Ateliers hebdomadaires mêlant mécanique, électronique et logiciel',
				'Coachs expérimentés issus des promotions précédentes',
				'Mises en situation inspirées des challenges de robotique'
			]
		},
		{
			title: 'Grandir ensemble',
			description:
				"L’association fonctionne comme un collectif : chaque membre partage ses avancées, ses doutes et ses succès.",
			points: [
				'Mentorat entre promotions et entraide au quotidien',
				'Événements fédérateurs : bootcamps, soirées techniques, afterworks',
				'Ouverture à tous les profils du Pôle Léonard de Vinci'
			]
		},
		{
			title: 'Briller en compétition',
			description:
				'Nos projets s’achèvent sur des rendez-vous nationaux et internationaux qui récompensent la rigueur et la créativité.',
			points: [
				'Participation annuelle à la Coupe de France de Robotique',
				'Projets satellites : Travelers, Exodus, CoHoMa…',
				'Mise en lumière auprès de nos partenaires industriels'
			]
		}
	];

	const community = [
		{
			title: 'Pôle Technique',
			description:
				'Conception, fabrication et programmation : les équipes robot travaillent main dans la main pour intégrer mécatronique, vision et IA.'
		},
		{
			title: 'Pôle Communication',
			description:
				'Identité visuelle, réseaux sociaux, photo/vidéo : ce pôle partage notre aventure avec les étudiants, les partenaires et le grand public.'
		},
		{
			title: 'Pôle Partenariats',
			description:
				'Relations entreprises, recherche de financement et organisation d’événements avec nos sponsors.'
		},
		{
			title: 'Pôle Expérience',
			description:
				'Intégration des nouveaux membres, logistique des déplacements et cohésion de groupe tout au long de l’année.'
		}
	];

	const journey = [
		{
			title: 'Découverte',
			description:
				'A la rentrée, nous présentons l’association, les projets en cours et les profils recherchés. Les nouveaux membres choisissent leurs pôles.'
		},
		{
			title: 'Montée en compétences',
			description:
				"De septembre à décembre, les équipes se forment sur les outils (CAO, électronique, dev embarqué) et réalisent leurs premiers modules."
		},
		{
			title: 'Construction & tests',
			description:
				"De janvier à avril, place au prototypage intensif, aux revues techniques et aux tests en conditions de match."
		},
		{
			title: 'Compétitions & transmission',
			description:
				"Mai et juin sont rythmés par la Coupe de France de Robotique, les retours d’expérience puis le passage de relais à la promotion suivante."
		}
	];
</script>

<svelte:head>
	<title>À propos | DaVinciBot</title>
	<meta
		name="description"
		content="Découvrez la mission, les valeurs et le fonctionnement de DaVinciBot, l’association de robotique du Pôle Léonard de Vinci."
	/>
	<meta property="og:title" content="À propos | DaVinciBot" />
	<meta
		property="og:description"
		content="Comprendre qui nous sommes, ce que nous construisons et comment nous formons la nouvelle génération d’ingénieurs."
	/>
	<meta property="og:image" content="/dvb_og_img.png" />
	<meta property="og:url" content="https://davincibot.fr/a-propos" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DaVinciBot" />
	<meta name="robots" content="index, follow" />
</svelte:head>

<Topbar />

<main class="flex flex-col min-h-screen">
	<section class="relative px-4 pt-32 pb-24 sm:px-10 md:px-20 lg:px-32">
		<div
			class="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-30"
			aria-hidden="true"
		>
			<div
				class="absolute inset-y-0 right-[-15%] w-[55%] rounded-full blur-3xl bg-gradient-to-b from-primary-400/40 via-primary-500/40 to-primary-700/40"
			></div>
			<div
				class="absolute -top-20 left-[-15%] w-[45%] aspect-square rounded-full blur-3xl bg-gradient-to-r from-dark-light-blue/50 via-primary-400/40 to-transparent"
			></div>
		</div>

		<div class="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
			<div class="space-y-6">
				<p class="text-sm font-semibold tracking-[0.4rem] uppercase text-dark-light-blue">
					Association de robotique depuis 2011
				</p>
				<h1 class="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
					Faire émerger des ingénieurs complets par la robotique collaborative
				</h1>
				<p class="max-w-xl text-lg leading-8 text-dark-blue-gray">
					DaVinciBot rassemble des étudiants de l'ESILV, de l'EMLV et de l'IIM pour concevoir des
					robots ambitieux, apprendre en équipe et repousser leurs limites lors de compétitions.
					Chaque projet s’accompagne d’un parcours humain, technique et entrepreneurial.
				</p>
				<div class="flex flex-col items-start gap-4 sm:flex-row">
					<CTAButton href="/contact">Rejoindre l'aventure</CTAButton>
					<CTAButton href="/nos-ecoles" secondary={true}>Découvrir nos écoles</CTAButton>
				</div>
			</div>
			<div class="relative">
				<div
					class="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_60px_-15px_rgba(9,88,239,0.35)] aspect-[16/10] bg-white/5"
					on:mouseenter={stopHeroTimer}
					on:mouseleave={startHeroTimer}
					aria-live="polite"
					aria-label="Moments de la vie DaVinciBot"
				>
					{#if heroImages.length}
						{#key heroImages[activeHero].src}
							<img
								src={heroImages[activeHero].src}
								alt={heroImages[activeHero].alt}
								class="absolute inset-0 object-cover w-full h-full"
								width="960"
								height="600"
								loading="eager"
								in:fade={{ duration: 400 }}
								out:fade={{ duration: 250 }}
							/>
						{/key}
					{/if}

					<div
						class="absolute inset-0 pointer-events-none bg-gradient-to-tr from-dark-blue/50 via-transparent to-transparent"
						aria-hidden="true"
					></div>

					{#if heroImages.length}
						<div class="absolute bottom-6 left-6 right-6 sm:right-auto">
							<div
								class="flex flex-col gap-1 p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 max-w-xs sm:max-w-sm"
							>
								<span class="text-sm font-semibold text-white/90">
									{heroImages[activeHero].caption}
								</span>
								<span class="text-xs text-white/70">
									{heroImages[activeHero].details}
								</span>
							</div>
						</div>
					{/if}
				</div>

				{#if heroImages.length > 1}
					<div class="flex flex-wrap items-center justify-center gap-2 mt-6">
						{#each heroImages as image, idx}
							<button
								type="button"
								class={`h-1.5 w-10 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-white/50 ${idx === activeHero ? 'bg-primary-500' : 'bg-white/30'}`}
								on:click={() => selectHero(idx)}
								aria-label={`Afficher ${image.caption}`}
								aria-current={idx === activeHero ? 'true' : 'false'}
							></button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="px-4 py-20 sm:px-10 md:px-20 lg:px-32 bg-white/5 border-y border-white/5">
		<div class="max-w-4xl">
			<h2 class="text-3xl font-extrabold sm:text-4xl">Notre mission</h2>
			<p class="mt-6 text-lg leading-8 text-dark-blue-gray">
				Nous imaginons des robots qui répondent aux défis posés par les concours, mais surtout nous
				formons des étudiants capables de mener un projet de bout en bout. L’association est un terrain
				d’entraînement intensif qui allie technique, gestion de projet et collaboration inter-écoles.
			</p>
		</div>

		<div class="grid gap-8 mt-12 md:grid-cols-3">
			{#each pillars as pillar}
				<article class="flex flex-col h-full p-6 space-y-4 rounded-3xl bg-dark-blue/60 border border-white/10">
					<h3 class="text-2xl font-semibold">{pillar.title}</h3>
					<p class="text-base leading-7 text-white/80">{pillar.description}</p>
					<ul class="space-y-2 text-sm text-white/70">
						{#each pillar.points as point}
							<li class="flex gap-3">
								<span
									class="inline-flex items-center justify-center flex-none w-5 h-5 rounded-full bg-primary-500/80"
								>
									<span
										class="w-3 h-3 bg-white"
										style="-webkit-mask:url('/assets/img/icon/checked-document.svg') no-repeat center / contain; mask:url('/assets/img/icon/checked-document.svg') no-repeat center / contain;"
									></span>
								</span>
								<span>{point}</span>
							</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>

	<section class="px-4 py-20 sm:px-10 md:px-20 lg:px-32">
		<div class="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
			<div class="space-y-8">
				<h2 class="text-3xl font-extrabold sm:text-4xl">Une communauté pluridisciplinaire</h2>
				<p class="text-lg leading-8 text-dark-blue-gray">
					Derrière nos robots se cachent des élèves ingénieurs, des communicants, des designers et des
					managers qui partagent une passion commune pour l’innovation. Chaque pôle cultive ses
					compétences tout en travaillant avec les autres pour livrer un robot cohérent et performant.
				</p>
				<div class="grid gap-6 sm:grid-cols-2">
					{#each community as bloc}
						<div class="p-5 space-y-3 bg-white/5 border border-white/10 rounded-2xl">
							<h3 class="text-xl font-semibold">{bloc.title}</h3>
							<p class="text-sm text-white/75 leading-6">{bloc.description}</p>
						</div>
					{/each}
				</div>
			</div>
			<div class="grid self-stretch grid-cols-1 gap-6 p-8 rounded-3xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10">
				<div>
					<p class="text-sm tracking-[0.35rem] uppercase text-dark-light-blue">Nos chiffres</p>
					<h3 class="mt-4 text-2xl font-semibold">Un laboratoire étudiant en croissance continue</h3>
				</div>
				<div class="grid gap-6 sm:grid-cols-2">
					<div class="space-y-2">
						<div class="text-5xl font-extrabold">
							<AnimatedNumber target={70} suffix="+" duration={1800} />
						</div>
						<p class="text-sm text-white/70">membres actifs chaque année</p>
					</div>
					<div class="space-y-2">
						<div class="text-5xl font-extrabold">
							<AnimatedNumber target={12} suffix="+" duration={1600} />
						</div>
						<p class="text-sm text-white/70">roboticiens répartis sur 4 équipes</p>
					</div>
					<div class="space-y-2">
						<div class="text-5xl font-extrabold">
							<AnimatedNumber target={15} suffix="+" duration={2000} />
						</div>
						<p class="text-sm text-white/70">événements organisés ou soutenus</p>
					</div>
					<div class="space-y-2">
						<div class="text-5xl font-extrabold">
							<AnimatedNumber prefix="+" target={10} duration={1700} />
						</div>
						<p class="text-sm text-white/70">partenaires industriels fidèles</p>
					</div>
				</div>
				<p class="text-sm text-white/60">
					Au-delà des chiffres, notre force réside dans la transmission : chaque promotion forme la
					suivante pour pérenniser le savoir-faire.
				</p>
			</div>
		</div>
	</section>

	<section class="px-4 py-20 sm:px-10 md:px-20 lg:px-32 bg-white/5 border-y border-white/5">
		<div class="max-w-3xl">
			<p class="text-sm font-semibold tracking-[0.4rem] uppercase text-dark-light-blue">
				Un cycle en quatre temps
			</p>
			<h2 class="mt-4 text-3xl font-extrabold sm:text-4xl">La vie d’un membre DaVinciBot</h2>
			<p class="mt-6 text-lg leading-8 text-dark-blue-gray">
				Chaque année suit un rythme précis qui mêle formation, prototypage, compétition et bilan.
				Rejoindre DaVinciBot, c’est s’engager dans une aventure exigeante où la progression individuelle
				se mesure à l’impact collectif.
			</p>
		</div>

		<div class="grid gap-6 mt-12 md:grid-cols-2">
			{#each journey as step, index}
				<div class="flex gap-5 p-6 rounded-3xl bg-dark-blue/60 border border-white/10">
					<div class="flex items-center justify-center w-12 h-12 text-xl font-semibold rounded-full bg-primary-500/70">
						{index + 1}
					</div>
					<div class="space-y-2">
						<h3 class="text-xl font-semibold">{step.title}</h3>
						<p class="text-sm leading-6 text-white/75">{step.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="px-4 py-20 sm:px-10 md:px-20 lg:px-32 flex-1">
		<div class="grid gap-10 md:grid-cols-[1fr_1.1fr]">
			<div class="space-y-6">
				<p class="text-sm font-semibold tracking-[0.4rem] uppercase text-dark-light-blue">
					Derrière les robots
				</p>
				<h2 class="text-3xl font-extrabold sm:text-4xl">Des projets pour apprendre, inspirer et partager</h2>
				<p class="text-lg leading-8 text-dark-blue-gray">
					Au sein de DaVinciBot, tout projet est pensé pour être documenté et réutilisé. Nous
					partageons nos retours d’expérience avec les autres clubs du Pôle, les lycées et nos
					partenaires afin de démocratiser la robotique auprès du plus grand nombre.
				</p>
				<p class="text-lg leading-8 text-dark-blue-gray">
					Que vous soyez étudiant, enseignant ou entreprise, vous pouvez nous rencontrer lors de nos
					démos, proposer un workshop ou soutenir nos équipes pour la prochaine saison.
				</p>
				<div class="flex flex-col items-start gap-4 sm:flex-row">
					<CTAButton href="/sponsors">Devenir partenaire</CTAButton>
					<CTAButton href="/blog" secondary={true}>Suivre nos actus</CTAButton>
				</div>
			</div>
			<div class="relative">
				<div class="grid gap-6">
					<div class="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
						<h3 class="text-xl font-semibold">Apprentissage continu</h3>
						<p class="mt-3 text-sm leading-6 text-white/75">
							Des sessions techniques ouvertes à tous les niveaux pour progresser en CAD, fabrication
							additive, électronique embarquée ou vision par ordinateur.
						</p>
					</div>
					<div class="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
						<h3 class="text-xl font-semibold">Culture de la documentation</h3>
						<p class="mt-3 text-sm leading-6 text-white/75">
							Chaque équipe rédige fiches techniques, plans et guides afin d’assurer la maintenance
							des robots et le passage de relais aux nouvelles promotions.
						</p>
					</div>
					<div class="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
						<h3 class="text-xl font-semibold">Ouverture vers l’extérieur</h3>
						<p class="mt-3 text-sm leading-6 text-white/75">
							Nous animons des ateliers d’initiation pour des lycéens, participons à des salons et
							collaborons avec des entreprises sur des problématiques techniques concrètes.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<Footer />
</main>
