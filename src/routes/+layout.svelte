<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		closeSettings,
		openSettings,
		parseSettingsCategory,
		settingsModal,
		type SettingsModalState
	} from '$lib/settings';
	import { hasAnyPermission, userdata } from '@davincibot/lib';
	import { onDestroy, untrack, type Snippet } from 'svelte';
	import type { PageData } from './$types';
	import { Button, DevRbacPanel, SideBar } from '@davincibot/components';
	import { Menu, Plus } from '@lucide/svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import UserBadge from '$lib/components/share/UserBadge.svelte';
	import '../app.css';

	let { data, children }: { data: PageData; children?: Snippet } = $props();

	const userProfile = $derived(data.userProfile);
	const canRequestItems = $derived(
		hasAnyPermission(data.permissions, ['orders.items.manage.self'])
	);
	const __menu = $derived(data.menu);

	let open = $state(false);

	let settingsState = $state<SettingsModalState | null>(null);
	const unsubscribeSettings = settingsModal.subscribe((value) => {
		settingsState = value;
	});
	onDestroy(unsubscribeSettings);

	$effect(() => {
		const profile = userProfile;
		// untrack : les abonnés de userdata lisent/écrivent leur propre state pendant
		// set() ; sans untrack ces lectures deviennent des dépendances de cet effet
		// (boucle infinie effect_update_depth_exceeded qui casse la navigation).
		untrack(() => {
			userdata.set(profile ?? null);
		});
	});

	// Deep-link ?settings=<cat> : ouvre le modal Paramètres puis nettoie l'URL.
	// afterNavigate (et pas un $effect) : replaceState exige un router initialisé,
	// et un effet sur page.url se redéclencherait après le replaceState.
	afterNavigate(() => {
		const raw = page.url.searchParams.get('settings');
		if (raw === null) {
			return;
		}
		openSettings(parseSettingsCategory(raw));
		const url = new URL(window.location.href);
		url.searchParams.delete('settings');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- URL courante, déjà résolue
		replaceState(url, {});
	});
</script>

<svelte:head>
	<!-- meta favicon -->
	<link href="/favicon.png" rel="icon" type="image/png" />
	<link href="/favicon.png" rel="apple-touch-icon" />
	<link color="#000000" href="/favicon.png" rel="mask-icon" />
	<link href="/favicon.png" rel="shortcut icon" />

	<!-- font -->
	<link href="https://fonts.googleapis.com" rel="preconnect" />
	<link crossorigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
	<link
		href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap"
		rel="stylesheet"
	/>

	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<!-- Une seule coquille : le fond de marque était jusqu'ici intégralement masqué
	 par un bg-dark-blue/60 posé sur le div enfant. -->
<div
	class="bg-dark-blue text-light-blue min-h-screen min-w-screen overflow-hidden font-['Almarai'] antialiased"
>
	<nav
		class="border-light-blue/20 bg-surface-modal fixed top-0 right-0 left-0 z-50 w-screen border-b px-4 py-2.5"
	>
		<div class="flex flex-wrap items-center justify-between">
			<div class="flex items-center justify-start">
				<!-- La croix qui accompagnait ce burger portait un `hidden` statique :
						 elle n'a jamais pu s'afficher. Une icône Lucide suffit. -->
				<button
					class="text-dark-light-blue hover:bg-blue-gray/15 hover:text-light-blue focus-visible:ring-light-blue/60 mr-2 cursor-pointer rounded-lg p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none md:hidden"
					aria-controls="drawer-navigation"
					aria-expanded={open}
					onclick={() => {
						open = !open;
					}}
				>
					<Menu class="size-6" />
					<span class="sr-only">Toggle sidebar</span>
				</button>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a class="mr-4 flex items-center justify-between" href="/">
					<img class="mr-3 h-8" alt="Davincibot Logo" src="/admin/white_logo_notext.webp" />
					<span
						class="hidden self-center text-2xl font-semibold whitespace-nowrap text-white sm:block"
						>DaVinciBot</span
					>
				</a>
			</div>

			<div class="flex items-center lg:order-2">
				{#if canRequestItems}
					<!-- En étroit le libellé disparaît : l'aria-label garde un nom au bouton. -->
					<Button
						class="mr-2"
						aria-label="Faire une commande"
						href={resolve('/items/new')}
						variant="primary"
					>
						<Plus class="size-4 shrink-0" />
						<span class="hidden sm:block">Faire une commande</span>
					</Button>
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

	{#if settingsState}
		<SettingsModal initialCategory={settingsState.category} onClose={closeSettings} />
	{/if}

	<DevRbacPanel />
</div>
