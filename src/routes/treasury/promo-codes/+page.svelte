<script lang="ts">
	// Codes promotionnels des fournisseurs (#92, #98) : un seul endroit pour les
	// codes de l'association, rapprochés des items par domaine pour être suggérés
	// au moment de commander.
	import { Button, FilterChip } from '@davincibot/components';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { PROMO_STATUS_LABELS, promoStatus, type PromoStatus } from '#lib/promoCodes.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const failure = $derived(form && 'message' in form ? form.message : null);
	const today = new Date().toISOString().slice(0, 10);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	let statusFilter = $state<PromoStatus | 'all'>('active');
	let supplierFilter = $state('');
	let adding = $state(false);

	const withStatus = $derived(
		data.codes.map((code) => ({ ...code, status: promoStatus(code, today) }))
	);
	const visible = $derived(
		withStatus.filter(
			(code) =>
				(statusFilter === 'all' || code.status === statusFilter) &&
				(!supplierFilter.trim() ||
					code.supplier.toLowerCase().includes(supplierFilter.trim().toLowerCase()))
		)
	);
	const counts = $derived(
		withStatus.reduce<Record<string, number>>(
			(acc, code) => {
				acc[code.status] = (acc[code.status] ?? 0) + 1;
				return acc;
			},
			{ all: withStatus.length }
		)
	);

	const STATUS_CLASSES: Record<PromoStatus, string> = {
		active: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
		expired: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
		archived: 'bg-slate-500/20 text-slate-300 ring-slate-500/30'
	};

	const FIELD =
		'border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50';
</script>

<svelte:head><title>Codes promo — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/treasury')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Codes promo</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Les codes de réduction de l'association. Chacun est rattaché au site de son fournisseur :
				quand un membre saisit un lien vers ce site, ou qu'une commande en contient un, le code lui
				est signalé. Un code expiré cesse d'être suggéré.
			</p>
		</div>
		{#if data.canWrite}
			<Button onclick={() => (adding = !adding)} size="md" variant="primary"
				>{adding ? 'Annuler' : 'Nouveau code'}</Button
			>
		{/if}
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if adding && data.canWrite}
		<form
			class="border-rule bg-blue-gray/15 mb-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 sm:p-5"
			action="?/create"
			method="POST"
			use:enhance={() =>
				({ result, update }) => {
					if (result.type === 'success') {
						adding = false;
					}
					return update();
				}}
		>
			<label class="text-dark-light-blue text-xs">
				Fournisseur
				<input name="supplier" class={FIELD} placeholder="Mouser" required />
			</label>
			<label class="text-dark-light-blue text-xs">
				Site du fournisseur
				<input name="domain" class={FIELD} placeholder="mouser.fr" required />
			</label>
			<label class="text-dark-light-blue text-xs">
				Code
				<input name="code" class="{FIELD} font-mono" placeholder="DVB15" required />
			</label>
			<label class="text-dark-light-blue text-xs">
				Remise
				<input name="discount" class={FIELD} placeholder="-15 %, port offert…" required />
			</label>
			<label class="text-dark-light-blue text-xs sm:col-span-2">
				Conditions
				<input name="conditions" class={FIELD} placeholder="Dès 50 € d'achat, une fois par an…" />
			</label>
			<label class="text-dark-light-blue text-xs">
				Expire le
				<input name="expires_on" class={FIELD} type="date" />
			</label>
			<div class="flex items-end">
				<Button size="md" type="submit" variant="primary">Enregistrer le code</Button>
			</div>
		</form>
	{/if}

	<div class="mb-4 flex flex-wrap items-center gap-2">
		{#each ['active', 'expired', 'archived', 'all'] as const as status (status)}
			<FilterChip onclick={() => (statusFilter = status)} pressed={statusFilter === status}>
				{status === 'all' ? 'Tous' : PROMO_STATUS_LABELS[status]} ({counts[status] ?? 0})
			</FilterChip>
		{/each}
		<input
			class="border-rule-strong bg-dark-blue/60 placeholder:text-muted ml-auto w-56 rounded-xl border p-2.5 text-sm"
			placeholder="Fournisseur…"
			type="search"
			bind:value={supplierFilter}
		/>
	</div>

	{#if visible.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucun code dans cette catégorie.
		</p>
	{:else}
		<div class="border-rule overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-blue-gray/15 text-dark-light-blue text-left text-xs uppercase">
					<tr>
						<th class="px-4 py-2">Fournisseur</th>
						<th class="px-4 py-2">Code</th>
						<th class="px-4 py-2">Remise</th>
						<th class="px-4 py-2">Expiration</th>
						<th class="px-4 py-2">Statut</th>
						{#if data.canWrite}<th class="px-4 py-2"></th>{/if}
					</tr>
				</thead>
				<tbody class="divide-rule divide-y">
					{#each visible as code (code.id)}
						<tr>
							<td class="px-4 py-2">
								<span class="text-light-blue">{code.supplier}</span>
								<span class="text-dark-light-blue/70 block text-xs">{code.domain}</span>
							</td>
							<td class="px-4 py-2 font-mono text-white">{code.code}</td>
							<td class="text-light-blue px-4 py-2">
								{code.discount}
								{#if code.conditions}
									<span class="text-dark-light-blue/70 block text-xs">{code.conditions}</span>
								{/if}
							</td>
							<td class="text-dark-light-blue px-4 py-2">
								{code.expiresOn ? day.format(new Date(code.expiresOn)) : '—'}
							</td>
							<td class="px-4 py-2">
								<span class="rounded-full px-2 py-0.5 text-xs ring-1 {STATUS_CLASSES[code.status]}"
									>{PROMO_STATUS_LABELS[code.status]}</span
								>
							</td>
							{#if data.canWrite}
								<td class="px-4 py-2 text-right">
									<form action="?/toggleArchive" method="POST" use:enhance>
										<input name="id" type="hidden" value={code.id} />
										<input name="archive" type="hidden" value={code.archivedAt ? '0' : '1'} />
										<Button size="sm" type="submit" variant="secondary"
											>{code.archivedAt ? 'Réactiver' : 'Archiver'}</Button
										>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
