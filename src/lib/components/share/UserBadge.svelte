<script lang="ts">
	import type { EffectivePermission, GlobalPermission } from '@davincibot/lib';
	import { GLOBAL_PERMISSIONS } from '@davincibot/lib';
	import { openSettings } from '$lib/settings';
	import { userdata, type UserData } from '@davincibot/lib';
	import { hideOnClickOutside } from '@davincibot/lib';
	import { onDestroy, onMount } from 'svelte';

	interface UserBadgeUser {
		name: string;
		email: string;
		avatar: string;
		permissions?: EffectivePermission[];
		[key: string]: unknown;
	}

	interface Props {
		user?: UserBadgeUser | null;
		fixed?: boolean;
	}

	const fallbackUser: UserBadgeUser = {
		name: 'DVB',
		email: 'davincibot@devinci.fr',
		avatar: 'https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/michael-gough.png'
	};

	let { user = $bindable(fallbackUser), fixed = true }: Props = $props();

	let skip = false;
	let resizeHandler: (() => void) | null = null;
	const displayUser = $derived(user ?? fallbackUser);

	function toUserBadgeUser(value: UserData): UserBadgeUser {
		if (!value) {
			return fallbackUser;
		}
		const email = value.email;
		const globalPermissionSet: ReadonlySet<string> = new Set(GLOBAL_PERMISSIONS);
		const permissions = value.permissions.filter((permission): permission is GlobalPermission =>
			globalPermissionSet.has(permission)
		);
		return {
			...value,
			name: value.name,
			email,
			avatar: value.avatar,
			permissions
		};
	}

	const unsubscribe = userdata.subscribe((value) => {
		if (value) {
			user = toUserBadgeUser(value);
			skip = true;
		} else {
			user = null;
		}
	});

	function getDropdown() {
		return document.getElementById('dropdown') as HTMLDivElement | null;
	}

	function setupDropdown() {
		// set position of the popup just below the button
		const dropdown = getDropdown();
		const button = document.getElementById('user-menu-button');
		if (!dropdown || !button) {
			return;
		}
		const rect = button.getBoundingClientRect();
		dropdown.style.top = `calc(${String(rect.bottom)}px - 0.25rem)`;
		dropdown.style.left = `calc(${String(rect.left)}px - 12.05rem)`;
	}

	onMount(() => {
		const dropdown = getDropdown();
		if (!dropdown) {
			return;
		}
		setupDropdown();
		document.body.appendChild(dropdown);

		resizeHandler = () => {
			setupDropdown();
		};
		window.addEventListener('resize', resizeHandler);

		if (skip) {
			return;
		}
	});

	onDestroy(() => {
		unsubscribe();
		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
		}
	});
</script>

<button
	id="user-menu-button"
	class="bg-blue-gray/15 focus:ring-light-blue/60 mx-3 flex rounded-full text-sm focus:ring-3 md:mr-0"
	aria-expanded="false"
	onclick={(e: MouseEvent) => {
		const dropdown = getDropdown();
		if (!dropdown) {
			return;
		}
		dropdown.classList.toggle('hidden');
		e.stopPropagation();
		hideOnClickOutside(dropdown);
	}}
	type="button"
>
	<span class="sr-only">Open user menu</span>
	<img class="h-8 w-8 rounded-full" alt="user avatar" src={displayUser.avatar} />
</button>
<!-- Dropdown menu -->
<div
	id="dropdown"
	class="{fixed
		? 'fixed'
		: 'absolute'} bg-opacity-20 divide-light-blue/10 border-light-blue/20 bg-dark-blue/60 z-50 my-4 hidden w-56 list-none divide-y overflow-hidden rounded-xl border text-base shadow backdrop-blur-lg"
>
	<div class="px-4 py-3">
		<span class="block text-sm font-semibold text-white">{displayUser.name}</span>
		<span class="block truncate text-sm text-white">{displayUser.email}</span>
	</div>
	<ul class="text-dark-light-blue py-1" aria-labelledby="dropdown">
		<li>
			<button
				class="bg-opacity-80 hover:bg-blue-gray/15 block w-full px-4 py-2 text-left text-sm hover:cursor-pointer hover:text-white"
				onclick={() => {
					// fermer le dropdown avant d'ouvrir le modal : il vit en fin de body
					// et passerait au-dessus à z-index égal
					getDropdown()?.classList.add('hidden');
					openSettings();
				}}
				type="button">Paramètres</button
			>
		</li>
	</ul>
</div>
