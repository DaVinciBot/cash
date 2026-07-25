<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import {
		logOut,
		REPORT_CATEGORY,
		SETTINGS_CATEGORIES,
		type SettingsCategory
	} from '$lib/settings';
	import { ChevronLeft, ChevronRight, Flag, Lock, LogOut, UserRound, X } from '@lucide/svelte';
	import ProfilePanel from './ProfilePanel.svelte';
	import ReportPanel from './ReportPanel.svelte';
	import SecurityPanel from './SecurityPanel.svelte';

	interface SettingsModalProps {
		initialCategory?: SettingsCategory | null;
		onClose: () => void;
	}

	const { initialCategory = null, onClose }: SettingsModalProps = $props();

	// capture initiale voulue : le modal est remonté à chaque ouverture via {#if}
	// svelte-ignore state_referenced_locally
	let activeCategory = $state<SettingsCategory>(initialCategory ?? 'profil');
	// mobile : false = liste des catégories, true = panneau de la catégorie active
	// svelte-ignore state_referenced_locally
	let mobilePanelOpen = $state<boolean>(initialCategory !== null);
	let card = $state<HTMLElement | null>(null);

	const CATEGORY_ICONS: Record<SettingsCategory, typeof UserRound> = {
		profil: UserRound,
		securite: Lock,
		signalement: Flag
	};

	const activeEntry = $derived(
		[...SETTINGS_CATEGORIES, REPORT_CATEGORY].find((category) => category.id === activeCategory)
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function selectCategory(category: SettingsCategory) {
		activeCategory = category;
		mobilePanelOpen = true;
	}

	$effect(() => {
		card?.focus();
	});

	$effect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-[60] flex items-center justify-center p-4"
	aria-labelledby="settings-modal-title"
	aria-modal="true"
	role="dialog"
>
	<OverlayBackdrop {onClose} />
	<section
		bind:this={card}
		class="border-light-blue/30 text-light-blue relative flex h-[min(85dvh,720px)] w-[min(920px,100%)] flex-col overflow-hidden rounded-[22px] border bg-[#060a2c] shadow-[0_26px_70px_rgba(2,6,30,0.6)] focus:outline-none"
		tabindex="-1"
	>
		<header
			class="border-light-blue/20 flex shrink-0 items-center justify-between gap-4 border-b p-4 sm:px-6"
		>
			<h2 id="settings-modal-title" class="text-light-blue m-0 text-xl font-semibold">
				Paramètres
			</h2>
			<button
				class="border-light-blue/30 text-light-blue hover:border-light-blue/60 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition"
				aria-label="Fermer"
				onclick={onClose}
				type="button"
			>
				<X class="size-5" />
			</button>
		</header>

		<div class="flex min-h-0 flex-1">
			<nav
				id="settings-categories"
				class="{mobilePanelOpen
					? 'hidden'
					: 'flex'} md:border-light-blue/20 w-full flex-col gap-1 overflow-y-auto p-3 md:flex md:w-56 md:shrink-0 md:border-r"
				aria-label="Catégories des paramètres"
			>
				{#each SETTINGS_CATEGORIES as category (category.id)}
					{@const Icon = CATEGORY_ICONS[category.id]}
					<button
						class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition {activeCategory ===
						category.id
							? 'border-light-blue/30 bg-blue-gray/25 text-light-blue'
							: 'text-dark-light-blue hover:bg-blue-gray/15 hover:text-light-blue border-transparent'}"
						aria-current={activeCategory === category.id ? 'true' : undefined}
						onclick={() => {
							selectCategory(category.id);
						}}
						type="button"
					>
						<span class="flex min-w-0 items-center gap-2.5">
							<Icon class="size-4 shrink-0" />
							<span class="truncate text-sm font-semibold">{category.label}</span>
						</span>
						<ChevronRight class="size-4 shrink-0 md:hidden" />
					</button>
				{/each}

				<div class="border-light-blue/20 my-1 border-t" role="separator"></div>

				<button
					class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition {activeCategory ===
					REPORT_CATEGORY.id
						? 'border-light-blue/30 bg-blue-gray/25 text-light-blue'
						: 'text-dark-light-blue hover:bg-blue-gray/15 hover:text-light-blue border-transparent'}"
					aria-current={activeCategory === REPORT_CATEGORY.id ? 'true' : undefined}
					onclick={() => {
						selectCategory(REPORT_CATEGORY.id);
					}}
					type="button"
				>
					<span class="flex min-w-0 items-center gap-2.5">
						<Flag class="size-4 shrink-0" />
						<span class="truncate text-sm font-semibold">{REPORT_CATEGORY.label}</span>
					</span>
					<ChevronRight class="size-4 shrink-0 md:hidden" />
				</button>
				<button
					class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
					onclick={() => {
						void logOut();
					}}
					type="button"
				>
					<LogOut class="size-4 shrink-0" />
					<span class="truncate text-sm font-semibold">Déconnexion</span>
				</button>
			</nav>

			<div
				id="settings-panel"
				class="{mobilePanelOpen ? 'flex' : 'hidden'} min-h-0 w-full flex-1 flex-col md:flex"
			>
				<button
					class="border-light-blue/20 text-dark-light-blue hover:text-light-blue flex shrink-0 cursor-pointer items-center gap-2 border-b px-4 py-3 text-sm font-semibold md:hidden"
					onclick={() => {
						mobilePanelOpen = false;
					}}
					type="button"
				>
					<ChevronLeft class="size-4" />
					Retour
				</button>
				<div
					class="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
				>
					<h3 class="text-light-blue m-0 mb-4 text-lg font-semibold">{activeEntry?.label}</h3>
					{#if activeCategory === 'profil'}
						<ProfilePanel />
					{:else if activeCategory === 'securite'}
						<SecurityPanel />
					{:else if activeCategory === 'signalement'}
						<ReportPanel />
					{/if}
				</div>
			</div>
		</div>
	</section>
</div>
