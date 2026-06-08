<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { userdata } from '$lib/store';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	/** @type {{user?: any}} */
	let {
		user = $bindable({
			name: 'Urbain',
			email: 'davincibot@devinci.fr',
			avatar: 'https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/michael-gough.png'
		})
	} = $props();

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			loadPage().catch(() => undefined);
		}
	});

	async function LogOut() {
		await fetch('/auth/logout', { method: 'POST' });
		window.location.href = `${window.location.origin}/auth/login`;
	}

	async function clearUserdataCache() {
		try {
			// collect keys to remove: userdata cache + all table settings (settings_*)
			const keysToRemove = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (!key) {
					continue;
				}
				if (key === 'userdata_cache' || key.startsWith('settings_')) {
					keysToRemove.push(key);
				}
			}
			keysToRemove.forEach((k) => {
				localStorage.removeItem(k);
			});

			alert('Paramètres des tableaux vidés.');
		} catch {
			alert('Impossible de vider le cache utilisateur');
		}
	}
	async function handleImage(e) {
		const avatarFile = e.target.files[0];
		const extension = avatarFile.name.split('.').pop();
		const { data, error } = await supabase.storage
			.from('avatars')
			.upload(`${user.id}/avatar.${extension}`, avatarFile, {
				cacheControl: '3600',
				upsert: true
			});

		if (error) {
			if (error.message === 'Request failed with status code 413') {
				alert('Votre avatar est trop lourd (max 5 Mo)');
			} else {
				alert('Une erreur est survenue lors de la modification de votre avatar');
			}
		} else {
			const { data } = supabase.storage
				.from('avatars')
				.getPublicUrl(`${user.id}/avatar.${extension}`);
			user.avatar = data.publicUrl;
			userdata.set(user);

			const { data: data2, error: error2 } = await supabase
				.from('profiles')
				.update({ avatar_url: data.publicUrl })
				.eq('id', user.id);

			if (error2) {
				alert('Une erreur est survenue lors de la modification de votre avatar');
			}

			alert(
				'Avatar modifié avec succès, le changement peut prendre quelques minutes pour être visible'
			);
		}
	}

	let new_password = $state('');
	let new_password_confirmation = $state('');
	let new_username = $state('');

	let loading = $state(false);

	async function handlePassword() {
		loading = true;

		if (new_password !== new_password_confirmation) {
			alert('Les mots de passe ne correspondent pas');
			loading = false;
			return;
		}

		const response = await fetch('/auth/password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: new_password })
		});
		if (!response.ok) {
			alert('Une erreur est survenue lors de la modification de votre mot de passe');
		}

		loading = false;

		new_password = '';
		new_password_confirmation = '';
	}

	async function handleSubmit() {
		loading = true;

		const { data, error } = await supabase
			.from('profiles')
			.update({ username: new_username })
			.eq('id', user.id);

		if (error) {
			alert('Une erreur est survenue lors de la modification de votre nom');
		}

		user.name = new_username;
		userdata.set(user);

		loading = false;
	}

	async function loadPage() {
		new_username = user.name ?? '';
	}

	onMount(async () => {
		await loadPage();
	});
</script>

<div class="grid gap-5" id="p-box">
	<div
		id="user-profile"
		class="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gray-800 p-8 text-white shadow-md sm:mx-auto"
	>
		<div class="z-20 flex h-32 w-32 items-center justify-center rounded-full bg-gray-700" id="pp">
			<label id="-label" class="z-10 w-32 rounded-full" for="file">
				<span>Modifier</span>
			</label>
			<input
				type="file"
				name="file"
				id="file"
				accept="image/png, image/jpeg"
				onchange={handleImage}
			/>
			<img src={user?.avatar} alt="avatar" class="h-32 w-32 rounded-full" />
		</div>
		<div class="mt-4 text-center">
			<h3 class="text-lg font-semibold text-white">{user?.name}</h3>
			<p class="text-sm text-gray-400">
				{user?.email}
			</p>
		</div>

		<div>
			<h3 class="text-lg font-semibold text-white">
				{user?.projects?.map((el) => el.name).join(', ')}
			</h3>
		</div>
	</div>
	<div
		class="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gray-800 p-8 text-white shadow-md sm:mx-auto"
	>
		<form class="w-full space-y-4 md:space-y-6" onsubmit={preventDefault(handleSubmit)}>
			<div>
				<label for="username" class="mb-2 block text-sm font-medium text-white">Votre nom</label>
				<input
					type="text"
					name="username"
					id="username"
					placeholder="DaVinciBot"
					class=" block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
					bind:value={new_username}
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-800 w-full rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
				>{loading ? 'Chargement ...' : 'Modifer mes informations'}</button
			>
			<hr />
			<button
				type="button"
				class="mb-2 w-full rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
				onclick={clearUserdataCache}
			>
				Vider le cache utilisateur
			</button>
			<button
				type="button"
				class="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:ring-2 focus:ring-red-700 focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
				onclick={LogOut}
			>
				Se déconnecter
			</button>
		</form>
	</div>
	<div
		class="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gray-800 p-8 text-white shadow-md sm:mx-auto"
	>
		<form
			class="w-full space-y-4 border-gray-700 md:space-y-6"
			onsubmit={preventDefault(handlePassword)}
		>
			<div>
				<label for="password" class="mb-2 block text-sm font-medium text-white"
					>Nouveau mot de passe</label
				>
				<input
					type="password"
					name="password"
					id="password"
					class=" block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
					placeholder="********"
					bind:value={new_password}
				/>
			</div>

			<div>
				<label for="password" class="mb-2 block text-sm font-medium text-white"
					>Confirmer le mot de passe</label
				>
				<input
					type="password"
					name="password"
					id="password"
					class="block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
					placeholder="********"
					bind:value={new_password_confirmation}
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-800 w-full rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
				>{loading ? 'Chargement ...' : 'Changer mon mot de passe'}</button
			>
		</form>
	</div>
</div>

<style>
	#user-profile {
		position: relative;
	}

	#-label {
		background-color: rgba(0, 0, 0, 0.5);
		aspect-ratio: 1;
		display: flex;
		opacity: 0;
		cursor: pointer;
		position: absolute;
		align-items: center;
		justify-content: center;
		transition: opacity 0.3s;
	}

	#pp:hover #-label {
		opacity: 1;
	}

	#-label span {
		font-size: 1.5rem;
	}

	#pp img {
		aspect-ratio: 1;
	}
	#pp input {
		display: none;
	}

	#p-box {
		/* Make two col on big screen */
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		grid-template-rows: 1fr 1fr;
	}

	@media (max-width: 640px) {
		#p-box {
			grid-template-columns: 1fr;
		}
	}
</style>
