<script>
	import Carousel from '$lib/components/others/Carousel.svelte';
	import ResultCard from '$lib/components/share/ResultCard.svelte';
	import Footer from '$lib/components/share/Footer.svelte';
	import Topbar from '$lib/components/share/Topbar.svelte';
	import CtaButton from '$lib/components/utils/CTAButton.svelte';

	import HDSLogo from '$lib/components/share/Logo/HDS.svelte';
	import RSLogo from '$lib/components/share/Logo/RS.svelte';
	import FaulhaberLogo from '$lib/components/share/Logo/Faulhaber.svelte';
	import AlstomLogo from '$lib/components/share/Logo/Alstom.svelte';
	import IFTLogo from '$lib/components/share/Logo/IFT.svelte';
	import GotronicLogo from '$lib/components/share/Logo/Gotronic.svelte';
	import AislerLogo from '$lib/components/share/Logo/Aisler.svelte';
	import TheShowMustGoOnLogo from '$lib/components/share/Logo/TheShowMustGoOnLogo.svelte';
	import FarmingMars from '$lib/components/share/Logo/FarmingMars.svelte';
	import TheCherryOnTheCake from '$lib/components/share/Logo/TheCherryOnTheCake.svelte';
	import AgeOfBots from '$lib/components/share/Logo/AgeOfBots.svelte';

	import Signal from '$lib/components/share/icon/Signal.svelte';
	import EyeOpen from '$lib/components/share/icon/EyeOpen.svelte';
	import FindUsLogo from '$lib/components/share/icon/FindUsLogo.svelte';
	import Activity from '$lib/components/share/icon/Activity.svelte';
	import Compass from '$lib/components/share/icon/Compass.svelte';
	import SideBar from '$lib/components/admin/SideBar.svelte';

	// SSR data from +page.server.js
	export let data;
	const posts = data?.posts ?? [];

	let cdrImg = '/assets/projets/CDR.jpg';
	let precoupeImg = '/assets/article/precoupe.jpg';
	let coupe23Img = '/assets/img/IMG_1179.jpg';
</script>

<svelte:head>
	<title>Projet Coupe de France de Robotique — DaVinciBot</title>
	<meta
		name="description"
		content="Découvrez nos robots développés par DaVinciBot pour la Coupe de France de Robotique"
	/>
	<meta name="keywords" content="DaVinciBot, Coue de France de Robotique, étudiant." />
	<meta name="author" content="DaVinciBot" />
	<meta name="robots" content="index, follow" />

	<!-- meta og -->
	<meta property="og:title" content="Projet Coupe de France de Robotique — DaVinciBot" />
	<meta
		property="og:description"
		content="DaVinciBot participe à la Coupe de France de Robotique"
	/>
	<meta property="og:image" content="/assets/projets/CDR.jpg" />
	<meta property="og:url" content="https://davincibot.fr/project/cdr" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DaVinciBot" />
	<meta property="og:locale" content="fr_FR" />

	<!-- meta twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Projet Coupe de France de Robotique — DaVinciBot" />
	<meta
		name="twitter:description"
		content="Focus sur notre participation à la Coupe de France de Robotique."
	/>
	<meta name="twitter:image" content="/assets/projets/CDR.jpg" />
</svelte:head>

<Topbar />

<div
	class="flex flex-col h-full gap-12 px-4 pt-20 mx-auto w-full max-w-screen-2xl sm:px-6 md:px-10 lg:px-16 md:pt-28 lg:pt-36"
>
	<div class="justify-start">
		<div class="grid items-center grid-cols-1 gap-10 md:grid-cols-[2fr_1.5fr]">
			<div class="flex flex-col justify-start order-2 gap-6 text-start md:order-1">
				<div class="flex flex-col gap-5">
					<h1 class="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
						La Coupe de France de Robotique
					</h1>
					<p class="self-stretch text-lg leading-relaxed sm:text-xl text-dark-blue-gray">
						DaVinciBot participe depuis plus de 10 ans à cette compétition organisée par Planète
						Sciences avec tous les ans une nouvelle équipe, un nouveau thème et de nouveaux défis à
						réaliser.
					</p>
				</div>
				<div class="flex flex-col w-full gap-4 sm:flex-row sm:gap-6 sm:w-auto">
					<CtaButton>Nos Projets</CtaButton>
					<CtaButton secondary={true}>Soutenez nous</CtaButton>
				</div>
			</div>
			<img
				src="/assets/projets/rob_shadows.png"
				alt="Robot dessin stylisé pour DaVinciBot"
				width="1280"
				height="720"
				loading="eager"
				fetchpriority="high"
				class="order-1 w-full max-w-md mx-auto mb-6 object-contain md:mb-0 md:order-2 md:max-w-full md:max-h-[420px] lg:max-h-[480px]"
			/>
		</div>

		<div class="flex flex-col justify-center w-full mt-8 2xl:mt-0 sm:w-10/12 md:w-9/12 lg:w-7/12">
			<h2 class="text-base font-bold">Nos soutiens</h2>

			<Carousel>
				<HDSLogo />
				<RSLogo />
				<FaulhaberLogo />
				<AislerLogo />
				<AlstomLogo />
				<IFTLogo />
				<GotronicLogo />
			</Carousel>
		</div>
	</div>
	<section class="flex flex-col w-full gap-6 px-2 py-10 sm:px-0">
		<div class="flex flex-col items-center gap-2 text-center">
			<h2 class="text-3xl font-extrabold sm:text-4xl">Nos chiffres clés</h2>
			<p class="text-base leading-relaxed text-dark-blue-gray sm:text-lg">
				Un aperçu rapide de l'engagement annuel de l'équipe CDR.
			</p>
		</div>
		<div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-3 md:gap-8 lg:gap-10">
			<div class="flex flex-col items-center gap-2 p-4 text-center rounded-2xl">
				<h2 class="text-4xl font-extrabold sm:text-5xl lg:text-6xl">8</h2>
				<p class="text-lg font-semibold tracking-wide text-dark-blue-gray">Robots</p>
			</div>
			<div class="flex flex-col items-center gap-2 p-4 text-center rounded-2xl">
				<h2 class="text-4xl font-extrabold sm:text-5xl lg:text-6xl">2000&nbsp;€</h2>
				<p class="text-lg font-semibold tracking-wide text-dark-blue-gray">Budget</p>
			</div>
			<div class="flex flex-col items-center gap-2 p-4 text-center rounded-2xl">
				<h2 class="text-4xl font-extrabold sm:text-5xl lg:text-6xl">12</h2>
				<p class="text-lg font-semibold tracking-wide text-dark-blue-gray">Membres</p>
			</div>
		</div>
	</section>
	<div class="flex flex-col items-center justify-center mt-12">
		<div class="relative w-full max-w-2xl mx-auto text-center">
			<h1 class="text-4xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
				Nos classements
			</h1>
			<p class="mt-5 text-base leading-relaxed sm:text-lg text-dark-blue-gray">
				DaVinciBot organise et participe à des événements de robotique, offrant à ses membres des
				occasions de se perfectionner et de relever des défis concrets. <br /> <br />
				L'association propose des compétitions internes et externes, ainsi que des ateliers, permettant
				aux étudiants d'appliquer leurs connaissances et d'innover en robotique.
			</p>
		</div>
		<div class="max-w-full my-10">
			<Carousel time={90}>
				<ResultCard
					title={'2025 - The Show Must Go On'}
					rank_and_points={'37e/102 - 230 pts'}
					image={cdrImg}
					logo={TheShowMustGoOnLogo}
					marginLeft={'30'}
					marginBottom={'20'}
				/>
				<ResultCard
					title={'2024 - Farming Mars'}
					rank_and_points={'56e/200 - 157 pts'}
					image={precoupeImg}
					logo={FarmingMars}
					marginLeft={'35'}
					marginBottom={'35'}
				/>
				<ResultCard
					title={'2023 - The Cherry on the Cake'}
					rank_and_points={'46e/100 - 456 pts'}
					image={coupe23Img}
					logo={TheCherryOnTheCake}
					marginLeft={'50'}
					marginBottom={'35'}
				/>
				<ResultCard
					title={'2025 - Age of Bots'}
					rank_and_points={'36e/100 - 456 pts'}
					image={cdrImg}
					logo={AgeOfBots}
					marginLeft={'20'}
					marginBottom={'5'}
				/>
			</Carousel>
		</div>
	</div>
	<section class="w-full pt-12 pb-16 sm:pt-16 md:pt-20 lg:pt-24">
		<div class="flex flex-col items-center px-4 mx-auto max-w-6xl sm:px-6 gap-8 md:gap-12">
			<div class="max-w-2xl text-center space-y-3 md:space-y-4">
				<h2 class="text-4xl font-extrabold sm:text-5xl">Nos technologies</h2>
				<p class="mb-0 text-lg text-dark-blue-gray">
					Avec les années notre robot a accumulé de nombreuses technologies permettant d'être
					toujours plus efficace lors de la Coupe de France de Robotique.
				</p>
			</div>

			<div
				class="relative grid w-full gap-10 -mt-2 md:-mt-4 lg:-mt-6 md:grid-cols-[minmax(18rem,24rem)_minmax(20rem,28rem)_minmax(18rem,24rem)] md:items-center lg:grid-cols-[minmax(20rem,30rem)_minmax(22rem,32rem)_minmax(20rem,30rem)]"
			>
				<div
					class="flex flex-col items-center gap-10 text-center md:items-center md:text-center md:gap-20 md:justify-between"
				>
					<div class="flex flex-col items-center gap-2 md:-translate-x-6 lg:-translate-x-8">
						<span class="flex h-11 w-11 items-center justify-center">
							<EyeOpen />
						</span>
						<div class="max-w-xs space-y-1 md:max-w-sm lg:max-w-md">
							<h3 class="text-xl font-semibold leading-tight lg:text-2xl">Lidar</h3>
							<p class="text-sm leading-relaxed text-dark-blue-gray lg:text-base">
								Un lidar 2D détecte les robots de l'équipe adverse.
							</p>
						</div>
					</div>
					<div class="flex flex-col items-center gap-2 md:-translate-x-1 lg:-translate-x-2">
						<span class="flex h-11 w-11 items-center justify-center">
							<Signal />
						</span>
						<div class="max-w-xs space-y-1 md:max-w-sm lg:max-w-md">
							<h3 class="text-xl font-semibold leading-tight lg:text-2xl">Inter Com</h3>
							<p class="text-sm leading-relaxed text-dark-blue-gray lg:text-base">
								Le système de communication fait maison entre nos différents robots.
							</p>
						</div>
					</div>
				</div>
				<div class="flex justify-center">
					<div
						class="relative w-full max-w-[24rem] aspect-square sm:max-w-[30rem] lg:max-w-[35rem] xl:max-w-[38rem]"
					>
						<div
							class="absolute inset-x-12 bottom-1.5 h-[4.2rem] rounded-full bg-dark-blue-gray/15 blur-lg sm:bottom-2 sm:h-[4.8rem] lg:h-[5.6rem]"
						></div>
						<img
							src="/assets/projets/rob_shadows.png"
							alt="Robot bleu DaVinciBot"
							class="relative z-10 h-full w-full object-contain drop-shadow-[0_30px_45px_rgba(2,50,255,0.28)]"
							loading="lazy"
						/>
					</div>
				</div>
				<div
					class="flex flex-col items-center gap-10 text-center md:items-center md:text-center md:gap-20 md:justify-between"
				>
					<div class="flex flex-col items-center gap-2 md:translate-x-6 lg:translate-x-8">
						<span class="flex h-11 w-11 items-center justify-center">
							<Compass />
						</span>
						<div class="max-w-xs space-y-1 md:max-w-sm lg:max-w-md">
							<h3 class="text-xl font-semibold leading-tight lg:text-2xl">Roues encodeuses</h3>
							<p class="text-sm leading-relaxed text-dark-blue-gray lg:text-base">
								Des roues munies d'encodeurs fournissent en permanence la position du robot.
							</p>
						</div>
					</div>
					<div class="flex flex-col items-center gap-2 md:-translate-x-1 lg:-translate-x-2">
						<span class="flex h-11 w-11 items-center justify-center">
							<Activity />
						</span>
						<div class="max-w-xs space-y-1 md:max-w-sm lg:max-w-md">
							<h3 class="text-xl font-semibold leading-tight lg:text-2xl">Brain</h3>
							<p class="text-sm leading-relaxed text-dark-blue-gray lg:text-base">
								La librairie qui orchestre toutes les actions en parallèle et sécurise chaque cycle.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="flex flex-col items-center justify-center gap-3 mt-6 text-center">
				<span class="flex h-12 w-12 items-center justify-center">
					<FindUsLogo />
				</span>
				<span class="text-sm font-semibold uppercase tracking-[0.35em]"> Retrouvez-nous </span>
				<p class="text-base text-dark-blue-gray">12 Av. Léonard de Vinci</p>
				<p class="text-base text-dark-blue-gray">92400 Courbevoie</p>
			</div>
		</div>
	</section>
</div>

<Footer />

<style>
</style>
