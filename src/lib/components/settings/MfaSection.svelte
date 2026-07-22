<script lang="ts">
	import MfaEnrollModal from '$lib/components/modals/MfaEnrollModal.svelte';
	import PasskeyNameModal from '$lib/components/modals/PasskeyNameModal.svelte';
	import PasskeysManageModal from '$lib/components/modals/PasskeysManageModal.svelte';
	import RecoveryCodesModal from '$lib/components/modals/RecoveryCodesModal.svelte';
	import TotpEnrollModal from '$lib/components/modals/TotpEnrollModal.svelte';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import {
		disableMfaMethod,
		fetchMfaState,
		regenerateRecoveryCodes,
		startEmailEnrollment,
		startTotpEnrollment,
		type MfaState,
		type TotpEnrollmentInfo
	} from '@davincibot/lib/settings';
	import { registerPasskey } from '@davincibot/lib/settings';
	import { alertUnlessCancelled, withStepUp } from '@davincibot/lib/settings';
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

<section
	id="mfa-section"
	class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5"
>
	<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
		Vérification en deux étapes
	</p>
	{#if loading}
		<p class="text-dark-light-blue m-0 text-sm">Chargement…</p>
	{:else if loadError}
		<p class="m-0 mb-3 text-sm text-red-400">{loadError}</p>
		<CtaButton variant="secondary" size="sm" fullWidth={false} onclick={() => void load()}>
			Réessayer
		</CtaButton>
	{:else}
		<div class="grid gap-3">
			<div
				class="border-light-blue/10 bg-dark-blue/40 flex flex-wrap items-center gap-3 rounded-xl border p-3"
			>
				<Mail class="text-dark-light-blue size-5 shrink-0" />
				<div class="min-w-0 flex-1 basis-48">
					<p class="text-light-blue m-0 text-sm font-medium">Code par e-mail</p>
					<p class="text-dark-light-blue/80 m-0 text-xs">
						Un code à 6 chiffres envoyé par e-mail à la connexion.
					</p>
				</div>
				{#if emailMethod}
					<button
						id="mfa-disable-email"
						type="button"
						class="ml-auto shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={busy}
						onclick={() => void handleDisable(emailMethod.id, 'Code par e-mail', 'disable-email')}
					>
						{busyAction === 'disable-email' ? 'Chargement…' : 'Désactiver'}
					</button>
				{:else}
					<div class="ml-auto shrink-0">
						<CtaButton
							id="mfa-enable-email"
							variant="secondary"
							size="sm"
							fullWidth={false}
							disabled={busy || enrollingEmail}
							onclick={() => void handleEnableEmail()}
						>
							{busyAction === 'enable-email' ? 'Envoi…' : 'Activer'}
						</CtaButton>
					</div>
				{/if}
			</div>

			<div
				class="border-light-blue/10 bg-dark-blue/40 flex flex-wrap items-center gap-3 rounded-xl border p-3"
			>
				<Smartphone class="text-dark-light-blue size-5 shrink-0" />
				<div class="min-w-0 flex-1 basis-48">
					<p class="text-light-blue m-0 text-sm font-medium">Application d'authentification</p>
					<p class="text-dark-light-blue/80 m-0 text-xs">
						Un code généré par 1Password, Google Authenticator, etc.
					</p>
				</div>
				{#if totpMethod}
					<button
						id="mfa-disable-totp"
						type="button"
						class="ml-auto shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={busy}
						onclick={() =>
							void handleDisable(totpMethod.id, "Application d'authentification", 'disable-totp')}
					>
						{busyAction === 'disable-totp' ? 'Chargement…' : 'Désactiver'}
					</button>
				{:else}
					<div class="ml-auto shrink-0">
						<CtaButton
							id="mfa-enable-totp"
							variant="secondary"
							size="sm"
							fullWidth={false}
							disabled={busy || totpEnrollment !== null}
							onclick={() => void handleEnableTotp()}
						>
							{busyAction === 'enable-totp' ? 'Chargement…' : 'Activer'}
						</CtaButton>
					</div>
				{/if}
			</div>

			<div
				class="border-light-blue/10 bg-dark-blue/40 flex flex-wrap items-center gap-3 rounded-xl border p-3"
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
						<CtaButton
							id="mfa-manage-passkeys"
							variant="secondary"
							size="sm"
							fullWidth={false}
							disabled={busy}
							onclick={() => (managingPasskeys = true)}
						>
							Gérer
						</CtaButton>
					{:else}
						<CtaButton
							id="mfa-enable-passkey"
							variant="secondary"
							size="sm"
							fullWidth={false}
							disabled={busy || enrollingPasskey || !passkeySupported}
							title={passkeySupported
								? undefined
								: 'Ce navigateur ne prend pas en charge les passkeys.'}
							onclick={() => (enrollingPasskey = true)}
						>
							{busyAction === 'enable-passkey' ? 'Chargement…' : 'Activer'}
						</CtaButton>
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
				<CtaButton
					variant="secondary"
					size="sm"
					fullWidth={false}
					disabled={busy}
					onclick={() => void handleRegenerate()}
				>
					{busyAction === 'regenerate' ? 'Génération…' : 'Régénérer les codes'}
				</CtaButton>
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
			title="Ajouter une passkey"
			description="Donne-lui un nom pour la retrouver, puis suis les instructions de ton navigateur."
			confirmLabel="Continuer"
			onSubmit={(name) => {
				void handleEnablePasskey(name);
			}}
			onCancel={() => (enrollingPasskey = false)}
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
