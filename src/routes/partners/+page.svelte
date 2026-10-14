<script lang="ts">
	import { Button, Checkbox } from '@davincibot/components';
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

	const failure = $derived(form && 'message' in form ? form.message : null);

	let editing = $state<number | null>(null);
	let creating = $state(false);
	let withEnvelope = $state(false);

	const active = $derived(data.partnerships.filter((p) => !p.archivedAt));
	const archived = $derived(data.partnerships.filter((p) => p.archivedAt));
</script>

<svelte:head><title>Partenariats — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-4xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Partenariats</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Les domaines servent à reconnaître le partenaire dans le lien d'un item. Seule une
				<strong>enveloppe de crédit</strong> se modélise : une remise n'a pas de solde à décompter.
			</p>
		</div>
		<Button onclick={() => (creating = !creating)} size="md" variant="primary"
			>{creating ? 'Annuler' : 'Nouveau partenariat'}</Button
		>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if creating}
		<form
			class="border-rule bg-blue-gray/15 mb-4 rounded-lg border p-4"
			action="?/create"
			method="POST"
			use:enhance={() =>
				({ update }) => {
					creating = false;
					withEnvelope = false;
					return update();
				}}
		>
			<input name="school_year_id" type="hidden" value={data.schoolYearId} />
			<div class="flex flex-wrap items-end gap-3">
				<label class="text-dark-light-blue text-xs">
					Nom
					<input
						name="name"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						required
					/>
				</label>
				<label class="text-dark-light-blue flex-1 text-xs">
					Domaines
					<input
						name="domains"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						placeholder="mouser"
					/>
				</label>
			</div>
			<label class="text-dark-light-blue mt-3 block text-xs">
				Notes
				<textarea
					name="notes"
					class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
					rows="2"></textarea>
			</label>
			<label class="text-dark-light-blue mt-3 flex items-center gap-2 text-sm">
				<Checkbox name="envelope" className="size-4" value="1" bind:checked={withEnvelope} />
				Ce partenariat donne droit à une enveloppe à consommer chez lui
			</label>
			{#if withEnvelope}
				<label class="text-dark-light-blue mt-2 block text-xs">
					Montant de l'enveloppe
					<input
						name="opening_balance"
						class="border-rule-strong bg-dark-blue/60 mt-1 block w-32 rounded-xl border p-2.5 text-sm"
						inputmode="decimal"
						value="0,00"
					/>
				</label>
				<p class="text-dark-light-blue/70 mt-1 text-xs">
					Un compte dédié sera créé. Il n'entre jamais dans le solde de trésorerie : c'est un avoir
					chez un tiers, pas de l'argent en banque.
				</p>
			{/if}
			<Button class="mt-3" size="sm" type="submit" variant="primary">Créer</Button>
		</form>
	{/if}

	{#if active.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucun partenariat actif.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each active as partner (partner.id)}
				<li class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
					<div class="flex flex-wrap items-center gap-3">
						<span class="font-medium text-white">{partner.name}</span>
						<span class="text-dark-light-blue/70 text-xs">{partner.schoolYearLabel}</span>
						{#each partner.domains as domain (domain)}
							<span class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
								>{domain}</span
							>
						{/each}
						{#if partner.domains.length === 0}
							<span class="text-xs text-amber-300">aucun domaine — non reconnu dans les liens</span>
						{/if}
						{#if partner.accountName}
							<span class="ml-auto text-sm">
								<span class="text-dark-light-blue">{partner.accountName} :</span>
								<span class="text-light-blue font-medium"
									>{euro.format(partner.accountBalance ?? 0)}</span
								>
							</span>
						{/if}
					</div>
					{#if partner.notes}
						<p class="bg-dark-blue/40 text-dark-light-blue mt-2 rounded px-2 py-1 text-sm">
							{partner.notes}
						</p>
					{/if}
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Button
							onclick={() => (editing = editing === partner.id ? null : partner.id)}
							size="sm"
							variant="ghost">modifier</Button
						>
						<form action="?/archive" method="POST" use:enhance>
							<input name="id" type="hidden" value={partner.id} />
							<Button size="sm" type="submit" variant="danger-ghost">archiver</Button>
						</form>
					</div>

					{#if editing === partner.id}
						<form
							class="border-rule-strong bg-dark-blue/60 mt-3 rounded-lg border p-3"
							action="?/update"
							method="POST"
							use:enhance={() =>
								({ update }) => {
									editing = null;
									return update();
								}}
						>
							<input name="id" type="hidden" value={partner.id} />
							<div class="flex flex-wrap items-end gap-3">
								<label class="text-dark-light-blue text-xs">
									Nom
									<input
										name="name"
										class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
										required
										value={partner.name}
									/>
								</label>
								<label class="text-dark-light-blue flex-1 text-xs">
									Domaines
									<input
										name="domains"
										class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
										value={partner.domains.join(', ')}
									/>
								</label>
							</div>
							<label class="text-dark-light-blue mt-3 block text-xs">
								Notes
								<textarea
									name="notes"
									class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
									rows="2">{partner.notes ?? ''}</textarea
								>
							</label>
							<Button class="mt-3" size="sm" type="submit" variant="primary">Enregistrer</Button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if archived.length > 0}
		<h2 class="text-dark-light-blue mt-8 mb-2 text-sm font-semibold tracking-wide uppercase">
			Archivés
		</h2>
		<ul class="text-dark-light-blue/70 space-y-1 text-sm">
			{#each archived as partner (partner.id)}
				<li>{partner.name} · {partner.domains.join(', ') || 'aucun domaine'}</li>
			{/each}
		</ul>
	{/if}
</section>
