<script>
	import Footer from '$lib/components/share/Footer.svelte';
	import Topbar from '$lib/components/share/Topbar.svelte';

	import CTAButton from '$lib/components/utils/CTAButton.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const email = 'davincibot@devinci.fr';
	let copied = false;

	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(email);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (e) {
			console.error('Clipboard not available', e);
		}
	}

	const MAPS_KEY = 'AIzaSyAjdwBeu7JlmpeDFB7a3ghIE536u9z2F_4';
	const MAPS_CENTER = '48.8969983,2.2224943'; // default (desktop) center
	const MAPS_CENTER_MOBILE = '48.8900983,2.2354943';
	const MAPS_MARKER = '48.8959983,2.2354943';
	const MAP_ZOOM = 14;
	const MAP_SIZE = '640x640';
	const MAP_SCALE = 2;

	// Track viewport to adjust map centering on mobile
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

	// Dark theme aligned with site colors (see tailwind.config.js)
	const mapStyles = [
		'element:geometry|color:0x010128', // deep navy background
		'element:labels.text.fill|color:0xB3C2FF', // light blue labels
		'element:labels.text.stroke|color:0x010128', // label stroke
		'feature:road|element:geometry|color:0x5A6294', // roads base
		'feature:road|element:geometry.stroke|color:0x828AB6', // road outlines
		'feature:poi|element:geometry|color:0x575e7d', // points of interest
		'feature:water|element:geometry|color:0x063B9F' // water accent
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
							<h1 class="text-5xl font-extrabold tracking-wide sm:text-6xl">Contact</h1>
							<p class="mt-6 text-lg text-white/90">
								Pour toute question, partenariat ou demande d'information, écrivez-nous à l'adresse
								suivante :
							</p>

							<div
								class="flex flex-col items-center justify-center gap-4 mt-8 sm:flex-row lg:justify-start"
							>
								<CTAButton href={`mailto:${email}`}>Envoyer un e-mail</CTAButton>

								<div class="inline-flex items-center gap-3">
									<span class="font-mono select-all text-white/95">{email}</span>
									<button
										type="button"
										on:click={copyEmail}
										class="px-3 py-2 text-sm transition bg-transparent border text-dark-light-blue rounded-xl border-white/20 text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
										aria-live="polite"
									>
										{#if copied}
											Copié !
										{:else}
											Copier
										{/if}
									</button>
								</div>
							</div>

							<p class="mt-6 text-sm text-white/60">
								Nous répondons généralement sous 2 à 3 jours ouvrés.
							</p>
						</div>
					</div>
				</div>
			</div>
			<div id="teaser">
				<img
					src={staticMapUrl}
					alt="Carte statique Google Maps (thème sombre) montrant notre localisation"
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
		left: -50%;
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
			rgba(1, 1, 40, 0.5) 55%,
			rgba(1, 1, 40, 0) 60%
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
