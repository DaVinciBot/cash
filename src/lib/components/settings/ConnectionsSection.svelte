<script lang="ts">
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { formatParisDateTimeShort } from '@davincibot/lib';
	import { fetchConnections, revokeConnection } from '$lib/settings';
	import type { ConnectionInfo } from '$lib/settings';
	import { alertUnlessCancelled, withStepUp } from '$lib/settings';
	import { AppWindow, Unlink } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let connections = $state<ConnectionInfo[]>([]);
	let loading = $state<boolean>(true);
	let loadError = $state<string | null>(null);
	let busy = $state<boolean>(false);

	async function load() {
		loading = true;
		loadError = null;
		try {
			connections = await fetchConnections();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		loading = false;
	}

	onMount(() => {
		void load();
	});

	async function handleRevoke(connection: ConnectionInfo) {
		const confirmed = window.confirm(
			`Révoquer l'accès de « ${connection.name} » ? L'application ne pourra plus obtenir ni rafraîchir de jetons.`
		);
		if (!confirmed) {
			return;
		}
		busy = true;
		try {
			await withStepUp(() => revokeConnection(connection.client_id));
		} catch (error) {
			alertUnlessCancelled(error);
		}
		await load();
		busy = false;
	}
</script>

<section
	id="connections-section"
	class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5"
>
	<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
		Applications connectées
	</p>
	{#if loading}
		<p class="text-dark-light-blue m-0 text-sm">Chargement…</p>
	{:else if loadError}
		<p class="m-0 mb-3 text-sm text-red-400">{loadError}</p>
		<CtaButton fullWidth={false} onclick={() => void load()} size="sm" variant="secondary">
			Réessayer
		</CtaButton>
	{:else if connections.length === 0}
		<p class="text-dark-light-blue/70 m-0 text-sm">
			Aucune application connectée à votre compte DaVinciBot.
		</p>
	{:else}
		<ul class="m-0 grid list-none gap-2 p-0">
			{#each connections as connection (connection.client_id)}
				<li
					id={`connection-${connection.client_id}`}
					class="border-light-blue/10 bg-dark-blue/40 flex items-center gap-3 rounded-xl border p-3"
				>
					<AppWindow class="text-dark-light-blue size-5 shrink-0" />
					<div class="min-w-0 flex-1">
						<p class="text-light-blue m-0 truncate text-sm font-medium">{connection.name}</p>
						{#if connection.latest_expires_at}
							<p class="text-dark-light-blue/80 m-0 truncate text-xs">
								{formatParisDateTimeShort(connection.latest_expires_at)}
							</p>
						{/if}
					</div>
					<button
						id={`connection-revoke-${connection.client_id}`}
						class="shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-2 text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label="Révoquer l'accès de cette application"
						disabled={busy}
						onclick={() => void handleRevoke(connection)}
						title="Révoquer l'accès de cette application"
						type="button"
					>
						<Unlink class="size-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
