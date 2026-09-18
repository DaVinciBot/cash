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
			<p class="text-dark-light-blue mt-1 text-sm">
				Le solde à confronter au relevé bancaire, et les mouvements de la période.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-4 py-2.5 text-sm"
				href={resolve('/treasury/flows')}>Dépenses et recettes</a
			>
			<a
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-4 py-2.5 text-sm"
				href={resolve('/treasury/reports')}>Rapports</a
			>
			<a
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-4 py-2.5 text-sm"
				href={resolve('/treasury/documents')}>Documents</a
			>
		</div>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	<!-- TRESO-F-51 — solde à un instant donné -->
	<div class="border-light-blue/20 bg-blue-gray/15 mb-6 rounded-2xl border p-4 sm:p-5">
		<form class="mb-4 flex flex-wrap items-end gap-3" method="GET">
			<label class="text-dark-light-blue text-xs">
				Solde au
				<input
					name="on"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					type="date"
					value={data.on}
				/>
			</label>
			<input name="from" type="hidden" value={data.from} />
			<input name="to" type="hidden" value={data.to} />
			<button
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
				type="submit">Recalculer</button
			>
			<p class="ml-auto text-right">
				<span class="text-dark-light-blue block text-xs"
					>Trésorerie au {day.format(new Date(data.on))}</span
				>
				<span class="text-2xl font-bold text-white">{euro.format(total)}</span>
			</p>
		</form>

		<ul class="divide-light-blue/10 divide-y">
			{#each treasury as snapshot (snapshot.accountId)}
				<li class="flex items-center justify-between py-2 text-sm">
					<span class="text-light-blue">{snapshot.name}</span>
					<span class="text-dark-light-blue">{ACCOUNT_KIND_LABELS[snapshot.kind]}</span>
					<span class="font-medium {snapshot.balance < 0 ? 'text-rose-300' : 'text-light-blue'}"
						>{euro.format(snapshot.balance)}</span
					>
				</li>
			{/each}
		</ul>

		{#if envelopes.length > 0}
			<div class="border-light-blue/20 mt-4 border-t pt-3">
				<p class="text-dark-light-blue mb-2 text-xs">
					Enveloppes partenaires — avoirs chez un tiers, hors trésorerie de l'association.
				</p>
				<ul class="divide-light-blue/10 divide-y">
					{#each envelopes as snapshot (snapshot.accountId)}
						<li class="flex items-center justify-between py-2 text-sm">
							<span class="text-light-blue">{snapshot.name}</span>
							<span class="text-dark-light-blue font-medium">{euro.format(snapshot.balance)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- TRESO-F-52 — crédits et débits entre deux dates -->
	<div class="border-light-blue/20 bg-blue-gray/15 mb-8 rounded-2xl border p-4 sm:p-5">
		<h2 class="text-light-blue mb-3 text-sm font-semibold">Mouvements sur une période</h2>
		<form class="flex flex-wrap items-end gap-3" method="GET">
			<input name="on" type="hidden" value={data.on} />
			<label class="text-dark-light-blue text-xs">
				Du
				<input
					name="from"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					type="date"
					value={data.from}
				/>
			</label>
			<label class="text-dark-light-blue text-xs">
				Au
				<input
					name="to"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					type="date"
					value={data.to}
				/>
			</label>
			<button
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
				type="submit">Calculer</button
			>
			<div class="ml-auto flex gap-6 text-right">
				<p>
					<span class="text-dark-light-blue block text-xs">Recettes</span>
					<span class="text-lg font-semibold text-emerald-300"
						>{euro.format(data.movements.credit)}</span
					>
				</p>
				<p>
					<span class="text-dark-light-blue block text-xs">Dépenses</span>
					<span class="text-lg font-semibold text-rose-300"
						>{euro.format(data.movements.debit)}</span
					>
				</p>
				<p>
					<span class="text-dark-light-blue block text-xs">Solde de la période</span>
					<span class="text-lg font-semibold text-white"
						>{euro.format(data.movements.credit - data.movements.debit)}</span
					>
				</p>
			</div>
		</form>
		<p class="text-dark-light-blue/70 mt-2 text-xs">
			{data.movements.count} mouvement(s) enregistré(s) sur la période.
		</p>
	</div>

	<!-- Comptes -->
	<div class="mb-8">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">Comptes</h2>
			<button
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
				onclick={() => (openAccount = !openAccount)}
				type="button">{openAccount ? 'Annuler' : 'Ouvrir un compte'}</button
			>
		</div>

		{#if openAccount}
			<form
				class="border-light-blue/20 bg-blue-gray/15 mb-3 flex flex-wrap items-end gap-3 rounded-lg border p-4"
				action="?/createAccount"
				method="POST"
				use:enhance={() =>
					({ update }) => {
						openAccount = false;
						return update();
					}}
			>
				<label class="text-dark-light-blue text-xs">
					Nom
					<input
						name="name"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
						required
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Type
					<select
						name="kind"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					>
						{#each ACCOUNT_KINDS as kind (kind)}
							<option value={kind}>{ACCOUNT_KIND_LABELS[kind]}</option>
						{/each}
					</select>
				</label>
				<label class="text-dark-light-blue text-xs">
					Solde d'ouverture
					<input
						name="opening_balance"
						class="border-light-blue/30 bg-dark-blue/60 mt-1 block w-32 rounded-lg border p-2 text-sm text-white"
						inputmode="decimal"
						value="0,00"
					/>
				</label>
				<button
					class="bg-light-blue text-dark-blue rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-white"
					type="submit">Créer</button
				>
			</form>
		{/if}

		<ul class="space-y-2">
			{#each data.accounts as account (account.id)}
				<li
					class="border-light-blue/20 bg-blue-gray/15 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
				>
					<span class="font-medium text-white">{account.name}</span>
					<span class="text-dark-light-blue">{ACCOUNT_KIND_LABELS[account.kind]}</span>
					{#if account.archivedAt}
						<span class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
							>Archivé</span
						>
					{/if}
					<span class="text-light-blue ml-auto font-medium">{euro.format(account.balance)}</span>
					{#if account.archivedAt}
						<form action="?/toggleArchiveAccount" method="POST" use:enhance>
							<input name="id" type="hidden" value={account.id} />
							<input name="archive" type="hidden" value="0" />
							<button
								class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-xs"
								type="submit">Réactiver</button
							>
						</form>
					{:else}
						<button
							class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-xs"
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
							<p class="text-dark-light-blue mt-1 text-xs">
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
									class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-xs"
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
			<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">Périodes</h2>
			<button
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
				onclick={() => (openPeriod = !openPeriod)}
				type="button">{openPeriod ? 'Annuler' : 'Ouvrir une période'}</button
			>
		</div>

		<p class="text-dark-light-blue/70 mb-3 text-xs">
			Deux découpages distincts et volontaires : l'<strong>année scolaire</strong> (1<sup>er</sup>
			septembre → 31 août) délimite items, commandes et budgets ; l'<strong>exercice fiscal</strong> (année
			civile) délimite les flux et les soldes.
		</p>

		{#if openPeriod}
			<form
				class="border-light-blue/20 bg-blue-gray/15 mb-3 flex flex-wrap items-end gap-3 rounded-lg border p-4"
				action="?/createPeriod"
				method="POST"
				use:enhance={() =>
					({ update }) => {
						openPeriod = false;
						return update();
					}}
			>
				<label class="text-dark-light-blue text-xs">
					Découpage
					<select
						name="kind"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
					>
						<option value="school">Année scolaire</option>
						<option value="fiscal">Exercice fiscal</option>
					</select>
				</label>
				<label class="text-dark-light-blue text-xs">
					Libellé
					<input
						name="label"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
						placeholder="2026/2027"
						required
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Début
					<input
						name="starts_on"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
						required
						type="date"
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Fin
					<input
						name="ends_on"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
						required
						type="date"
					/>
				</label>
				<button
					class="bg-light-blue text-dark-blue rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-white"
					type="submit">Ouvrir</button
				>
			</form>
		{/if}

		<div class="grid gap-4 md:grid-cols-2">
			{#each [{ kind: 'school', title: 'Années scolaires', rows: data.periods.schoolYears }, { kind: 'fiscal', title: 'Exercices fiscaux', rows: data.periods.fiscalYears }] as group (group.kind)}
				<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
					<h3 class="text-dark-light-blue mb-2 text-xs font-semibold tracking-wide uppercase">
						{group.title}
					</h3>
					<ul class="space-y-2">
						{#each group.rows as period (period.id)}
							<li class="flex items-center gap-2 text-sm">
								<span class="text-light-blue font-medium">{period.label}</span>
								<span class="text-dark-light-blue/70 text-xs">
									{day.format(new Date(period.startsOn))} → {day.format(new Date(period.endsOn))}
								</span>
								{#if period.closedAt}
									<span
										class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
										>Close</span
									>
								{/if}
								<form class="ml-auto" action="?/togglePeriod" method="POST" use:enhance>
									<input name="kind" type="hidden" value={group.kind} />
									<input name="id" type="hidden" value={period.id} />
									<input name="close" type="hidden" value={period.closedAt ? '0' : '1'} />
									<button
										class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-xs"
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
