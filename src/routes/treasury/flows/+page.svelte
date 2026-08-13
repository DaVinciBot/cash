<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { FLOW_DIRECTION_BADGES, isFlowGenerated } from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const failure = $derived(form && 'message' in form ? form.message : null);

	// Un seul formulaire ouvert à la fois : `null` = fermé, `0` = création,
	// sinon l'identifiant du flux en cours de modification.
	let editing = $state<number | null>(null);
	let uploading = $state<number | null>(null);

	const today = new Date().toISOString().slice(0, 10);
	const openYear = $derived(
		data.periods.fiscalYears.find((y) => y.id === data.fiscalYearId) ?? data.periods.fiscalYears[0]
	);

	const totals = $derived(
		data.flows.reduce(
			(acc, f) => {
				if (f.direction === 'credit') {
					acc.credit += f.amountTtc;
				} else {
					acc.debit += f.amountTtc;
				}
				return acc;
			},
			{ credit: 0, debit: 0 }
		)
	);
</script>

<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -- {@render} est vu comme une expression void imbriquée par la règle ; les snippets sont pourtant la bonne forme ici -->

<svelte:head><title>Dépenses et recettes — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury' as '/')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Dépenses et recettes</h1>
			<p class="mt-1 text-sm text-gray-400">
				Les mouvements de l'exercice. Ceux qui portent un numéro de commande ont été générés au
				passage de celle-ci.
			</p>
		</div>
		<button
			class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
			onclick={() => (editing = editing === 0 ? null : 0)}
			type="button">{editing === 0 ? 'Annuler' : 'Nouveau mouvement'}</button
		>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	<!-- CMD-F-82 — délimitation par exercice fiscal -->
	<form class="mb-4 flex flex-wrap items-center gap-3" method="GET">
		<label class="text-xs text-gray-300">
			Exercice
			<select
				name="year"
				class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
				onchange={(event) => event.currentTarget.form?.requestSubmit()}
				value={data.fiscalYearId ?? ''}
			>
				{#each data.periods.fiscalYears as year (year.id)}
					<option value={year.id}>{year.label}{year.closedAt ? ' (clos)' : ''}</option>
				{/each}
			</select>
		</label>
		<p class="ml-auto flex gap-6 text-right text-sm">
			<span
				>Recettes <span class="font-semibold text-emerald-300">{euro.format(totals.credit)}</span
				></span
			>
			<span
				>Dépenses <span class="font-semibold text-rose-300">{euro.format(totals.debit)}</span></span
			>
		</p>
	</form>

	{#snippet flowForm(flow: (typeof data.flows)[number] | null)}
		<form
			class="mb-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
			action={flow ? '?/update' : '?/create'}
			method="POST"
			use:enhance={() =>
				({ update }) => {
					editing = null;
					return update();
				}}
		>
			{#if flow}
				<input name="id" type="hidden" value={flow.id} />
			{/if}
			<div class="flex flex-wrap items-end gap-3">
				<label class="text-xs text-gray-300">
					Sens
					<select
						name="direction"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						value={flow?.direction ?? 'debit'}
					>
						<option value="debit">Dépense (débit)</option>
						<option value="credit">Recette (crédit)</option>
					</select>
				</label>
				<label class="text-xs text-gray-300">
					Montant TTC
					<input
						name="amount_ttc"
						class="mt-1 block w-32 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						inputmode="decimal"
						required
						value={flow ? flow.amountTtc.toFixed(2).replace('.', ',') : ''}
					/>
				</label>
				<label class="text-xs text-gray-300">
					Date
					<input
						name="occurred_on"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
						type="date"
						value={flow?.occurredOn ?? today}
					/>
				</label>
				<label class="flex-1 text-xs text-gray-300">
					Libellé
					<input
						name="label"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
						value={flow?.label ?? ''}
					/>
				</label>
			</div>
			<div class="mt-3 flex flex-wrap items-end gap-3">
				<label class="text-xs text-gray-300">
					Compte
					<select
						name="account_id"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						value={flow?.accountId ?? data.accounts.at(0)?.id}
					>
						{#each data.accounts as account (account.id)}
							<option value={account.id}>{account.name}</option>
						{/each}
					</select>
				</label>
				<label class="text-xs text-gray-300">
					Exercice
					<select
						name="fiscal_year_id"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						value={flow?.fiscalYearId ?? openYear?.id}
					>
						{#each data.periods.fiscalYears as year (year.id)}
							<option value={year.id}>{year.label}</option>
						{/each}
					</select>
				</label>
				<label class="flex-1 text-xs text-gray-300">
					Budget imputé
					<select
						name="budget_id"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						disabled={flow !== null && isFlowGenerated(flow.origin)}
						value={flow?.budgetId ?? ''}
					>
						<option value="">— aucun —</option>
						{#each data.leaves as leaf (leaf.id)}
							<option value={leaf.id}>{leaf.path}</option>
						{/each}
					</select>
				</label>
			</div>
			{#if flow && isFlowGenerated(flow.origin)}
				<p class="mt-2 text-xs text-gray-500">
					Ce mouvement vient de la commande #{flow.orderId} : sa ventilation budgétaire se lit dans la
					répartition de la commande, pas sur le mouvement.
				</p>
			{/if}
			<div class="mt-3 flex items-center gap-2">
				<button
					class="bg-primary-600 hover:bg-primary-800 rounded-lg px-3 py-2 text-sm font-medium text-white"
					type="submit">Enregistrer</button
				>
				<button
					class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
					onclick={() => (editing = null)}
					type="button">Annuler</button
				>
			</div>
		</form>
	{/snippet}

	{#if editing === 0}
		{@render flowForm(null)}
	{/if}

	{#if data.flows.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			Aucun mouvement sur cet exercice.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.flows as flow (flow.id)}
				<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="flex flex-wrap items-center gap-3">
						<StateBadge badge={FLOW_DIRECTION_BADGES[flow.direction]} />
						<span class="font-medium text-white">{flow.label}</span>
						{#if flow.orderId !== null}
							<a
								class="text-xs text-gray-400 underline hover:text-gray-200"
								href={resolve(`/orders/${String(flow.orderId)}` as '/')}>commande #{flow.orderId}</a
							>
						{/if}
						{#if flow.reversesFlowId !== null}
							<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
								>contrepassation</span
							>
						{/if}
						<span
							class="ml-auto font-semibold {flow.direction === 'credit'
								? 'text-emerald-300'
								: 'text-rose-300'}">{euro.format(flow.amountTtc)}</span
						>
					</div>
					<p class="mt-1 text-sm text-gray-400">
						{day.format(new Date(flow.occurredOn))} · {flow.accountName} · {flow.fiscalYearLabel}
						{#if flow.budgetName}· {flow.budgetName}{/if}
						{#if flow.isReconciled}· <span class="text-emerald-300">pointé</span>{/if}
					</p>

					{#if flow.proofs.length > 0}
						<ul class="mt-2 flex flex-wrap gap-2">
							{#each flow.proofs as proof (proof.id)}
								<li
									class="flex items-center gap-2 rounded border border-gray-600 px-2 py-1 text-xs text-gray-300"
								>
									{#if proof.url}
										<!-- eslint-disable svelte/no-navigation-without-resolve -- URL signée du bucket de stockage -->
										<a class="underline" href={proof.url} rel="noopener noreferrer" target="_blank"
											>{proof.mimeType === 'application/pdf' ? 'PDF' : 'Image'}</a
										>
										<!-- eslint-enable svelte/no-navigation-without-resolve -->
									{:else}
										<span>Justificatif</span>
									{/if}
									<form action="?/removeProof" method="POST" use:enhance>
										<input name="proof" type="hidden" value={proof.id} />
										<button class="text-rose-300 hover:underline" type="submit">retirer</button>
									</form>
								</li>
							{/each}
						</ul>
					{/if}

					{#if uploading === flow.id}
						<form
							class="mt-2 flex flex-wrap items-center gap-2"
							action="?/addProof"
							enctype="multipart/form-data"
							method="POST"
							use:enhance={() =>
								({ update }) => {
									uploading = null;
									return update();
								}}
						>
							<input name="id" type="hidden" value={flow.id} />
							<input
								name="file"
								class="text-xs text-gray-300"
								accept="image/png,image/jpeg,application/pdf"
								required
								type="file"
							/>
							<button
								class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
								type="submit">Déposer</button
							>
							<button
								class="text-xs text-gray-400 hover:text-gray-200"
								onclick={() => (uploading = null)}
								type="button">annuler</button
							>
						</form>
					{/if}

					<div class="mt-3 flex flex-wrap items-center gap-2">
						<button
							class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
							onclick={() => (editing = editing === flow.id ? null : flow.id)}
							type="button">Modifier</button
						>
						<button
							class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
							onclick={() => (uploading = uploading === flow.id ? null : flow.id)}
							type="button">Justificatif</button
						>
						<form action="?/toggleReconciled" method="POST" use:enhance>
							<input name="id" type="hidden" value={flow.id} />
							<input name="reconciled" type="hidden" value={flow.isReconciled ? '0' : '1'} />
							<button
								class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
								type="submit">{flow.isReconciled ? 'Dépointer' : 'Pointer'}</button
							>
						</form>
						<form action="?/delete" method="POST" use:enhance>
							<input name="id" type="hidden" value={flow.id} />
							<button
								class="rounded-lg border border-rose-500/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
								type="submit">Supprimer</button
							>
						</form>
					</div>

					{#if flow.orderId !== null && !flow.isReconciled && flow.reversesFlowId === null}
						<p class="mt-2 text-xs text-gray-500">
							Non pointé : ce montant suivra automatiquement toute correction de la commande. Le
							pointer le fige.
						</p>
					{/if}

					{#if editing === flow.id}
						{@render flowForm(flow)}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
