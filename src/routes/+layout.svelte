<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { userdata } from '$lib/store';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { Snippet } from 'svelte';
	import type { PageData } from './$types';

	import SideBar from '$lib/components/admin/SideBar.svelte';
	import UserBadge from '$lib/components/share/UserBadge.svelte';
	import '../app.css';

	const { data, children }: { data: PageData; children?: Snippet } = $props();

	const userProfile = $derived(data.userProfile);
	const canCreateOrder = $derived(data.canCreateOrder);
	const __menu = $derived(data.menu);

	let open = $state(false);
	let sessionSynced = $state(false);

	$effect(() => {
		if (userProfile) {
			userdata.set(userProfile);
		} else {
			userdata.set(null);
		}
	});

	$effect(() => {
		const session = data.session;
		if (browser && !sessionSynced && session.access_token && session.refresh_token) {
			sessionSynced = true;
			const supabase = getSupabaseBrowserClient();
			void supabase.auth.setSession({
				access_token: session.access_token,
				refresh_token: session.refresh_token
			});
		}
	});
</script>

<svelte:head>
	<!-- meta favicon -->
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="apple-touch-icon" href="/favicon.png" />
	<link rel="mask-icon" href="/favicon.png" color="#000000" />
	<link rel="shortcut icon" href="/favicon.png" />

	<!-- font -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap"
		rel="stylesheet"
	/>

	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="bg-dark-blue min-h-screen min-w-screen font-['Almarai'] text-white antialiased">
	<div class="min-h-screen min-w-screen overflow-hidden bg-gray-900 antialiased">
		<nav
			class=" fixed top-0 right-0 left-0 z-50 w-screen border-b border-gray-700 bg-gray-800 px-4 py-2.5"
		>
			<div class="flex flex-wrap items-center justify-between">
				<div class="flex items-center justify-start">
					<button
						data-drawer-target="drawer-navigation"
						data-drawer-toggle="drawer-navigation"
						aria-controls="drawer-navigation"
						class="mr-2 cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:ring-2 focus:ring-gray-100 md:hidden"
						onclick={() => {
							open = !open;
						}}
					>
						<svg
							aria-hidden="true"
							class="h-6 w-6"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fill-rule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clip-rule="evenodd"
							></path>
						</svg>
						<svg
							aria-hidden="true"
							class="hidden h-6 w-6"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							></path>
						</svg>
						<span class="sr-only">Toggle sidebar</span>
					</button>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href="/" class="mr-4 flex items-center justify-between">
						<img src="/admin/white_logo_notext.webp" class="mr-3 h-8" alt="Davincibot Logo" />
						<span
							class="hidden self-center text-2xl font-semibold whitespace-nowrap text-white sm:block"
							>DaVinciBot</span
						>
					</a>
				</div>

				<div class="flex items-center lg:order-2">
					{#if canCreateOrder}
						<a
							type="button"
							class="bg-primary-600 hover:bg-primary-800 focus:ring-primary-800 mr-2 flex items-center justify-center rounded-lg p-2 py-2 text-sm font-medium text-white focus:ring-4 focus:outline-none sm:px-4"
							href={resolve('/orders/new' as '/')}
						>
							<svg
								class="h-3.5 w-3.5 sm:mr-2"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<path
									clip-rule="evenodd"
									fill-rule="evenodd"
									d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
								/>
							</svg>
							<span class="hidden sm:block">Faire une commande</span>
						</a>
					{/if}
					<UserBadge />
				</div>
			</div>
		</nav>

		<!-- Sidebar -->
		<SideBar menu={__menu} {open} />

		<main class="min-h-screen p-4 pt-20 md:ml-64">
			{@render children?.()}
		</main>
	</div>
</div>
