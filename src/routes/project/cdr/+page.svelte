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

	// SSR data from +page.server.js
	export let data;
	const posts = data?.posts ?? [];

	let cdrImg = '/assets/projets/CDR.jpg';
	let precoupeImg = '/assets/article/precoupe.jpg';
</script>

<svelte:head>
	<title>DaVinciBot</title>
	<meta name="description" content="DaVinciBot. L'association de robotique étudiante." />
	<meta name="keywords" content="DaVinciBot, association, robot, robotique, étudiant, esilv" />
	<meta name="author" content="DaVinciBot" />
	<meta name="robots" content="index, follow" />

	<!-- meta og -->
	<meta property="og:title" content="DaVinciBot" />
	<meta property="og:description" content="DaVinciBot. L'association de robotique étudiante." />
	<meta property="og:image" content="/dvb_og_img.png" />
	<meta property="og:url" content="https://davincibot.fr" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DaVinciBot" />
	<meta property="og:locale" content="fr_FR" />

	<!-- meta twitter -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:site" content="@DaVinciBot" />
	<meta name="twitter:creator" content="@DaVinciBot" />
	<meta name="twitter:title" content="DaVinciBot" />
	<meta name="twitter:description" content="DaVinciBot. L'association de robotique étudiante." />
	<meta name="twitter:image" content="/dvb_og_img.png" />
	<meta name="twitter:image:alt" content="DaVinciBot" />
	<meta name="twitter:url" content="https://davincibot.fr" />
	<meta name="twitter:domain" content="davincibot.fr" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<Topbar />

<div class="flex flex-col h-full gap-8 px-4 pt-16 sm:px-8 md:px-16 lg:px-32 md:pt-32 lg:pt-48">
	<div class="justify-start">
		<div class="grid grid-cols-1 md:grid-cols-[2fr_1.5fr] items-center gap-8">
			<div class="flex flex-col justify-start order-2 gap-4 overflow-hidden text-start md:order-1">
				<div class="flex flex-col gap-5">
					<h1 class="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
						La Coupe de France de Robotique
					</h1>
					<p class="self-stretch text-lg tracking-wider sm:text-xl text-dark-blue-gray">
						DaVinciBot participe depuis plus de 10 ans à cette compétion organisée par Planète
						Sciences avec tous les ans une nouvelle équipe, un nouveau thème et de nouveaux défis à
						réaliser.
					</p>
				</div>
				<div class="flex flex-col gap-4 sm:flex-row sm:gap-8">
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
				class="order-1 w-full mx-auto mb-6 md:mb-0 md:order-2 scale-130"
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
	<div class="flex flex-row items-center justify-between p-4">
		<div class="w-1/3 p-4 m-2 md:text-center md:w-6/12">
			<h2 class="text-6xl font-extrabold tracking-[4.10px]">8</h2>
			<p class="self-stretch text-xl tracking-wider text-dark-blue-gray">Robots</p>
		</div>
		<div class="w-1/3 p-4 m-2 md:text-center md:w-6/12">
			<h2 class="text-6xl font-extrabold tracking-[4.10px] pl-6">2000 €</h2>
			<p class="self-stretch text-xl tracking-wider text-dark-blue-gray pr-3">Budget</p>
		</div>
		<div class="w-1/3 p-4 m-2 md:text-center md:w-6/12">
			<h2 class="text-6xl font-extrabold tracking-[4.10px]">12</h2>
			<p class="self-stretch text-xl tracking-wider text-dark-blue-gray">Membres</p>
		</div>
	</div>
	<div class="flex flex-col items-center justify-center mt-12">
		<div class="relative max-w-[500px] m-auto text-center">
			<h1 class="text-4xl font-extrabold tracking-wide sm:text-3xl md:text-5xl">Nos classements</h1>
			<p class="mt-5 text-base sm:text-lg text-dark-blue-gray">
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
					marginLeft={'40'}
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
			</Carousel>
		</div>
	</div>
</div>

<Footer />

<style>
</style>
