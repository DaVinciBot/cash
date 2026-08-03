<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { CodeInput } from '@davincibot/components';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { startEmailEnrollment, verifyEmailEnrollment } from '$lib/settings';
	import { StepUpCancelledError, withStepUp } from '$lib/settings';
	import { onMount } from 'svelte';

	interface Props {
		email: string | null;
		onClose: () => void;
		onVerified: (recoveryCodes: string[] | null) => void;
	}

	let { email: initialEmail, onClose, onVerified }: Props = $props();

	let email = $state<string | null>(null);
	let code = $state('');
	let busy = $state<boolean>(false);
	let resending = $state<boolean>(false);
	let errorMessage = $state<string | null>(null);
	let resendCooldown = $state(0);

	let cooldownTimer: ReturnType<typeof setInterval> | null = null;

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

	onMount(() => {
		email = initialEmail;
		// Un code vient d'être envoyé à l'ouverture : cooldown avant renvoi.
		startCooldown(30);
		return () => {
			if (cooldownTimer) {
				clearInterval(cooldownTimer);
			}
		};
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!code) {
			return;
		}
		busy = true;
		errorMessage = null;
		try {
			const codes = await withStepUp(() => verifyEmailEnrollment(code));
			busy = false;
			onVerified(codes);
			return;
		} catch (error) {
			if (!(error instanceof StepUpCancelledError)) {
				errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
			}
		}
		busy = false;
	}

	async function handleResend() {
		errorMessage = null;
		resending = true;
		try {
			email = await withStepUp(() => startEmailEnrollment());
			code = '';
		} catch (error) {
			if (!(error instanceof StepUpCancelledError)) {
				errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
			}
		}
		startCooldown(30);
		resending = false;
	}
</script>

<div
	id="mfa-enroll-modal"
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	aria-label="Activer la vérification en deux étapes"
	aria-modal="true"
	role="dialog"
>
	<OverlayBackdrop />
	<div
		class="border-light-blue/20 relative w-full max-w-md rounded-2xl border bg-[#060a2c] p-5 sm:p-6"
	>
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
			Vérification en deux étapes
		</p>
		<p class="text-light-blue m-0 mb-4 text-sm">
			{email
				? `Saisis le code à 6 chiffres envoyé à ${email}.`
				: 'Saisis le code à 6 chiffres reçu par e-mail.'}
		</p>
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<div class="grid gap-2">
				<CodeInput id="mfa-enroll-code" disabled={busy} bind:value={code} />
				<button
					class="text-dark-light-blue cursor-pointer rounded-lg border-0 bg-transparent p-0 text-left text-xs hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
					disabled={busy || resending || resendCooldown > 0}
					onclick={() => void handleResend()}
					type="button"
				>
					{resending
						? 'Envoi…'
						: resendCooldown > 0
							? `Renvoyer le code (${String(resendCooldown)}s)`
							: 'Renvoyer le code'}
				</button>
			</div>

			{#if errorMessage}
				<p class="m-0 text-sm text-red-400">{errorMessage}</p>
			{/if}

			<div class="flex items-center justify-end gap-2">
				<button
					class="text-dark-light-blue cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm hover:underline"
					disabled={busy}
					onclick={onClose}
					type="button"
				>
					Annuler
				</button>
				<CtaButton disabled={busy} fullWidth={false} size="sm" type="submit" variant="secondary">
					{busy ? 'Vérification…' : 'Valider'}
				</CtaButton>
			</div>
		</form>
	</div>
</div>
