<script lang="ts">
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
			<p class="mt-1 text-sm text-gray-400">
				Les domaines servent à reconnaître le partenaire dans le lien d'un item. Seule une
				<strong>enveloppe de crédit</strong> se modélise : une remise n'a pas de solde à décompter.
			</p>
		</div>
		<button
			class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
			onclick={() => (creating = !creating)}
			type="button">{creating ? 'Annuler' : 'Nouveau partenariat'}</button
		>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	{#if creating}
		<form
			class="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-4"
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
				<label class="text-xs text-gray-300">
					Nom
					<input
						name="name"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
					/>
				</label>
				<label class="flex-1 text-xs text-gray-300">
					Domaines
					<input
						name="domains"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						placeholder="mouser"
					/>
				</label>
			</div>
			<label class="mt-3 block text-xs text-gray-300">
				Notes
				<textarea
					name="notes"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					rows="2"></textarea>
			</label>
			<label class="mt-3 flex items-center gap-2 text-sm text-gray-300">
				<input
					name="envelope"
					class="size-4 rounded border-gray-600 bg-gray-700"
					type="checkbox"
					value="1"
					bind:checked={withEnvelope}
				/>
				Ce partenariat donne droit à une enveloppe à consommer chez lui
			</label>
			{#if withEnvelope}
				<label class="mt-2 block text-xs text-gray-300">
					Montant de l'enveloppe
					<input
						name="opening_balance"
						class="mt-1 block w-32 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						inputmode="decimal"
						value="0,00"
					/>
				</label>
				<p class="mt-1 text-xs text-gray-500">
					Un compte dédié sera créé. Il n'entre jamais dans le solde de trésorerie : c'est un avoir
					chez un tiers, pas de l'argent en banque.
				</p>
			{/if}
			<button
				class="bg-primary-600 hover:bg-primary-800 mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white"
				type="submit">Créer</button
			>
		</form>
	{/if}

	{#if active.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			Aucun partenariat actif.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each active as partner (partner.id)}
				<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="flex flex-wrap items-center gap-3">
						<span class="font-medium text-white">{partner.name}</span>
						<span class="text-xs text-gray-500">{partner.schoolYearLabel}</span>
						{#each partner.domains as domain (domain)}
							<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
								>{domain}</span
							>
						{/each}
						{#if partner.domains.length === 0}
							<span class="text-xs text-amber-300">aucun domaine — non reconnu dans les liens</span>
						{/if}
						{#if partner.accountName}
							<span class="ml-auto text-sm">
								<span class="text-gray-400">{partner.accountName} :</span>
								<span class="font-medium text-gray-100"
									>{euro.format(partner.accountBalance ?? 0)}</span
								>
							</span>
						{/if}
					</div>
					{#if partner.notes}
						<p class="mt-2 rounded bg-gray-700/50 px-2 py-1 text-sm text-gray-300">
							{partner.notes}
						</p>
					{/if}
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<button
							class="text-xs text-gray-400 underline hover:text-gray-200"
							onclick={() => (editing = editing === partner.id ? null : partner.id)}
							type="button">modifier</button
						>
						<form action="?/archive" method="POST" use:enhance>
							<input name="id" type="hidden" value={partner.id} />
							<button class="text-xs text-gray-400 underline hover:text-gray-200" type="submit"
								>archiver</button
							>
						</form>
					</div>

					{#if editing === partner.id}
						<form
							class="mt-3 rounded-lg border border-gray-600 bg-gray-900/60 p-3"
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
								<label class="text-xs text-gray-300">
									Nom
									<input
										name="name"
										class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
										required
										value={partner.name}
									/>
								</label>
								<label class="flex-1 text-xs text-gray-300">
									Domaines
									<input
										name="domains"
										class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
										value={partner.domains.join(', ')}
									/>
								</label>
							</div>
							<label class="mt-3 block text-xs text-gray-300">
								Notes
								<textarea
									name="notes"
									class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
									rows="2">{partner.notes ?? ''}</textarea
								>
							</label>
							<button
								class="bg-primary-600 hover:bg-primary-800 mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white"
								type="submit">Enregistrer</button
							>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if archived.length > 0}
		<h2 class="mt-8 mb-2 text-sm font-semibold tracking-wide text-gray-400 uppercase">Archivés</h2>
		<ul class="space-y-1 text-sm text-gray-500">
			{#each archived as partner (partner.id)}
				<li>{partner.name} · {partner.domains.join(', ') || 'aucun domaine'}</li>
			{/each}
		</ul>
	{/if}
</section>
