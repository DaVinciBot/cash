<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import PasskeyNameModal from '$lib/components/modals/PasskeyNameModal.svelte';
	import RecoveryCodesModal from '$lib/components/modals/RecoveryCodesModal.svelte';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { formatParisDateTimeShort } from '@davincibot/lib';
	import {
		deletePasskey,
		fetchPasskeys,
		registerPasskey,
		renamePasskey,
		type PasskeyInfo
	} from '$lib/settings';
	import { alertUnlessCancelled, withStepUp } from '$lib/settings';
	import { FingerprintPattern, Pencil, Trash2 } from '@lucide/svelte';
	import { onMount } from 'svelte';

	interface Props {
		onClose: () => void;
	}

	const { onClose }: Props = $props();

	let passkeys = $state<PasskeyInfo[]>([]);
	let loading = $state<boolean>(true);
	let loadError = $state<string | null>(null);
	let busy = $state<boolean>(false);
	let supported = $state<boolean>(false);
	let nameModalOpen = $state<boolean>(false);
	let renameTarget = $state<PasskeyInfo | null>(null);
	let recoveryCodes = $state<string[] | null>(null);

	async function load() {
		loading = true;
		loadError = null;
		try {
			passkeys = await fetchPasskeys();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		loading = false;
	}

	onMount(() => {
		supported = typeof window.PublicKeyCredential !== 'undefined';
		void load();
	});

	function openAdd() {
		renameTarget = null;
		nameModalOpen = true;
	}

	function openRename(passkey: PasskeyInfo) {
		renameTarget = passkey;
		nameModalOpen = true;
	}

	async function handleNameSubmit(name: string) {
		const target = renameTarget;
		nameModalOpen = false;
		renameTarget = null;
		busy = true;
		try {
			if (target) {
				await withStepUp(() => renamePasskey(target.id, name));
			} else {
				const result = await withStepUp(() => registerPasskey(name));
				if (result.recovery_codes) {
					recoveryCodes = result.recovery_codes;
				}
			}
			await load();
		} catch (error) {
			// Prompt WebAuthn refusé/fermé par l'utilisateur : abandon silencieux.
			if (!(error instanceof Error && error.name === 'NotAllowedError')) {
				alertUnlessCancelled(error);
			}
		}
		busy = false;
	}

	async function handleDelete(passkey: PasskeyInfo) {
		if (
			!window.confirm(
				`Supprimer la passkey « ${passkey.friendly_name} » ? Si c'est ta dernière méthode, tes codes de récupération et appareils de confiance seront supprimés.`
			)
		) {
			return;
		}
		busy = true;
		try {
			await withStepUp(() => deletePasskey(passkey.id));
		} catch (error) {
			alertUnlessCancelled(error);
		}
		await load();
		busy = false;
	}
</script>

<div
	id="passkeys-manage-modal"
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	aria-label="Gérer les passkeys"
	aria-modal="true"
	role="dialog"
>
	<OverlayBackdrop />
	<div
		class="border-light-blue/20 relative w-full max-w-md rounded-2xl border bg-[#060a2c] p-5 sm:p-6"
	>
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">Passkeys</p>

		{#if loading}
			<p class="text-dark-light-blue m-0 text-sm">Chargement…</p>
		{:else if loadError}
			<p class="m-0 mb-3 text-sm text-red-400">{loadError}</p>
			<CtaButton fullWidth={false} onclick={() => void load()} size="sm" variant="secondary">
				Réessayer
			</CtaButton>
		{:else if passkeys.length === 0}
			<p class="text-dark-light-blue m-0 mb-3 text-sm">Aucune passkey enregistrée.</p>
		{:else}
			<ul class="m-0 mb-3 grid list-none gap-2 p-0">
				{#each passkeys as passkey (passkey.id)}
					<li
						id={`passkey-row-${passkey.id}`}
						class="border-light-blue/10 bg-dark-blue/40 flex items-center gap-3 rounded-xl border p-3"
					>
						<FingerprintPattern class="text-dark-light-blue size-5 shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-light-blue m-0 truncate text-sm font-medium">
								{passkey.friendly_name}
							</p>
							<p class="text-dark-light-blue/80 m-0 truncate text-xs">
								{formatParisDateTimeShort(passkey.created_at)}
							</p>
						</div>
						<button
							id={`passkey-rename-${passkey.id}`}
							class="text-dark-light-blue hover:bg-light-blue/10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-2 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label="Renommer cette passkey"
							disabled={busy}
							onclick={() => {
								openRename(passkey);
							}}
							title="Renommer cette passkey"
							type="button"
						>
							<Pencil class="size-4" />
						</button>
						<button
							id={`passkey-delete-${passkey.id}`}
							class="shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-2 text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label="Supprimer cette passkey"
							disabled={busy}
							onclick={() => void handleDelete(passkey)}
							title="Supprimer cette passkey"
							type="button"
						>
							<Trash2 class="size-4" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if !loading && !loadError && !supported}
			<p class="text-dark-light-blue m-0 mb-3 text-xs">
				Ce navigateur ne prend pas en charge les passkeys.
			</p>
		{/if}

		<div class="mt-2 flex items-center justify-between gap-2">
			{#if supported}
				<CtaButton
					id="passkey-add"
					disabled={busy || loading}
					fullWidth={false}
					onclick={openAdd}
					size="sm"
					variant="secondary"
				>
					Ajouter une passkey
				</CtaButton>
			{:else}
				<span></span>
			{/if}
			<button
				class="text-dark-light-blue cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm hover:underline"
				onclick={onClose}
				type="button"
			>
				Fermer
			</button>
		</div>
	</div>
</div>

{#if nameModalOpen}
	<PasskeyNameModal
		confirmLabel={renameTarget ? 'Renommer' : 'Continuer'}
		description={renameTarget
			? null
			: 'Donne-lui un nom pour la retrouver, puis suis les instructions de ton navigateur.'}
		initialName={renameTarget?.friendly_name ?? ''}
		onCancel={() => {
			nameModalOpen = false;
			renameTarget = null;
		}}
		onSubmit={(name) => {
			void handleNameSubmit(name);
		}}
		title={renameTarget ? 'Renommer la passkey' : 'Ajouter une passkey'}
	/>
{/if}

{#if recoveryCodes}
	<RecoveryCodesModal codes={recoveryCodes} onClose={() => (recoveryCodes = null)} />
{/if}
