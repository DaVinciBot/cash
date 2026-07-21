<script lang="ts">
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { updateUsername, uploadAvatar } from '@davincibot/lib/settings';
	import { userdata, type UserData } from '@davincibot/lib';
	import { onDestroy } from 'svelte';

	let user = $state<UserData>(null);
	let username = $state('');
	let savingUsername = $state<boolean>(false);
	let uploadingAvatar = $state<boolean>(false);

	const unsubscribe = userdata.subscribe((value) => {
		user = value;
		username = value?.name ?? '';
	});
	onDestroy(unsubscribe);

	async function handleAvatarChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !user) {
			return;
		}
		uploadingAvatar = true;
		try {
			await uploadAvatar(user.id, file);
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Une erreur est survenue');
		}
		uploadingAvatar = false;
		input.value = '';
	}

	async function handleUsernameSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!user) {
			return;
		}
		const trimmed = username.trim();
		if (!trimmed) {
			alert('Le pseudo ne peut pas être vide');
			return;
		}
		savingUsername = true;
		try {
			await updateUsername(user.id, trimmed);
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Une erreur est survenue');
		}
		savingUsername = false;
	}
</script>

<div class="grid gap-4">
	<section class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
		<div class="flex flex-col items-center gap-4 sm:flex-row">
			<label
				class="group border-light-blue/30 relative block size-24 shrink-0 cursor-pointer overflow-hidden rounded-full border"
				aria-label="Modifier la photo de profil"
			>
				<img src={user?.avatar} alt="avatar" class="size-full rounded-full object-cover" />
				<span
					class="absolute inset-0 flex items-center justify-center rounded-full bg-[rgba(4,8,32,0.7)] text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100 {uploadingAvatar
						? 'opacity-100'
						: ''}"
				>
					{uploadingAvatar ? '…' : 'Modifier'}
				</span>
				<input
					type="file"
					id="avatar-file"
					accept="image/png, image/jpeg"
					class="hidden"
					disabled={uploadingAvatar}
					onchange={handleAvatarChange}
				/>
			</label>
			<div
				class="flex w-full min-w-0 flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-left"
			>
				<p class="text-light-blue m-0 max-w-full truncate text-lg font-semibold">{user?.name}</p>
				<p class="text-dark-light-blue m-0 max-w-full truncate text-sm" id="profile-email">
					{user?.email}
				</p>
				{#if user && user.projects.length > 0}
					<ul
						class="m-0 mt-2 flex list-none flex-wrap justify-center gap-2 p-0 sm:justify-start"
						id="profile-projects"
					>
						{#each user.projects as project (project.id)}
							<li
								class="border-light-blue/20 bg-dark-blue/40 text-light-blue rounded-lg border px-2.5 py-1 text-xs font-semibold"
							>
								{project.name}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</section>

	<section class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">Pseudo</p>
		<form class="flex flex-col gap-3 sm:flex-row sm:items-center" onsubmit={handleUsernameSubmit}>
			<input
				type="text"
				id="username"
				name="username"
				placeholder="DaVinciBot"
				class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 block w-full rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
				disabled={savingUsername}
				bind:value={username}
			/>
			<CtaButton
				type="submit"
				variant="secondary"
				size="sm"
				fullWidth={false}
				class="shrink-0"
				disabled={savingUsername}
			>
				{savingUsername ? 'Chargement…' : 'Enregistrer'}
			</CtaButton>
		</form>
	</section>
</div>
