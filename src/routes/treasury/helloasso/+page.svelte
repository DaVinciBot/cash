<script lang="ts">
	// Campagnes HelloAsso de l'année (helloasso-webhooks#1) : la cagnotte de
	// cotisation et le formulaire du WEI changent chaque année, ils se règlent ici
	// plutôt que dans l'environnement du service.
	import { Button, Checkbox } from '@davincibot/components';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const failure = $derived(form && 'message' in form ? form.message : null);
	const saved = $derived(form && 'saved' in form ? form.saved : null);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

	const keepValues: SubmitFunction =
		() =>
		({ update }) =>
			update({ reset: false });

	const FIELD =
		'border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50';
</script>

<svelte:head><title>Campagnes HelloAsso — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/treasury')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Campagnes HelloAsso</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Le service de notifications HelloAsso range chaque paiement selon la campagne qui l'a
			encaissé. Chaque année, indiquez ici le formulaire de cotisation et celui du WEI : le service
			les prend en compte dans la minute, sans redéploiement. Un champ laissé vide garde la valeur
			configurée sur le serveur.
		</p>
	</header>

	{#if data.loadError}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{data.loadError}
		</p>
	{/if}
	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}
	{#if saved}
		<p
			class="mb-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30"
		>
			Campagne « {data.labels[saved]} » enregistrée.
		</p>
	{/if}

	<div class="space-y-4">
		{#each data.settings as setting (setting.handler)}
			<form
				class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5"
				action="?/save"
				method="POST"
				use:enhance={keepValues}
			>
				<input name="handler" type="hidden" value={setting.handler} />
				<fieldset disabled={!data.canWrite}>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-light-blue text-sm font-semibold">{data.labels[setting.handler]}</h2>
						<label class="text-dark-light-blue flex items-center gap-2 text-sm">
							<Checkbox name="enabled" checked={setting.enabled} className="size-4" value="1" />
							Notifications actives
						</label>
					</div>
					<div class="mt-3 grid gap-3 sm:grid-cols-3">
						<label class="text-dark-light-blue text-xs">
							Type de formulaire
							<input name="form_type" class={FIELD} value={setting.formType} />
						</label>
						<label class="text-dark-light-blue text-xs sm:col-span-2">
							Slug du formulaire
							<input
								name="form_slug"
								class={FIELD}
								placeholder={setting.handler === 'wei' ? 'wei-2026' : 'adhesion-2026-2027'}
								value={setting.formSlug}
							/>
						</label>
						{#if setting.handler === 'wei'}
							<label class="text-dark-light-blue text-xs">
								Capacité du séjour
								<input
									name="capacity"
									class={FIELD}
									inputmode="numeric"
									min="1"
									type="number"
									value={setting.capacity ?? ''}
								/>
							</label>
						{/if}
					</div>
					<p class="text-dark-light-blue/70 mt-2 text-xs">
						Le slug est la fin de l'adresse du formulaire sur HelloAsso.
						{#if setting.updatedAt}
							Dernière modification le {day.format(new Date(setting.updatedAt))}.
						{/if}
					</p>
					{#if data.canWrite}
						<Button class="mt-3" size="sm" type="submit" variant="primary">Enregistrer</Button>
					{/if}
				</fieldset>
			</form>
		{/each}
	</div>
</section>
