<script>
	import Footer from '$lib/components/share/Footer.svelte';
	import Topbar from '$lib/components/share/Topbar.svelte';

	const brochureUrl = '/Dossier_Partenariat_DaVinciBot_2025.pdf'; // servi depuis static/

	const sponsors = [
		{
			name: 'Alstom',
			logo: '/assets/parte/Alstom_logo.svg',
			link: 'https://www.alstom.com/',
			blurb:
				"Leader mondial des solutions de mobilité intelligentes et durables. Notre collaboration est centrée sur l'innovation et l'excellence en ingénierie."
		},
		{
			name: 'RS',
			logo: '/assets/parte/RS.svg',
			link: 'https://www.rs-online.com/',
			blurb:
				'RS accompagne nos besoins de prototypage et de production avec des composants fiables et une livraison rapide pour nos projets.'
		},
		{
			name: 'Aisler',
			logo: '/assets/parte/Aisler.svg',
			link: 'https://aisler.net/',
			blurb:
				'Fabrication et assemblage de PCB de haute qualité qui accélèrent nos cycles de développement matériel.'
		},
		{
			name: 'Faulhaber',
			logo: '/assets/parte/faulhaber.svg',
			link: 'https://www.faulhaber.com/',
			blurb:
				"Systèmes d'entraînement de précision permettant un mouvement compact et efficace dans nos travaux de robotique et de mécatronique."
		},
		{
			name: 'Gotronic',
			logo: '/assets/parte/Gotronic.svg',
			link: 'https://www.gotronic.fr/',
			blurb:
				"Distributeur de confiance pour l'électronique et l'embarqué, au service de nos expérimentations et prototypes."
		},
		{
			name: 'Hauts de Seine',
			logo: '/assets/parte/HDS.svg',
			link: 'https://www.hauts-de-seine.fr/',
			blurb:
				"Partenaire engagé dans l'innovation étudiante et l'accompagnement des jeunes souhaitant s'investir dans des projets concrets."
		},
		{
			name: 'IFT',
			logo: '/assets/parte/IFT.svg',
			link: 'https://ift.devinci.fr/',
			blurb:
				"Partenaire sur des initiatives de recherche, d'enseignement et de transfert de technologie. Ils sont notre service parrain au sein de l'ESILV."
		},
		{
			name: 'Igus',
			logo: '/assets/parte/Igus.svg',
			link: 'https://www.igus.fr/',
			blurb:
				'Fournisseur de matériaux polymères innovants qui améliorent la durabilité et la performance de nos systèmes mécaniques.'
		}
	];

	// Configuration de la grille d'arrière-plan (héros)
	const BG_COLS = 10;
	const BG_ROWS = 8;
	const bgTiles = Array.from(
		{ length: BG_COLS * BG_ROWS },
		(_, i) => sponsors[i % sponsors.length]
	);
</script>

<svelte:head>
	<title>Partenaires — DaVinciBot</title>
	<meta
		name="description"
		content="Découvrez nos partenaires et sponsors, et téléchargez notre brochure de partenariat."
	/>
	<link rel="canonical" href="https://davincibot.fr/sponsors" />
	<meta
		name="keywords"
		content="partenaires, sponsors, collaboration, robotique, innovation, DaVinciBot, DVB"
	/>
	<meta name="robots" content="index, follow" />

	<meta property="og:title" content={`Partenaires — DaVinciBot`} />
	<meta
		property="og:description"
		content="Découvrez nos partenaires et sponsors, et téléchargez notre brochure de partenariat."
	/>
	<meta property="og:image" content="https://davincibot.fr/dvb_og_img.png" />
	<meta property="og:url" content="https://davincibot.fr/sponsors" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DaVinciBot" />
	<meta property="og:locale" content="fr_FR" />

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:site" content="https://instagram.com/davincibot_pulv" />
	<meta name="twitter:creator" content="https://instagram.com/davincibot_pulv" />
</svelte:head>

<Topbar />

<!-- Hero -->
<section
	class="relative px-4 pt-24 pb-12 overflow-hidden sm:px-8 md:px-16 lg:px-32 md:pt-32 lg:pt-40 md:h-[600px] flex justify-center"
>
	<!-- Grille d'arrière-plan en tuiles -->
	<div class="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
		<div
			class="absolute -inset-16 opacity-15 [mask-image:radial-gradient(closest-side,_rgba(0,0,0,.9),_transparent_95%)] bg-drift"
		>
			<div
				class="grid gap-10 place-items-center"
				style={`grid-template-columns: repeat(${BG_COLS}, minmax(120px, 1fr));`}
			>
				{#each bgTiles as t}
					<img
						src={t.logo}
						alt=""
						class="object-contain w-auto h-10 md:h-12 lg:h-14 saturate-50 brightness-110 contrast-90"
						loading="lazy"
					/>
				{/each}
			</div>
		</div>
	</div>

	<div class="relative max-w-5xl m-auto text-center">
		<h1 class="text-4xl font-extrabold tracking-wide sm:text-5xl md:text-6xl">Nos partenaires</h1>
		<p class="mt-5 text-base sm:text-lg text-white/80">
			Nous menons des projets ambitieux grâce au soutien de partenaires engagés. Découvrez qui nous
			accompagne et comment nous collaborons.
		</p>
		<div class="flex flex-col justify-center gap-3 mt-8 sm:flex-row">
			<a
				href={brochureUrl}
				download
				class="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white transition border rounded-md bg-white/10 hover:bg-white/20 border-white/15 backdrop-blur"
				aria-label="Télécharger notre brochure de partenariat"
			>
				Télécharger la brochure de partenariat
			</a>
			<a
				href="mailto:davincibot@devinci.fr"
				class="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white transition bg-transparent border rounded-md hover:bg-white/10 border-white/15 backdrop-blur"
			>
				Contactez-nous
			</a>
		</div>
	</div>
</section>

<!-- Sponsors list -->
<section class="px-4 pb-20 sm:px-8 md:px-16 lg:px-32">
	<div class="max-w-6xl mx-auto">
		{#each sponsors as s, i}
			<article
				class="grid items-center gap-8 py-10 border-t md:grid-cols-2 md:gap-12 md:py-14 border-white/10"
			>
				<!-- Logo -->
				<div class={`order-1 ${i % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
					<div
						class="aspect-[3/1] md:aspect-[4/1] w-full max-w-md md:max-w-none mx-auto flex items-center justify-center rounded-lg bg-white/5 border border-white/10 p-6"
					>
						<img
							src={s.logo}
							alt={`${s.name} logo`}
							class="object-contain w-auto max-h-16 md:max-h-20"
							loading="lazy"
						/>
					</div>
				</div>

				<!-- Copy -->
				<div class={`order-2 ${i % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
					<h3 class="text-2xl font-bold md:text-3xl">{s.name}</h3>
					<p class="mt-3 leading-relaxed text-white/80">{s.blurb}</p>
					{#if s.link}
						<a
							href={s.link}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex mt-4 text-sm font-semibold text-white underline hover:text-white/80 underline-offset-4"
							aria-label={`Visiter le site de ${s.name}`}
						>
							Visiter le site
						</a>
					{/if}
				</div>
			</article>
		{/each}

		<!-- bottom divider -->
		<div class="border-t border-white/10"></div>
	</div>
</section>

<!-- CTA -->
<section class="px-4 pb-24 sm:px-8 md:px-16 lg:px-32">
	<div class="max-w-4xl mx-auto text-center">
		<h2 class="text-3xl font-extrabold md:text-4xl">Devenir partenaire</h2>
		<p class="mt-4 text-white/80">
			Envie de collaborer ? Téléchargez notre brochure pour découvrir les options de partenariat et
			les offres de visibilité.
		</p>
		<div class="flex flex-col justify-center gap-3 mt-6 sm:flex-row">
			<a
				href={brochureUrl}
				download
				class="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white transition border rounded-md bg-white/10 hover:bg-white/20 border-white/15 backdrop-blur"
				aria-label="Télécharger notre brochure de partenariat"
			>
				Télécharger la brochure de partenariat
			</a>
			<a
				href="mailto:davincibot@devinci.fr"
				class="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white transition bg-transparent border rounded-md hover:bg-white/10 border-white/15 backdrop-blur"
			>
				Nous écrire
			</a>
		</div>
	</div>
</section>

<Footer />

<style>
	@keyframes sponsors-drift {
		0% {
			transform: translate3d(0, 0, 0);
		}
		100% {
			transform: translate3d(-6%, -6%, 0);
		}
	}
	.bg-drift {
		animation: sponsors-drift 60s linear infinite;
	}
</style>
