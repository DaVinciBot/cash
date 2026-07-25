<script lang="ts">
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { formatParisDateTimeShort } from '@davincibot/lib';
	import { isMobileUserAgent, parseDeviceLabel } from '$lib/settings';
	import { fetchSessions, revokeAllSessions, revokeSession } from '$lib/settings';
	import type { SessionInfo } from '$lib/settings';
	import { alertUnlessCancelled, withStepUp } from '$lib/settings';
	import { LogOut, Monitor, ShieldCheck, Smartphone } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let sessions = $state<SessionInfo[]>([]);
	let loading = $state<boolean>(true);
	let loadError = $state<string | null>(null);
	let busy = $state<boolean>(false);

	const otherSessions = $derived(sessions.filter((session) => !session.is_current));

	async function load() {
		loading = true;
		loadError = null;
		try {
			const list = await fetchSessions();
			// session courante toujours en tête, le reste garde le tri par activité
			sessions = [...list.filter((s) => s.is_current), ...list.filter((s) => !s.is_current)];
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		loading = false;
	}

	onMount(() => {
		void load();
	});

	async function handleRevoke(session: SessionInfo) {
		const label = parseDeviceLabel(session.device_label);
		if (!window.confirm(`Déconnecter « ${label} » ?`)) {
			return;
		}
		busy = true;
		try {
			await withStepUp(() => revokeSession(session.id));
		} catch (error) {
			alertUnlessCancelled(error);
		}
		// recharge dans tous les cas : un 404 signifie une liste périmée
		await load();
		busy = false;
	}

	async function handleRevokeAll() {
		if (!window.confirm('Déconnecter tous les autres appareils ?')) {
			return;
		}
		busy = true;
		try {
			await withStepUp(() => revokeAllSessions());
		} catch (error) {
			alertUnlessCancelled(error);
		}
		await load();
		busy = false;
	}
</script>

<section
	id="sessions-section"
	class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5"
>
	<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
		Appareils connectés
	</p>
	{#if loading}
		<p class="text-dark-light-blue m-0 text-sm">Chargement…</p>
	{:else if loadError}
		<p class="m-0 mb-3 text-sm text-red-400">{loadError}</p>
		<CtaButton fullWidth={false} onclick={() => void load()} size="sm" variant="secondary">
			Réessayer
		</CtaButton>
	{:else}
		<ul class="m-0 grid list-none gap-2 p-0">
			{#each sessions as session (session.id)}
				{@const DeviceIcon = isMobileUserAgent(session.device_label) ? Smartphone : Monitor}
				<li
					id={`session-${session.id}`}
					class="border-light-blue/10 bg-dark-blue/40 flex items-center gap-3 rounded-xl border p-3"
				>
					<DeviceIcon class="text-dark-light-blue size-5 shrink-0" />
					<div class="min-w-0 flex-1">
						<p class="text-light-blue m-0 flex flex-wrap items-center gap-2 text-sm font-medium">
							<span class="truncate">
								{session.is_current ? 'Cet appareil' : parseDeviceLabel(session.device_label)}
							</span>
							{#if session.trusted_device}
								<span
									class="border-light-blue/30 text-dark-light-blue inline-flex size-5 shrink-0 items-center justify-center rounded-full border"
									aria-label="Appareil de confiance"
									role="img"
									title="Appareil de confiance"
								>
									<ShieldCheck class="size-3" />
								</span>
							{/if}
						</p>
						<p class="text-dark-light-blue/80 m-0 truncate text-xs">
							{formatParisDateTimeShort(session.last_seen_at ?? session.created_at)}
						</p>
					</div>
					{#if !session.is_current}
						<button
							id={`session-revoke-${session.id}`}
							class="shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-2 text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label="Déconnecter cet appareil"
							disabled={busy}
							onclick={() => void handleRevoke(session)}
							title="Déconnecter cet appareil"
							type="button"
						>
							<LogOut class="size-4" />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
		{#if otherSessions.length > 0}
			<div class="mt-3 flex justify-end">
				<button
					id="sessions-revoke-all"
					class="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={busy}
					onclick={() => void handleRevokeAll()}
					type="button"
				>
					Déconnecter tous les autres appareils
				</button>
			</div>
		{:else}
			<p class="text-dark-light-blue/70 m-0 mt-3 text-xs">Aucun autre appareil connecté.</p>
		{/if}
	{/if}
</section>
