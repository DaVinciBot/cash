<script lang="ts">
	import MfaEnrollModal from '$lib/components/modals/MfaEnrollModal.svelte';
	import PasskeyNameModal from '$lib/components/modals/PasskeyNameModal.svelte';
	import PasskeysManageModal from '$lib/components/modals/PasskeysManageModal.svelte';
	import RecoveryCodesModal from '$lib/components/modals/RecoveryCodesModal.svelte';
	import TotpEnrollModal from '$lib/components/modals/TotpEnrollModal.svelte';
	import { Button } from '@davincibot/components';
	import {
		disableMfaMethod,
		fetchMfaState,
		regenerateRecoveryCodes,
		startEmailEnrollment,
		startTotpEnrollment,
		type MfaState,
		type TotpEnrollmentInfo
	} from '$lib/settings';
	import { registerPasskey } from '$lib/settings';
	import { alertUnlessCancelled, withStepUp } from '$lib/settings';
	import { FingerprintPattern, KeyRound, Mail, Smartphone } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let mfaState = $state<MfaState | null>(null);
	let loading = $state<boolean>(true);
	let loadError = $state<string | null>(null);
	let busyAction = $state<string | null>(null);
	let enrollingEmail = $state<boolean>(false);
	let enrollEmail = $state<string | null>(null);
	let totpEnrollment = $state<TotpEnrollmentInfo | null>(null);
	let enrollingPasskey = $state<boolean>(false);
	let managingPasskeys = $state<boolean>(false);
	let passkeySupported = $state<boolean>(false);
	let recoveryCodes = $state<string[] | null>(null);

	const emailMethod = $derived(
		mfaState?.methods.find((method) => method.method_type === 'email') ?? null
	);
	const totpMethod = $derived(
		mfaState?.methods.find((method) => method.method_type === 'totp') ?? null
	);
	const webauthnMethod = $derived(
		mfaState?.methods.find((method) => method.method_type === 'webauthn') ?? null
	);
	const busy = $derived(busyAction !== null);

	async function load() {
		loading = true;
		loadError = null;
		try {
			mfaState = await fetchMfaState();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		loading = false;
	}

	onMount(() => {
		passkeySupported = typeof window.PublicKeyCredential !== 'undefined';
		void load();
	});

	async function handleEnableEmail() {
		busyAction = 'enable-email';
		try {
			enrollEmail = await withStepUp(() => startEmailEnrollment());
			enrollingEmail = true;
		} catch (error) {
			alertUnlessCancelled(error);
		}
		busyAction = null;
	}

	async function handleEnableTotp() {
		busyAction = 'enable-totp';
		try {
			totpEnrollment = await withStepUp(() => startTotpEnrollment());
		} catch (error) {
			alertUnlessCancelled(error);
		}
		busyAction = null;
	}

	function handleVerified(codes: string[] | null) {
		enrollingEmail = false;
		totpEnrollment = null;
		recoveryCodes = codes;
		void load();
	}

	async function handleEnablePasskey(name: string) {
		enrollingPasskey = false;
		busyAction = 'enable-passkey';
		try {
			const result = await withStepUp(() => registerPasskey(name));
			handleVerified(result.recovery_codes);
		} catch (error) {
			// Prompt WebAuthn refusé/fermé par l'utilisateur : abandon silencieux.
			if (!(error instanceof Error && error.name === 'NotAllowedError')) {
				alertUnlessCancelled(error);
			}
		}
		busyAction = null;
	}

	async function handleDisable(methodId: string, label: string, action: string) {
		if (
			!window.confirm(
				`Désactiver « ${label} » ? Si c'est ta dernière méthode, tes codes de récupération et appareils de confiance seront supprimés.`
			)
		) {
			return;
		}
		busyAction = action;
		try {
			await withStepUp(() => disableMfaMethod(methodId));
			await load();
		} catch (error) {
			alertUnlessCancelled(error);
		}
		busyAction = null;
	}

	async function handleRegenerate() {
		if (
			!window.confirm('Régénérer les codes de récupération ? Les anciens ne fonctionneront plus.')
		) {
			return;
		}
		busyAction = 'regenerate';
		try {
			recoveryCodes = await withStepUp(() => regenerateRecoveryCodes());
			await load();
		} catch (error) {
			alertUnlessCancelled(error);
		}
		busyAction = null;
	}
</script>

<section id="mfa-section" class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
	<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
		Vérification en deux étapes
	</p>
	{#if loading}
		<p class="text-dark-light-blue m-0 text-sm">Chargement…</p>
	{:else if loadError}
		<p class="m-0 mb-3 text-sm text-red-400">{loadError}</p>
		<Button onclick={() => void load()} size="sm" variant="secondary">Réessayer</Button>
	{:else}
		<div class="grid gap-3">
			<div
				class="border-rule bg-dark-blue/40 flex flex-wrap items-center gap-3 rounded-xl border p-3"
			>
				<Mail class="text-dark-light-blue size-5 shrink-0" />
				<div class="min-w-0 flex-1 basis-48">
					<p class="text-light-blue m-0 text-sm font-medium">Code par e-mail</p>
					<p class="text-dark-light-blue/80 m-0 text-xs">
						Un code à 6 chiffres envoyé par e-mail à la connexion.
					</p>
				</div>
				{#if emailMethod}
					<Button
						id="mfa-disable-email"
						class="ml-auto shrink-0"
						disabled={busy}
						onclick={() => void handleDisable(emailMethod.id, 'Code par e-mail', 'disable-email')}
						size="sm"
						variant="danger-ghost"
					>
						{busyAction === 'disable-email' ? 'Chargement…' : 'Désactiver'}
					</Button>
				{:else}
					<div class="ml-auto shrink-0">
						<Button
							id="mfa-enable-email"
							disabled={busy || enrollingEmail}
							onclick={() => void handleEnableEmail()}
							size="sm"
							variant="secondary"
						>
							{busyAction === 'enable-email' ? 'Envoi…' : 'Activer'}
						</Button>
					</div>
				{/if}
			</div>

			<div
				class="border-rule bg-dark-blue/40 flex flex-wrap items-center gap-3 rounded-xl border p-3"
			>
				<Smartphone class="text-dark-light-blue size-5 shrink-0" />
				<div class="min-w-0 flex-1 basis-48">
					<p class="text-light-blue m-0 text-sm font-medium">Application d'authentification</p>
					<p class="text-dark-light-blue/80 m-0 text-xs">
						Un code généré par 1Password, Google Authenticator, etc.
					</p>
				</div>
				{#if totpMethod}
					<Button
						id="mfa-disable-totp"
						class="ml-auto shrink-0"
						disabled={busy}
						onclick={() =>
							void handleDisable(totpMethod.id, "Application d'authentification", 'disable-totp')}
						size="sm"
						variant="danger-ghost"
					>
						{busyAction === 'disable-totp' ? 'Chargement…' : 'Désactiver'}
					</Button>
				{:else}
					<div class="ml-auto shrink-0">
						<Button
							id="mfa-enable-totp"
							disabled={busy || totpEnrollment !== null}
							onclick={() => void handleEnableTotp()}
							size="sm"
							variant="secondary"
						>
							{busyAction === 'enable-totp' ? 'Chargement…' : 'Activer'}
						</Button>
					</div>
				{/if}
			</div>

			<div
				class="border-rule bg-dark-blue/40 flex flex-wrap items-center gap-3 rounded-xl border p-3"
			>
				<FingerprintPattern class="text-dark-light-blue size-5 shrink-0" />
				<div class="min-w-0 flex-1 basis-48">
					<p class="text-light-blue m-0 text-sm font-medium">Passkey</p>
					<p class="text-dark-light-blue/80 m-0 text-xs">
						Empreinte, visage ou code de l'appareil.
					</p>
				</div>
				<div class="ml-auto shrink-0">
					{#if webauthnMethod}
						<Button
							id="mfa-manage-passkeys"
							disabled={busy}
							onclick={() => (managingPasskeys = true)}
							size="sm"
							variant="secondary"
						>
							Gérer
						</Button>
					{:else}
						<Button
							id="mfa-enable-passkey"
							disabled={busy || enrollingPasskey || !passkeySupported}
							onclick={() => (enrollingPasskey = true)}
							size="sm"
							title={passkeySupported
								? undefined
								: 'Ce navigateur ne prend pas en charge les passkeys.'}
							variant="secondary"
						>
							{busyAction === 'enable-passkey' ? 'Chargement…' : 'Activer'}
						</Button>
					{/if}
				</div>
			</div>
		</div>

		{#if mfaState && mfaState.methods.length > 0}
			<div class="mt-3 flex flex-wrap items-center justify-between gap-2">
				<p class="text-dark-light-blue m-0 flex items-center gap-1.5 text-xs">
					<KeyRound class="size-4 shrink-0" />
					{mfaState.recovery_codes_remaining} codes de récupération restants
				</p>
				<Button
					disabled={busy}
					onclick={() => void handleRegenerate()}
					size="sm"
					variant="secondary"
				>
					{busyAction === 'regenerate' ? 'Génération…' : 'Régénérer les codes'}
				</Button>
			</div>
		{/if}
	{/if}

	{#if enrollingEmail}
		<MfaEnrollModal
			email={enrollEmail}
			onClose={() => (enrollingEmail = false)}
			onVerified={handleVerified}
		/>
	{/if}

	{#if totpEnrollment}
		<TotpEnrollModal
			enrollment={totpEnrollment}
			onClose={() => (totpEnrollment = null)}
			onVerified={handleVerified}
		/>
	{/if}

	{#if enrollingPasskey}
		<PasskeyNameModal
			confirmLabel="Continuer"
			description="Donne-lui un nom pour la retrouver, puis suis les instructions de ton navigateur."
			onCancel={() => (enrollingPasskey = false)}
			onSubmit={(name) => {
				void handleEnablePasskey(name);
			}}
			title="Ajouter une passkey"
		/>
	{/if}

	{#if managingPasskeys}
		<PasskeysManageModal
			onClose={() => {
				managingPasskeys = false;
				void load();
			}}
		/>
	{/if}

	{#if recoveryCodes}
		<RecoveryCodesModal codes={recoveryCodes} onClose={() => (recoveryCodes = null)} />
	{/if}
</section>
