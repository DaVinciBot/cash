<script>
	import { userdata } from '$lib/store';
	import { loadUserdata, hideOnClickOutside } from '$lib/utils';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	import DvbLogo from './Logo/DVBLogo.svelte';
	import SideBar from '$lib/components/admin/SideBar.svelte';
	import CTAButton from '../utils/CTAButton.svelte';

	let user;
	let skip = false;
	let sidebarOpen = false;
	let onMobile = false;

	let dropdown = {
		projects: false,
		infos: false
	};

	userdata.subscribe((value) => {
		if (value) {
			user = value;
		}
	});

	function setupDropdown(dropdownEl, activatorEl) {
		// set position of the popup just below the button
		const rect = activatorEl.getBoundingClientRect();
		dropdownEl.style.top = 'calc(' + rect.bottom + 'px + 2rem)';
		dropdownEl.style.left = 'calc(' + rect.left + 'px + 0rem)';
	}

	function attachDropdowns() {
		// Move dropdowns to body once, remove stale duplicates, position, and bind outside-click once
		const dropdownNodes = Array.from(document.querySelectorAll('.dropdown'));
		dropdownNodes.forEach((el) => {
			const activatorId = el.dataset.activator;
			if (!activatorId) return;

			// If there is an older, stale dropdown in <body> for the same activator, remove it
			document
				.querySelectorAll('body > .dropdown[data-activator="' + activatorId + '"]')
				.forEach((stale) => {
					if (stale !== el && stale.parentNode) {
						stale.parentNode.removeChild(stale);
					}
				});

			// Only append to body if not already there
			if (el.parentNode !== document.body) {
				document.body.appendChild(el);
			}

			// Position under its activator
			const activator = document.getElementById(activatorId);
			if (activator) {
				setupDropdown(el, activator);
			}

			// Bind outside click only once per element
			if (!el.dataset.clickOutsideBound) {
				try {
					hideOnClickOutside(
						el,
						() => {
							dropdown.projects = false;
							dropdown.infos = false;
						},
						true
					);
					el.dataset.clickOutsideBound = 'true';
				} catch (e) {
					// ignore binding failures
				}
			}
		});
	}

	onMount(async () => {
		if (!skip) await loadUserdata();
		onMobile = window.innerWidth < 768;

		// detach, dedupe and initialize dropdowns
		attachDropdowns();

		onresize = () => {
			onMobile = window.innerWidth < 768;
			// reposition dropdowns
			document.querySelectorAll('.dropdown').forEach((el) => {
				const activator = document.querySelector('#' + el.dataset.activator);
				if (activator) {
					setupDropdown(el, activator);
				}
			});
		};
	});

	// make sure dropdowns are closed and detached dropdown nodes removed when navigating
	const _afterUnsub = afterNavigate(() => {
		dropdown.projects = false;
		dropdown.infos = false;

		// remove any dropdown elements that were detached to document.body
		try {
			document.querySelectorAll('body > .dropdown').forEach((el) => {
				if (el && el.parentNode) el.parentNode.removeChild(el);
			});
		} catch (e) {
			// ignore
		}
	});

	onDestroy(() => {
		// unregister navigation handler
		dropdown.projects = false;
		dropdown.infos = false;
		try {
			if (typeof _afterUnsub === 'function') _afterUnsub();
		} catch (e) {
			// ignore
		}
	});

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<section>
	<nav
		class="border-b px-2 md:px-6 py-2.5 border-gray-700 fixed left-0 right-0 top-0 z-20 backdrop-blur-lg w-screen"
	>
		<div class="flex flex-wrap items-center justify-between">
			<div class="flex items-center justify-start">
				<button
					class="p-2 mr-2 text-gray-400 rounded-lg cursor-pointer md:hidden focus:bg-gray-700 focus:ring-2 focus:ring-gray-700 hover:bg-gray-700 hover:text-white"
					on:click={() => (sidebarOpen = !sidebarOpen)}
					aria-controls="drawer-navigation"
					aria-expanded={sidebarOpen}
				>
					<svg
						aria-hidden="true"
						class="w-6 h-6"
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
						class="hidden w-6 h-6"
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
				<a href="/" class="flex items-center justify-between mr-4">
					<DvbLogo size="h-12" />
				</a>
			</div>
			<div class="items-center hidden md:flex">
				<ul class="flex gap-10">
					<li>
						<a href="/blog" class="text-gray-400 hover:text-white">Actus</a>
					</li>
					<li>
						<button
							id="ProjectsButton"
							on:click={(e) => {
								e.stopPropagation();
								queueMicrotask;
								dropdown.projects = !dropdown.projects;
								dropdown.infos = false;
							}}
							class="flex items-center justify-between w-full px-3 py-2 text-gray-400 rounded-sm hover:text-white md:border-0 md:p-0 md:w-auto"
							>Nos Projets <svg
								class="w-2.5 h-2.5 ms-2.5"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 10 6"
							>
								<path
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="m1 1 4 4 4-4"
								/>
							</svg></button
						>
						<div
							data-activator="ProjectsButton"
							class="{dropdown.projects
								? ''
								: 'hidden'} dropdown z-30 font-normal bg-opacity-0 border border-gray-700 divide-y divide-gray-600 rounded-lg backdrop-blur-lg w-44 fixed"
						>
							<ul class="py-2 text-sm text-gray-400" aria-labelledby="dropdownLargeButton">
								<li>
									<a
										href="/project/coupe-de-robotique"
										class="block px-4 py-2 hover:bg-gray-600 hover:text-white">La CDR</a
									>
								</li>
								<li>
									<a
										href="/project/exodus"
										class="block px-4 py-2 hover:bg-gray-600 hover:text-white">Exodus</a
									>
								</li>
								<li>
									<a
										href="/project/cohoma"
										class="block px-4 py-2 hover:bg-gray-600 hover:text-white">CoHoMa</a
									>
								</li>
							</ul>
							<div class="py-1">
								<a href="#" class="block px-4 py-2 text-sm text-gray-500 hover:bg-gray-600"
									>Travelers</a
								>
							</div>
						</div>
					</li>
					<li>
						<button
							id="AssosButton"
							on:click={(e) => {
								e.stopPropagation();
								dropdown.infos = !dropdown.infos;
								dropdown.projects = false;
							}}
							class="flex items-center justify-between w-full px-3 py-2 text-gray-400 rounded-sm hover:text-white md:border-0 md:p-0 md:w-auto"
							>À Propos<svg
								class="w-2.5 h-2.5 ms-2.5"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 10 6"
							>
								<path
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="m1 1 4 4 4-4"
								/>
							</svg></button
						>
						<div
							data-activator="AssosButton"
							class="{dropdown.infos
								? ''
								: 'hidden'} dropdown z-30 font-normal bg-opacity-0 border border-gray-700 divide-y divide-gray-600 rounded-lg backdrop-blur-lg w-44 fixed"
						>
							<ul class="py-2 text-sm text-gray-400" aria-labelledby="dropdownLargeButton">
								<li>
									<a href="/a-propos" class="block px-4 py-2 hover:bg-gray-600 hover:text-white"
										>L'association</a
									>
								</li>
								<li>
									<a href="/nos-ecoles" class="block px-4 py-2 hover:bg-gray-600 hover:text-white"
										>Nos écoles</a
									>
								</li>
								<li>
									<a href="#" class="block px-4 py-2 hover:bg-gray-600 hover:text-white"
										>Soutenez-nous</a
									>
								</li>
							</ul>
						</div>
					</li>
					<li>
						<a href="/sponsors" class="text-gray-400 hover:text-white">Partenaires</a>
					</li>

					<li>
						<a href="/contact" class="text-gray-400 hover:text-white">Contact</a>
					</li>
				</ul>
			</div>
			<div class="gap-5">
				{#if user}
					<CTAButton href="/admin" secondary={true} size="sm">Espace membre</CTAButton>
				{:else}
					<CTAButton href="/auth/login?redirect=/admin" secondary={true} size="sm"
						>Se connecter</CTAButton
					>
				{/if}
			</div>
		</div>
	</nav>
	{#if onMobile}
		<div
			class="fixed inset-0 z-10 bg-black bg-opacity-40 {!sidebarOpen ? 'hidden' : ''}"
			on:click={closeSidebar}
		></div>

		<SideBar
			open={sidebarOpen}
			noicon={true}
			bgClass="backdrop-blur-lg bg-opacity-0"
			activeClass="hover:backdrop-blur-lg hover:bg-opacity-20 hover:bg-gray-400"
			menu={[
				{ title: 'Actus', icon: 'newspaper', uri: '/blog' },
				{
					title: 'Nos Projets',
					icon: 'briefcase',
					sub: [
						{ title: 'La CDR', uri: '/projets/coupe-de-france-de-robotique' },
						{ title: 'Exodus', uri: '#' },
						{ title: 'CoHoMa', uri: '#' }
					]
				},
				{
					title: 'À Propos',
					icon: 'information-circle',
					sub: [
						{ title: "L'association", uri: '/a-propos' },
						{ title: 'Nos écoles', uri: '/nos-ecoles' },
						{ title: 'Soutenez-nous', uri: '#' }
					]
				},
				{ title: 'Partenaires', icon: 'people', uri: '/sponsors' },
				{ title: 'Contact', icon: 'mail', uri: '/contact' }
			]}
			on:click={closeSidebar}
		/>
	{/if}
</section>

<style>
</style>
