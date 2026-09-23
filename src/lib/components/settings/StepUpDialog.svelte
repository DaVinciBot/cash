<script lang="ts">
	import { Button, CodeInput, OverlayBackdrop } from '@davincibot/components';
	import { stepUpChallenge, stepUpVerify, stepUpVerifyWebauthn } from '$lib/settings';
	import { stepUpRequest, type StepUpRequest } from '$lib/settings';
	import { onDestroy } from 'svelte';

	type DialogMode = 'password' | 'email' | 'totp' | 'recovery' | 'webauthn';

	let request = $state<StepUpRequest | null>(null);
	let mode = $state<DialogMode | null>(null);
	let methods = $state<string[]>([]);
	let email = $state<string | null>(null);
	let chooserOpen = $state<boolean>(false);
	let emailChallengeDone = $state<boolean>(false);
	let code = $state('');
	let recoveryCode = $state('');
	let password = $state('');
	let busy = $state<boolean>(false);
	let resending = $state<boolean>(false);
	let errorMessage = $state<string | null>(null);
	let resendCooldown = $state(0);

	let cooldownTimer: ReturnType<typeof setInterval> | null = null;

	const otherModes = $derived(
		(
			[
				{ id: 'webauthn', label: 'Passkey' },
				{ id: 'email', label: 'Code reçu par e-mail' },
				{ id: 'totp', label: "Application d'authentification" },
				{ id: 'recovery', label: 'Code de récupération' }
			] as { id: DialogMode; label: string }[]
		).filter(
			(option) => option.id !== mode && (option.id === 'recovery' || methods.includes(option.id))
		)
	);

	const unsubscribe = stepUpRequest.subscribe((value) => {
		const opening = value !== null && request === null;
		request = value;
		if (opening) {
			void open();
		}
	});
	onDestroy(() => {
		unsubscribe();
		if (cooldownTimer) {
			clearInterval(cooldownTimer);
		}
	});

	function startCooldown(seconds: number) {
		resendCooldown = seconds;
		if (cooldownTimer) {
			clearInterval(cooldownTimer);
		}
		cooldownTimer = setInterval(() => {
			resendCooldown -= 1;
			if (resendCooldown <= 0 && cooldownTimer) {
				clearInterval(cooldownTimer);
				cooldownTimer = null;
			}
		}, 1000);
	}

	async function open() {
		mode = null;
		methods = [];
		email = null;
		chooserOpen = false;
		emailChallengeDone = false;
		code = '';
		recoveryCode = '';
		password = '';
		errorMessage = null;
		busy = true;
		try {
			const challenge = await stepUpChallenge();
			mode = challenge.method;
			methods = challenge.methods;
			email = challenge.email;
			if (challenge.method === 'email') {
				emailChallengeDone = true;
				startCooldown(30);
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		busy = false;
		// Tentative immédiate quand la passkey est la méthode servie ; le bouton
		// reste affiché si le navigateur exige un geste utilisateur (Safari).
		if (mode === 'webauthn' && errorMessage === null) {
			await handleWebauthn();
		}
	}

	async function handleWebauthn() {
		busy = true;
		errorMessage = null;
		try {
			await stepUpVerifyWebauthn();
			busy = false;
			request?.resolve(true);
			return;
		} catch (error) {
			// Prompt refusé/fermé par l'utilisateur : on reste sur le dialogue sans erreur.
			if (!(error instanceof Error && error.name === 'NotAllowedError')) {
				errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
			}
		}
		busy = false;
	}

	// Déclenche (ou renvoie) le code email — utilisé au premier passage sur la
	// méthode e-mail et par le bouton « Renvoyer ».
	async function requestEmailChallenge() {
		errorMessage = null;
		resending = true;
		try {
			const challenge = await stepUpChallenge('email');
			email = challenge.email;
			emailChallengeDone = true;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		startCooldown(30);
		resending = false;
	}

	function chooseMode(next: DialogMode) {
		mode = next;
		chooserOpen = false;
		errorMessage = null;
		code = '';
		if (next === 'email' && !emailChallengeDone) {
			void requestEmailChallenge();
		}
		if (next === 'webauthn') {
			void handleWebauthn();
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (mode === 'webauthn') {
			await handleWebauthn();
			return;
		}
		busy = true;
		errorMessage = null;
		try {
			await stepUpVerify(
				mode === 'password'
					? { password }
					: mode === 'recovery'
						? { recovery_code: recoveryCode }
						: { code, method: mode === 'totp' ? 'totp' : 'email' }
			);
			busy = false;
			request?.resolve(true);
			return;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		busy = false;
	}

	function cancel() {
		request?.resolve(false);
	}
</script>

{#if request}
	<div
		id="step-up-dialog"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		aria-label="Confirmation de sécurité"
		aria-modal="true"
		role="dialog"
	>
		<OverlayBackdrop />
		<div
			class="border-rule bg-surface-modal relative w-full max-w-md rounded-2xl border p-5 sm:p-6"
		>
			<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
				Confirmation de sécurité
			</p>

			{#if mode === null}
				<p class="text-dark-light-blue m-0 text-sm">
					{errorMessage ?? 'Chargement…'}
				</p>
				<div class="mt-4 flex justify-end gap-2">
					{#if errorMessage}
						<Button onclick={() => void open()} size="sm" variant="secondary">Réessayer</Button>
					{/if}
					<Button onclick={cancel} size="sm" variant="ghost">Annuler</Button>
				</div>
			{:else if chooserOpen}
				<p class="text-light-blue m-0 mb-4 text-sm">Choisis une autre méthode de vérification.</p>
				<div class="grid gap-2">
					{#each otherModes as option (option.id)}
						<Button
							class="w-full"
							onclick={() => {
								chooseMode(option.id);
							}}
							size="md"
							variant="secondary"
						>
							{option.label}
						</Button>
					{/each}
				</div>
				<div class="mt-4 flex items-center justify-between gap-2">
					<Button onclick={() => (chooserOpen = false)} size="sm" variant="ghost">
						Retour à la saisie
					</Button>
					<Button onclick={cancel} size="sm" variant="ghost">Annuler</Button>
				</div>
			{:else}
				<p class="text-light-blue m-0 mb-4 text-sm">
					{mode === 'webauthn'
						? "Confirme avec ta passkey : empreinte, visage ou code de l'appareil."
						: mode === 'password'
							? 'Confirme ton mot de passe pour continuer.'
							: mode === 'recovery'
								? 'Saisis un de tes codes de récupération à usage unique.'
								: mode === 'totp'
									? "Saisis le code de ton application d'authentification."
									: email
										? `Saisis le code envoyé à ${email}.`
										: 'Saisis le code reçu par e-mail.'}
				</p>
				<form class="grid gap-4" onsubmit={handleSubmit}>
					{#if mode === 'password'}
						<input
							id="step-up-password"
							class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
							aria-label="Mot de passe actuel"
							autocomplete="current-password"
							disabled={busy}
							placeholder="********"
							type="password"
							bind:value={password}
						/>
					{:else if mode === 'webauthn'}
						<!-- Pas de saisie : la cérémonie se joue dans le prompt du navigateur. -->
					{:else if mode === 'recovery'}
						<input
							id="step-up-recovery"
							class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 block w-full rounded-xl border p-2.5 font-mono text-sm tracking-widest focus:outline-none focus-visible:ring-2 disabled:opacity-50"
							aria-label="Code de récupération"
							autocomplete="off"
							disabled={busy}
							placeholder="XXXXX-XXXXX"
							spellcheck="false"
							type="text"
							bind:value={recoveryCode}
						/>
					{:else}
						<div class="grid gap-2">
							<CodeInput id="step-up-code" disabled={busy} bind:value={code} />
							{#if mode === 'email'}
								<Button
									disabled={busy || resending || resendCooldown > 0}
									onclick={() => void requestEmailChallenge()}
									size="sm"
									variant="ghost"
								>
									{resending
										? 'Envoi…'
										: resendCooldown > 0
											? `Renvoyer le code (${String(resendCooldown)}s)`
											: 'Renvoyer le code'}
								</Button>
							{/if}
						</div>
					{/if}

					{#if errorMessage}
						<p class="m-0 text-sm text-red-400">{errorMessage}</p>
					{/if}

					<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
						{#if mode !== 'password'}
							<Button
								onclick={() => {
									chooserOpen = true;
									errorMessage = null;
								}}
								size="sm"
								variant="ghost"
							>
								Utiliser une autre méthode
							</Button>
						{/if}
						<div class="flex items-center justify-end gap-2 sm:ml-auto">
							<Button onclick={cancel} size="sm" variant="ghost">Annuler</Button>
							<Button
								id={mode === 'webauthn' ? 'step-up-passkey' : 'step-up-confirm'}
								disabled={busy}
								size="sm"
								type="submit"
								variant="secondary"
							>
								{busy
									? 'Vérification…'
									: mode === 'webauthn'
										? 'Confirmer avec ma passkey'
										: 'Confirmer'}
							</Button>
						</div>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
