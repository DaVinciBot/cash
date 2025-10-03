<script>
	import Footer from '$lib/components/share/Footer.svelte';
	import Topbar from '$lib/components/share/Topbar.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	// Map/viewport logic preserved from the existing hero
	const MAPS_KEY = 'AIzaSyAjdwBeu7JlmpeDFB7a3ghIE536u9z2F_4';
	const MAPS_CENTER = '48.8969983,2.2224943';
	const MAPS_CENTER_MOBILE = '48.8900983,2.2354943';
	const MAPS_MARKER = '48.8959983,2.2354943';
	const MAP_ZOOM = 14;
	const MAP_SIZE = '640x640';
	const MAP_SCALE = 2;

	let isMobile = false;
	if (browser) {
		isMobile = window.matchMedia('(max-width: 768px)').matches;
	}

	onMount(() => {
		const mql = window.matchMedia('(max-width: 768px)');
		const handler = (e) => (isMobile = e.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	const mapStyles = [
		'element:geometry|color:0x010128',
		'element:labels.text.fill|color:0xB3C2FF',
		'element:labels.text.stroke|color:0x010128',
		'feature:road|element:geometry|color:0x5A6294',
		'feature:road|element:geometry.stroke|color:0x828AB6',
		'feature:poi|element:geometry|color:0x575e7d',
		'feature:water|element:geometry|color:0x063B9F'
	];

	$: mapsCenter = isMobile ? MAPS_CENTER_MOBILE : MAPS_CENTER;
	$: staticMapUrl =
		`https://maps.googleapis.com/maps/api/staticmap?key=${MAPS_KEY}` +
		`&center=${encodeURIComponent(mapsCenter)}` +
		`&zoom=${MAP_ZOOM}` +
		`&scale=${MAP_SCALE}` +
		`&size=${MAP_SIZE}` +
		`&markers=color:0x0232FF|icon:https%3A%2F%2Fdavincibot.fr%2Fassets%2Fimg%2Ficon%2Fpointer.png|${encodeURIComponent(MAPS_MARKER)}` +
		`&maptype=roadmap` +
		`&${mapStyles.map((s) => `style=${encodeURIComponent(s)}`).join('&')}`;
	$: mapsExternalLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsCenter)}`;

	// Schools content for alternating sections
	const schools = [
		{
			slug: 'esilv',
			name: 'ESILV',
			subtitle: 'École d’ingénieurs',
			description:
				'L’ESILV forme des ingénieurs généralistes tournés vers les technologies numériques et l’innovation. Les étudiants y développent des compétences en informatique, IA, data, finance, mécanique et énergie au travers d’une pédagogie par projets.',
			highlights: [
				'Accréditée CTI, grade de master',
				'Spécialisations: IA, data, fintech, mécatronique, énergie',
				'Forte proximité avec les entreprises et la recherche'
			],
			image: '/assets/img/esilv.png',
			site: 'https://www.esilv.fr/'
		},
		{
			slug: 'emlv',
			name: 'EMLV',
			subtitle: 'École de management',
			description:
				'L’EMLV prépare aux métiers du management, du marketing et de la finance dans un contexte résolument digital. L’école met l’accent sur l’ouverture, la professionnalisation et le travail en équipe inter-écoles.',
			highlights: [
				'Programmes visés et grade de master',
				'Marketing digital, business development, finance d’entreprise',
				'Stages, alternance et projets concrets au cœur de la pédagogie'
			],
			image: '/assets/img/emlv.png',
			site: 'https://www.emlv.fr/'
		},
		{
			slug: 'iim',
			name: 'IIM',
			subtitle: 'Institut de l’Internet et du Multimédia',
			description:
				'L’IIM forme aux métiers de la création numérique: design, communication visuelle, jeu vidéo, animation 3D, web et communication digitale. Les étudiants alternent entre fondamentaux créatifs et réalisations professionnelles.',
			highlights: [
				'Parcours: Création & Design, Jeux vidéo, Animation 3D, Communication digitale',
				'Projets réels, workshops et pédagogie studio',
				'Forte culture de la collaboration inter-écoles'
			],
			image: '/assets/img/iim.png',
			site: 'https://www.iim.fr/'
		}
	];
</script>

<Topbar />
<div class="flex flex-col min-h-screen">
	<div class="border-b border-gray-700 landing">
		<div class="relative h-screen">
			<div class="flex items-end justify-center w-full h-full md:items-center md:w-6/12">
				<div class="mt-16 mb-12 text-center md:mb-0">
					<div
						class="flex items-center justify-center order-2 px-6 py-10 left-diagonal lg:order-1 sm:px-10 lg:px-16"
					>
						<div class="z-20 w-full max-w-2xl text-center lg:text-left">
							<h1 class="text-5xl font-extrabold tracking-wide sm:text-6xl">
								Pôle Léonard de Vinci
							</h1>
							<p class="mt-6 text-lg text-white/90">
								Au cœur de La Défense, le Pôle Léonard de Vinci réunit trois écoles complémentaires
								— ESILV, EMLV et IIM. Ingénierie, management et création numérique se rencontrent au
								quotidien via une pédagogie par projets et une forte culture de
								l’interdisciplinarité.
							</p>

							<div
								class="flex flex-col items-center justify-center gap-4 mt-8 sm:flex-row lg:justify-start"
							>
								<CTAButton href="#ecoles">Découvrir nos écoles</CTAButton>
								<a
									href="https://www.devinci.fr/"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center px-5 py-3 text-sm font-semibold transition border rounded-xl border-white/20 text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
								>
									Site du Pôle
								</a>
							</div>

							<p class="mt-6 text-sm text-white/60">
								Découvrez l’écosystème pluridisciplinaire qui fait la force de nos projets
								étudiants.
							</p>
						</div>
					</div>
				</div>
			</div>
			<div id="teaser">
				<img
					src="/assets/img/pulv_lc.png"
					alt="Vue du campus du Pôle Léonard de Vinci"
					class="absolute top-0 left-0 object-cover w-full h-full opacity-50 pointer-events-none -z-10"
					loading="lazy"
				/>
			</div>
			<div class="flex items-center justify-center gap-3 px-4 py-3 text-sm text-white/70 lg:hidden">
				<span>Carte intégrée Google Maps</span>
				<a
					href={mapsExternalLink}
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-white">Ouvrir Google Maps</a
				>
			</div>
		</div>
	</div>

	<section id="ecoles" class="container max-w-6xl px-6 py-16 mx-auto space-y-20 sm:py-24">
		{#each schools as s, i}
			<article class="grid items-center gap-10 md:grid-cols-2">
				<div class={i % 2 === 0 ? '' : 'md:order-2'}>
					<div
						class="aspect-[1/1] md:aspect-[2/1] w-full max-w-md md:max-w-none mx-auto flex items-center justify-center rounded-lg bg-white/5 border border-white/10 p-6"
					>
						<img
							src={s.image}
							alt={`Logo ${s.name}`}
							class="object-contain w-auto max-h-56 md:max-h-52"
							loading="lazy"
						/>
					</div>
				</div>
				<div class={i % 2 === 0 ? '' : 'md:order-1'}>
					<h2 class="text-3xl font-bold sm:text-4xl">{s.name}</h2>
					<p class="mt-1 text-white/70">{s.subtitle}</p>
					<p class="mt-6 text-base leading-7 text-white/85">{s.description}</p>

					<ul class="mt-6 space-y-2 text-white/85">
						{#each s.highlights as h}
							<li class="flex items-start gap-3">
								<span
									class="w-5 h-5 mt-0.5 bg-dark-light-blue"
									style="-webkit-mask:url('/assets/img/icon/checked-document.svg') no-repeat center / contain; mask:url('/assets/img/icon/checked-document.svg') no-repeat center / contain;"
									aria-hidden="true"
								></span>
								<span>{h}</span>
							</li>
						{/each}
					</ul>

					<div class="mt-6">
						<a
							class="inline-flex items-center gap-2 text-sm font-semibold text-white underline hover:text-white/80 underline-offset-4"
							href={s.site}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`Visiter le site de ${s.name}`}
						>
							En savoir plus sur {s.name}
							<span
								class="w-4 h-4 bg-dark-light-blue"
								style="-webkit-mask:url('/assets/img/icon/link.svg') no-repeat center / contain; mask:url('/assets/img/icon/link.svg') no-repeat center / contain;"
								aria-hidden="true"
							></span>
						</a>
					</div>
				</div>
			</article>
		{/each}
	</section>

	<Footer />
</div>

<style>
	.landing {
		filter: brightness(0.8);
		height: 100vh;
		overflow: hidden;
	}

	.landing::after {
		content: '';
		height: 200vh;
		width: 100%;
		position: absolute;
		transform: rotate(25deg);
		top: -50%;
		left: -58%;
		z-index: 5;
		background-image: url('/assets/img/icon/plus-pattern-center.webp');
		background-size: 5%;
		background-repeat: repeat;
		opacity: 0.1;
		animation: move 300s ease-in infinite;
		z-index: 1;
	}
	#teaser::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-image: linear-gradient(
			115deg,
			rgba(1, 1, 40, 0.9) 20%,
			rgba(1, 1, 40, 0.5) 45%,
			rgba(1, 1, 40, 0) 50%
		);
		z-index: -1;
		background-blend-mode: multiply;
	}
	@keyframes move {
		100% {
			background-position: 0% 100%;
		}
	}
	@media (max-width: 768px) {
		.landing::after {
			background-size: 15%;
			transform: rotate(0deg);
			top: 70%;
			left: 0;
		}
		#teaser::after {
			background-image: linear-gradient(
				0deg,
				rgba(1, 1, 40, 0.9) 20%,
				rgba(1, 1, 40, 0.5) 40%,
				rgba(1, 1, 40, 0) 50%
			);
		}
	}
</style>
