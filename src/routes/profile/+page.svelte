<script>
	import { supabase } from '$lib/supabaseClient';
	import { userdata } from '$lib/store';
	import { onMount } from 'svelte';
	import { loadUserdata } from '$lib/utils';

	export let user = {
		name: 'Urbain',
		email: 'davincibot@devinci.fr',
		avatar: 'https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/michael-gough.png'
	};

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			loadPage().catch(console.error);
		}
	});

	async function LogOut() {
		supabase.auth.signOut().then(() => {
			window.location.href = `${window.location.origin}/auth/login`;
		});
	}

	async function clearUserdataCache() {
		try {
			// collect keys to remove: userdata cache + all table settings (settings_*)
			const keysToRemove = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (!key) continue;
				if (key === 'userdata_cache' || key.startsWith('settings_')) {
					keysToRemove.push(key);
				}
			}
			keysToRemove.forEach((k) => localStorage.removeItem(k));

			await loadUserdata();
			alert('Cache utilisateur et paramètres des tableaux vidés.');
		} catch (e) {
			console.error(e);
			alert('Impossible de vider le cache utilisateur');
		}
	}
	async function handleImage(e) {
		const avatarFile = e.target.files[0];
		let extension = avatarFile.name.split('.').pop();
		const { data, error } = await supabase.storage
			.from('avatars')
			.upload(`${user.id}/avatar.${extension}`, avatarFile, {
				cacheControl: '3600',
				upsert: true
			});

		if (error) {
			console.error(error);
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
				console.error(error2);
				alert('Une erreur est survenue lors de la modification de votre avatar');
			}

			alert(
				'Avatar modifié avec succès, le changement peut prendre quelques minutes pour être visible'
			);
		}
	}

	let new_password = '';
	let new_password_confirmation = '';
	let new_username = '';

	let loading = false;

	async function handlePassword() {
		loading = true;

		if (new_password !== new_password_confirmation) {
			alert('Les mots de passe ne correspondent pas');
			loading = false;
			return;
		}

		const { data, error } = await supabase.auth.updateUser({
			password: new_password
		});

		if (error) {
			console.error(error);
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
			console.error(error);
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
		data-role={user.role}
		class="flex flex-col items-center justify-center w-full h-full p-8 text-white bg-gray-800 rounded-lg shadow-md sm:mx-auto"
	>
		<div class="z-20 flex items-center justify-center w-32 h-32 bg-gray-700 rounded-full" id="pp">
			<label id="-label" class="z-10 w-32 rounded-full" for="file">
				<span>Modifier</span>
			</label>
			<input
				type="file"
				name="file"
				id="file"
				accept="image/png, image/jpeg"
				on:change={handleImage}
			/>
			<img src={user?.avatar} alt="avatar" class="w-32 h-32 rounded-full" />
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
		class="flex flex-col items-center justify-center w-full h-full p-8 text-white bg-gray-800 rounded-lg shadow-md sm:mx-auto"
	>
		<form class="w-full space-y-4 md:space-y-6" on:submit|preventDefault={handleSubmit}>
			<div>
				<label for="username" class="block mb-2 text-sm font-medium text-white">Votre nom</label>
				<input
					type="text"
					name="username"
					id="username"
					placeholder="DaVinciBot"
					class=" border rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
					bind:value={new_username}
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-primary-600 hover:bg-primary-700 focus:ring-primary-800"
				>{loading ? 'Chargement ...' : 'Modifer mes informations'}</button
			>
			<hr />
			<button
				type="button"
				class="w-full px-4 py-2 mb-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-700"
				on:click={clearUserdataCache}
			>
				Vider le cache utilisateur
			</button>
			<button
				type="button"
				class="w-full px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-700"
				on:click={LogOut}
			>
				Se déconnecter
			</button>
		</form>
	</div>
	<div
		class="flex flex-col items-center justify-center w-full h-full p-8 text-white bg-gray-800 rounded-lg shadow-md sm:mx-auto"
	>
		<form
			class="w-full space-y-4 border-gray-700 md:space-y-6"
			on:submit|preventDefault={handlePassword}
		>
			<div>
				<label for="password" class="block mb-2 text-sm font-medium text-white"
					>Nouveau mot de passe</label
				>
				<input
					type="password"
					name="password"
					id="password"
					class=" border rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
					placeholder="********"
					bind:value={new_password}
				/>
			</div>

			<div>
				<label for="password" class="block mb-2 text-sm font-medium text-white"
					>Confirmer le mot de passe</label
				>
				<input
					type="password"
					name="password"
					id="password"
					class="border rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
					placeholder="********"
					bind:value={new_password_confirmation}
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				class="w-full text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-primary-600 hover:bg-primary-700 focus:ring-primary-800"
				>{loading ? 'Chargement ...' : 'Changer mon mot de passe'}</button
			>
		</form>
	</div>
</div>

<style>
	/* Add a after el to #user-profile, with the user role on the top right corner, and adjust color depending on the role */
	#user-profile {
		position: relative;
	}

	#user-profile::after {
		content: attr(data-role);
		position: absolute;
		top: 0;
		right: 0;
		padding: 0.25rem 0.5rem;
		border-radius: 0 0.5rem 0 0.5rem;
	}
	#user-profile[data-role='admin']::after {
		background-color: #f50b0b;
		color: #fff;
	}
	#user-profile[data-role='cdp']::after {
		background-color: #10b981;
		color: #fff;
	}
	#user-profile[data-role='member']::after {
		background-color: #3b82f6;
		color: #fff;
	}
	#user-profile[data-role='bureau']::after {
		background-color: #ef4444;
		color: #fff;
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
