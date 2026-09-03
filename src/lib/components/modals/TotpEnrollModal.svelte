<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { CodeInput } from '@davincibot/components';
	import { CtaButton } from '@davincibot/components';
	import { verifyTotpEnrollment, type TotpEnrollmentInfo } from '$lib/settings';
	import { StepUpCancelledError, withStepUp } from '$lib/settings';
	import { Copy } from '@lucide/svelte';
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';

	interface Props {
		enrollment: TotpEnrollmentInfo;
		onClose: () => void;
		onVerified: (recoveryCodes: string[] | null) => void;
	}

	let { enrollment, onClose, onVerified }: Props = $props();

	let qrDataUrl = $state<string | null>(null);
	let code = $state('');
	let busy = $state<boolean>(false);
	let copied = $state<boolean>(false);
	let errorMessage = $state<string | null>(null);

	onMount(() => {
		void QRCode.toDataURL(enrollment.otpauth_url, { width: 220, margin: 1 }).then(
			(url) => (qrDataUrl = url),
			() => (qrDataUrl = null)
		);
	});

	async function handleCopySecret() {
		try {
			await navigator.clipboard.writeText(enrollment.secret);
			copied = true;
		} catch {
			alert('La copie a échoué. Recopie la clé à la main.');
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!code) {
			return;
		}
		busy = true;
		errorMessage = null;
		try {
			const codes = await withStepUp(() => verifyTotpEnrollment(code));
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
</script>

<div
	id="totp-enroll-modal"
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	aria-label="Activer une application d'authentification"
	aria-modal="true"
	role="dialog"
>
	<OverlayBackdrop />
	<div
		class="border-light-blue/20 relative w-full max-w-md rounded-2xl border bg-[#060a2c] p-5 sm:p-6"
	>
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
			Application d'authentification
		</p>
		<p class="text-light-blue m-0 mb-4 text-sm">
			Scanne ce QR code avec ton application (1Password, Google Authenticator…), ou saisis la clé
			manuellement, puis entre le code affiché.
		</p>

		<div class="mb-4 flex flex-col items-center gap-3">
			{#if qrDataUrl}
				<img
					class="rounded-xl bg-white p-2"
					alt="QR code d'activation"
					height="220"
					src={qrDataUrl}
					width="220"
				/>
			{:else}
				<p class="text-dark-light-blue m-0 text-sm">Génération du QR code…</p>
			{/if}
			<div
				class="border-light-blue/10 bg-dark-blue/40 flex w-full items-center justify-between gap-2 rounded-xl border p-2.5"
			>
				<code class="text-light-blue min-w-0 truncate font-mono text-xs">{enrollment.secret}</code>
				<button
					class="text-dark-light-blue flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1 text-xs hover:underline"
					onclick={() => void handleCopySecret()}
					type="button"
				>
					<Copy class="size-3.5" />
					{copied ? 'Copiée !' : 'Copier'}
				</button>
			</div>
		</div>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<CodeInput id="totp-enroll-code" disabled={busy} bind:value={code} />

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
