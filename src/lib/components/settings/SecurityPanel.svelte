<script lang="ts">
	import ConnectionsSection from '$lib/components/settings/ConnectionsSection.svelte';
	import MfaSection from '$lib/components/settings/MfaSection.svelte';
	import SessionsSection from '$lib/components/settings/SessionsSection.svelte';
	import StepUpDialog from '$lib/components/settings/StepUpDialog.svelte';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { changePassword } from '@davincibot/lib/settings';
	import { StepUpCancelledError, withStepUp } from '@davincibot/lib/settings';

	let password = $state('');
	let confirmation = $state('');
	let saving = $state<boolean>(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!password) {
			alert('Le mot de passe ne peut pas être vide');
			return;
		}
		if (password !== confirmation) {
			alert('Les mots de passe ne correspondent pas');
			return;
		}
		saving = true;
		try {
			await withStepUp(() => changePassword(password));
			alert('Mot de passe modifié.');
			password = '';
			confirmation = '';
		} catch (error) {
			if (!(error instanceof StepUpCancelledError)) {
				alert(error instanceof Error ? error.message : 'Une erreur est survenue');
			}
		}
		saving = false;
	}
</script>

<div class="grid gap-4">
	<section class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
			Changer le mot de passe
		</p>
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<div>
				<label class="text-light-blue mb-2 block text-sm font-medium" for="password">
					Nouveau mot de passe
				</label>
				<input
					id="password"
					name="new-password"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 block w-full rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					autocomplete="new-password"
					disabled={saving}
					placeholder="********"
					type="password"
					bind:value={password}
				/>
			</div>
			<div>
				<label class="text-light-blue mb-2 block text-sm font-medium" for="password-confirm">
					Confirmer le mot de passe
				</label>
				<input
					id="password-confirm"
					name="confirm-password"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 block w-full rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					autocomplete="new-password"
					disabled={saving}
					placeholder="********"
					type="password"
					bind:value={confirmation}
				/>
			</div>
			<CtaButton disabled={saving} fullWidth={false} size="sm" type="submit" variant="secondary">
				{saving ? 'Chargement…' : 'Changer mon mot de passe'}
			</CtaButton>
		</form>
	</section>
	<MfaSection />
	<SessionsSection />
	<ConnectionsSection />
</div>

<StepUpDialog />
