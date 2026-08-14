<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ACCOUNT_KIND_LABELS, ACCOUNT_KINDS } from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

	// TRESO-F-15 — le solde de l'association exclut les enveloppes partenaires :
	// ce sont des avoirs chez un tiers, pas de l'argent en banque.
	const treasury = $derived(data.snapshots.filter((s) => s.countsTowardTreasury));
	const envelopes = $derived(data.snapshots.filter((s) => !s.countsTowardTreasury));
	const total = $derived(treasury.reduce((sum, s) => sum + s.balance, 0));

	const failure = $derived(form && 'message' in form ? form.message : null);

	let openAccount = $state(false);
	let openPeriod = $state(false);
	// Compte dont l'archivage attend confirmation. `null` = aucun panneau ouvert.
	let archiving = $state<number | null>(null);
</script>

<svelte:head><title>Trésorerie — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Trésorerie</h1>
			<p class="mt-1 text-sm text-gray-400">
				Le solde à confronter au relevé bancaire, et les mouvements de la période.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				href={resolve('/treasury/flows')}>Dépenses et recettes</a
			>
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				href={resolve('/treasury/reports')}>Rapports</a
			>
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				href={resolve('/treasury/documents')}>Documents</a
			>
		</div>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	<!-- TRESO-F-51 — solde à un instant donné -->
	<div class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
		<form class="mb-4 flex flex-wrap items-end gap-3" method="GET">
			<label class="text-xs text-gray-300">
				Solde au
				<input
					name="on"
					class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					type="date"
					value={data.on}
				/>
			</label>
			<input name="from" type="hidden" value={data.from} />
			<input name="to" type="hidden" value={data.to} />
			<button
				class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
				type="submit">Recalculer</button
			>
			<p class="ml-auto text-right">
				<span class="block text-xs text-gray-400"
					>Trésorerie au {day.format(new Date(data.on))}</span
				>
				<span class="text-2xl font-bold text-white">{euro.format(total)}</span>
			</p>
		</form>

		<ul class="divide-y divide-gray-700">
			{#each treasury as snapshot (snapshot.accountId)}
				<li class="flex items-center justify-between py-2 text-sm">
					<span class="text-gray-200">{snapshot.name}</span>
					<span class="text-gray-400">{ACCOUNT_KIND_LABELS[snapshot.kind]}</span>
					<span class="font-medium {snapshot.balance < 0 ? 'text-rose-300' : 'text-gray-100'}"
						>{euro.format(snapshot.balance)}</span
					>
				</li>
			{/each}
		</ul>

		{#if envelopes.length > 0}
			<div class="mt-4 border-t border-gray-700 pt-3">
				<p class="mb-2 text-xs text-gray-400">
					Enveloppes partenaires — avoirs chez un tiers, hors trésorerie de l'association.
				</p>
				<ul class="divide-y divide-gray-700">
					{#each envelopes as snapshot (snapshot.accountId)}
						<li class="flex items-center justify-between py-2 text-sm">
							<span class="text-gray-200">{snapshot.name}</span>
							<span class="font-medium text-gray-300">{euro.format(snapshot.balance)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- TRESO-F-52 — crédits et débits entre deux dates -->
	<div class="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-4">
		<h2 class="mb-3 text-sm font-semibold text-gray-200">Mouvements sur une période</h2>
		<form class="flex flex-wrap items-end gap-3" method="GET">
			<input name="on" type="hidden" value={data.on} />
			<label class="text-xs text-gray-300">
				Du
				<input
					name="from"
					class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					type="date"
					value={data.from}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Au
				<input
					name="to"
					class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					type="date"
					value={data.to}
				/>
			</label>
			<button
				class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
				type="submit">Calculer</button
			>
			<div class="ml-auto flex gap-6 text-right">
				<p>
					<span class="block text-xs text-gray-400">Recettes</span>
					<span class="text-lg font-semibold text-emerald-300"
						>{euro.format(data.movements.credit)}</span
					>
				</p>
				<p>
					<span class="block text-xs text-gray-400">Dépenses</span>
					<span class="text-lg font-semibold text-rose-300"
						>{euro.format(data.movements.debit)}</span
					>
				</p>
				<p>
					<span class="block text-xs text-gray-400">Solde de la période</span>
					<span class="text-lg font-semibold text-white"
						>{euro.format(data.movements.credit - data.movements.debit)}</span
					>
				</p>
			</div>
		</form>
		<p class="mt-2 text-xs text-gray-500">
			{data.movements.count} mouvement(s) enregistré(s) sur la période.
		</p>
	</div>

	<!-- Comptes -->
	<div class="mb-8">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">Comptes</h2>
			<button
				class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
				onclick={() => (openAccount = !openAccount)}
				type="button">{openAccount ? 'Annuler' : 'Ouvrir un compte'}</button
			>
		</div>

		{#if openAccount}
			<form
				class="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
				action="?/createAccount"
				method="POST"
				use:enhance={() =>
					({ update }) => {
						openAccount = false;
						return update();
					}}
			>
				<label class="text-xs text-gray-300">
					Nom
					<input
						name="name"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
					/>
				</label>
				<label class="text-xs text-gray-300">
					Type
					<select
						name="kind"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					>
						{#each ACCOUNT_KINDS as kind (kind)}
							<option value={kind}>{ACCOUNT_KIND_LABELS[kind]}</option>
						{/each}
					</select>
				</label>
				<label class="text-xs text-gray-300">
					Solde d'ouverture
					<input
						name="opening_balance"
						class="mt-1 block w-32 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						inputmode="decimal"
						value="0,00"
					/>
				</label>
				<button
					class="bg-primary-600 hover:bg-primary-800 rounded-lg px-3 py-2 text-sm font-medium text-white"
					type="submit">Créer</button
				>
			</form>
		{/if}

		<ul class="space-y-2">
			{#each data.accounts as account (account.id)}
				<li
					class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm"
				>
					<span class="font-medium text-white">{account.name}</span>
					<span class="text-gray-400">{ACCOUNT_KIND_LABELS[account.kind]}</span>
					{#if account.archivedAt}
						<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">Archivé</span>
					{/if}
					<span class="ml-auto font-medium text-gray-100">{euro.format(account.balance)}</span>
					{#if account.archivedAt}
						<form action="?/toggleArchiveAccount" method="POST" use:enhance>
							<input name="id" type="hidden" value={account.id} />
							<input name="archive" type="hidden" value="0" />
							<button
								class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700"
								type="submit">Réactiver</button
							>
						</form>
					{:else}
						<button
							class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700"
							onclick={() => {
								archiving = archiving === account.id ? null : account.id;
							}}
							type="button">Archiver</button
						>
					{/if}

					<!-- Un compte archivé disparaît des sélecteurs de saisie et de règlement :
					     on dit ce qu'on s'apprête à retirer avant de le retirer. -->
					{#if archiving === account.id}
						<form
							class="mt-2 w-full rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
							action="?/toggleArchiveAccount"
							method="POST"
							use:enhance={() =>
								({ update }) => {
									archiving = null;
									return update();
								}}
						>
							<input name="id" type="hidden" value={account.id} />
							<input name="archive" type="hidden" value="1" />
							<p class="text-sm text-amber-200">
								Archiver « {account.name} » ?
							</p>
							<p class="mt-1 text-xs text-gray-400">
								Il disparaîtra des sélecteurs — saisie d'un mouvement, règlement d'une commande —
								mais ses {account.flowCount} mouvement(s) restent, et son solde de
								{euro.format(account.balance)} continue de compter dans
								{account.countsTowardTreasury ? 'la trésorerie' : 'les enveloppes partenaires'}.
								{#if account.balance !== 0}
									<span class="text-amber-300">
										Ce solde n'est pas nul : si le compte est réellement clos, enregistrez d'abord
										le mouvement qui le vide.
									</span>
								{/if}
								Réversible : un compte archivé se réactive d'un clic.
							</p>
							<div class="mt-3 flex items-center gap-2">
								<button
									class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
									type="submit">Confirmer l'archivage</button
								>
								<button
									class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
									onclick={() => {
										archiving = null;
									}}
									type="button">Annuler</button
								>
							</div>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	</div>

	<!-- Périodes -->
	<div>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">Périodes</h2>
			<button
				class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
				onclick={() => (openPeriod = !openPeriod)}
				type="button">{openPeriod ? 'Annuler' : 'Ouvrir une période'}</button
			>
		</div>

		<p class="mb-3 text-xs text-gray-500">
			Deux découpages distincts et volontaires : l'<strong>année scolaire</strong> (1<sup>er</sup>
			septembre → 31 août) délimite items, commandes et budgets ; l'<strong>exercice fiscal</strong> (année
			civile) délimite les flux et les soldes.
		</p>

		{#if openPeriod}
			<form
				class="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
				action="?/createPeriod"
				method="POST"
				use:enhance={() =>
					({ update }) => {
						openPeriod = false;
						return update();
					}}
			>
				<label class="text-xs text-gray-300">
					Découpage
					<select
						name="kind"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					>
						<option value="school">Année scolaire</option>
						<option value="fiscal">Exercice fiscal</option>
					</select>
				</label>
				<label class="text-xs text-gray-300">
					Libellé
					<input
						name="label"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						placeholder="2026/2027"
						required
					/>
				</label>
				<label class="text-xs text-gray-300">
					Début
					<input
						name="starts_on"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
						type="date"
					/>
				</label>
				<label class="text-xs text-gray-300">
					Fin
					<input
						name="ends_on"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
						type="date"
					/>
				</label>
				<button
					class="bg-primary-600 hover:bg-primary-800 rounded-lg px-3 py-2 text-sm font-medium text-white"
					type="submit">Ouvrir</button
				>
			</form>
		{/if}

		<div class="grid gap-4 md:grid-cols-2">
			{#each [{ kind: 'school', title: 'Années scolaires', rows: data.periods.schoolYears }, { kind: 'fiscal', title: 'Exercices fiscaux', rows: data.periods.fiscalYears }] as group (group.kind)}
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
						{group.title}
					</h3>
					<ul class="space-y-2">
						{#each group.rows as period (period.id)}
							<li class="flex items-center gap-2 text-sm">
								<span class="font-medium text-gray-100">{period.label}</span>
								<span class="text-xs text-gray-500">
									{day.format(new Date(period.startsOn))} → {day.format(new Date(period.endsOn))}
								</span>
								{#if period.closedAt}
									<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
										>Close</span
									>
								{/if}
								<form class="ml-auto" action="?/togglePeriod" method="POST" use:enhance>
									<input name="kind" type="hidden" value={group.kind} />
									<input name="id" type="hidden" value={period.id} />
									<input name="close" type="hidden" value={period.closedAt ? '0' : '1'} />
									<button
										class="rounded-lg border border-gray-600 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
										type="submit">{period.closedAt ? 'Rouvrir' : 'Clore'}</button
									>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</div>
</section>
