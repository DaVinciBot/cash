<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { userdata } from '$lib/store';
	import {
		ADMIN_CUSTOM_URI,
		ADMIN_MENU,
		canAccessAdminPath,
		filterMenuByPermissions,
		hasAnyPermission
	} from '$lib/permissions';

	import UserBadge from '$lib/components/share/UserBadge.svelte';
	import SideBar from '$lib/components/admin/SideBar.svelte';
	import '../app.css';

	export let data;

	let current_user = {};
	let current_permissions = [];
	let canCreateOrder = false;

	let open = false;

	let menu = [...ADMIN_MENU];

	let custom_uri = [...ADMIN_CUSTOM_URI];

	let __menu = [];

	onMount(async () => {
		current_user = data?.user || {};
		if (!current_user?.id) {
			window.location.href = `/auth/login?redirect=${window.location.pathname}`;
			return;
		}

		{
			const { data, error } = await supabase
				.from('profiles')
				.select('username,avatar_url,role,permissions, member_of(project(id, name, debut))')
				.eq('id', current_user.id);
			if (error) {
				console.error(error);
				window.location.href = `/`;
				return;
			}

			const profile = data?.[0];
			current_permissions = profile?.permissions || [];
			canCreateOrder =
				current_permissions.includes('edit_orders') ||
				current_permissions.includes('edit_projects_orders');

			const cachedUser = {
				email: current_user?.email || '',
				name: profile?.username || (current_user?.email ? current_user.email.split('@')[0] : ''),
				avatar: profile?.avatar_url || 'https://avatar.iran.liara.run/public/boy',
				id: current_user.id,
				projects: (profile?.member_of || []).map((m) => ({
					id: m?.project?.id,
					name: m?.project?.name,
					debut: m?.project?.debut || '0000-00-00'
				})),
				role: profile?.role || null,
				permissions: current_permissions
			};

			if (
				hasAnyPermission(current_permissions, [
					'view_all_orders',
					'view_treso',
					'view_members',
					'edit_treso',
					'edit_members'
				])
			) {
				cachedUser.projects.push({
					id: 0,
					name: 'Association',
					debut: '2014-09-01'
				});

				const { data: projects, error: projectsError } = await supabase
					.from('projects')
					.select('id, name, debut');
				if (!projectsError) {
					cachedUser.allProjects = (projects || []).map((p) => ({
						value: p.id,
						name: p.name,
						debut: p.debut
					}));
				}
			}

			userdata.set(cachedUser);
			localStorage.setItem(
				'userdata_cache',
				JSON.stringify({ user: cachedUser, timestamp: Date.now() })
			);
			localStorage.setItem(
				'auth_metadata',
				JSON.stringify({
					id: current_user.id,
					email: current_user?.email || null,
					last_sign_in_at: current_user?.last_sign_in_at || null,
					user_metadata: current_user?.user_metadata || {},
					app_metadata: current_user?.app_metadata || {},
					permissions: current_permissions,
					timestamp: Date.now()
				})
			);
		}
		// remove trailing slash if present
		const uri = window.location.pathname.endsWith('/')
			? window.location.pathname.slice(0, -1)
			: window.location.pathname;

		if (!canAccessAdminPath(uri, current_permissions)) {
			window.location.href = `/`;
		}

		__menu = filterMenuByPermissions(menu, current_permissions);
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

<div class="min-h-screen antialiased bg-dark-blue text-white min-w-screen font-['Almarai']">
	<div class="min-h-screen overflow-hidden antialiased bg-gray-900 min-w-screen">
		<nav
			class=" border-b px-4 py-2.5 bg-gray-800 border-gray-700 fixed left-0 right-0 top-0 z-50 w-screen"
		>
			<div class="flex flex-wrap items-center justify-between">
				<div class="flex items-center justify-start">
					<button
						data-drawer-target="drawer-navigation"
						data-drawer-toggle="drawer-navigation"
						aria-controls="drawer-navigation"
						class="p-2 mr-2 text-gray-400 rounded-lg cursor-pointer md:hidden focus:bg-gray-700 focus:ring-2 focus:ring-gray-100 focus:ring-gray-700 hover:bg-gray-700 hover:text-white"
						on:click={(e) => {
							open = !open;
						}}
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
					<a href="/admin" class="flex items-center justify-between mr-4">
						<img src="/admin/white_logo_notext.webp" class="h-8 mr-3" alt="Davincibot Logo" />
						<span
							class="self-center hidden text-2xl font-semibold text-white whitespace-nowrap sm:block"
							>DaVinciBot</span
						>
					</a>
				</div>

				<div class="flex items-center lg:order-2">
					{#if canCreateOrder}
						<a
							type="button"
							class="flex items-center justify-center p-2 py-2 mr-2 text-sm font-medium text-white rounded-lg focus:ring-4 sm:px-4 bg-primary-600 hover:bg-primary-800 focus:outline-none focus:ring-primary-800"
							href="/admin/orders/new"
						>
							<svg
								class="h-3.5 w-3.5 sm:mr-2"
								fill="currentColor"
								viewbox="0 0 20 20"
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
			<slot />
		</main>
	</div>
</div>

<style>
</style>
