<script lang="ts">
	import { Button, FilterChip } from '@davincibot/components';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import FlowFields from '#lib/components/cash/FlowFields.svelte';
	import StateBadge from '#lib/components/cash/StateBadge.svelte';
	import { FLOW_DIRECTION_ICONS } from '#lib/components/cash/stateIcons.js';
	import { FLOW_DIRECTION_BADGES, isOrderFinalized } from '#lib/types/domain.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Flow = (typeof data.flows)[number];

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const failure = $derived(form && 'message' in form ? form.message : null);

	// Un seul formulaire ouvert à la fois : `null` = fermé, `0` = création,
	// sinon l'identifiant du flux en cours de modification.
	let editing = $state<number | null>(null);
	let uploading = $state<number | null>(null);

	const today = new Date().toISOString().slice(0, 10);

	const periodsOfView = $derived(
		data.view === 'school' ? data.periods.schoolYears : data.periods.fiscalYears
	);

	/** Un flux de commande ne se pointe qu'une fois la commande finalisée (#94). */
	const awaitingOrder = (flow: Flow) =>
		flow.orderState !== null && !isOrderFinalized(flow.orderState);

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

	const viewHref = (view: 'fiscal' | 'school') => `${resolve('/treasury/flows')}?view=${view}`;
</script>

<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -- {@render} est vu comme une expression void imbriquée par la règle ; les snippets sont pourtant la bonne forme ici -->

<svelte:head><title>Dépenses et recettes — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/treasury')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Dépenses et recettes</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Les mouvements de la période. Ceux qui portent un numéro de commande ont été générés au
				passage de celle-ci.
			</p>
		</div>
		<Button onclick={() => (editing = editing === 0 ? null : 0)} size="md" variant="primary"
			>{editing === 0 ? 'Annuler' : 'Nouveau mouvement'}</Button
		>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	<!-- CMD-F-82 — délimitation par exercice fiscal, ou par année scolaire (#69) -->
	<form class="mb-4 flex flex-wrap items-end gap-3" method="GET">
		<div class="flex gap-2" aria-label="Découpage" role="group">
			<FilterChip href={viewHref('fiscal')} pressed={data.view === 'fiscal'}
				>Exercice fiscal</FilterChip
			>
			<FilterChip href={viewHref('school')} pressed={data.view === 'school'}
				>Année scolaire</FilterChip
			>
		</div>
		<input name="view" type="hidden" value={data.view} />
		<label class="text-dark-light-blue text-xs">
			{data.view === 'school' ? 'Année scolaire' : 'Exercice'}
			<select
				name="year"
				class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
				onchange={(event) => event.currentTarget.form?.requestSubmit()}
				value={data.periodId ?? ''}
			>
				{#each periodsOfView as period (period.id)}
					<option value={period.id}>{period.label}{period.closedAt ? ' (clos)' : ''}</option>
				{/each}
			</select>
		</label>
		<p class="ml-auto flex gap-6 text-right text-sm">
			<span
				>Recettes <span class="font-semibold text-emerald-300">{euro.format(totals.credit)}</span
				></span
			>
			<span
				>Dépenses <span class="font-semibold text-red-400">{euro.format(totals.debit)}</span></span
			>
		</p>
	</form>

	{#snippet flowForm(flow: Flow | null)}
		<form
			class="border-rule bg-blue-gray/15 mb-3 rounded-lg border p-4"
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
			<FlowFields
				accounts={data.accounts}
				fiscalYears={data.periods.fiscalYears}
				{flow}
				leaves={data.leaves}
				onCancel={() => (editing = null)}
				{today}
			/>
		</form>
	{/snippet}

	{#if editing === 0}
		{@render flowForm(null)}
	{/if}

	{#if data.flows.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucun mouvement sur cette période.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.flows as flow (flow.id)}
				<li class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
					<div class="flex flex-wrap items-center gap-3">
						<StateBadge
							badge={FLOW_DIRECTION_BADGES[flow.direction]}
							icon={FLOW_DIRECTION_ICONS[flow.direction]}
						/>
						<span class="font-medium text-white">{flow.label}</span>
						{#if flow.orderId !== null}
							<a
								class="text-dark-light-blue hover:text-light-blue text-xs underline"
								href={resolve('/orders/[id]', { id: String(flow.orderId) })}
							>
								commande #{flow.orderId}
							</a>
						{/if}
						{#if flow.reversesFlowId !== null}
							<span class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
								>contrepassation</span
							>
						{/if}
						<span
							class="ml-auto font-semibold {flow.direction === 'credit'
								? 'text-emerald-300'
								: 'text-red-400'}">{euro.format(flow.amountTtc)}</span
						>
					</div>
					<p class="text-dark-light-blue mt-1 text-sm">
						{day.format(new Date(flow.occurredOn))} · {flow.accountName} · {flow.fiscalYearLabel}
						{#if flow.budgetName}· {flow.budgetName}{/if}
						{#if flow.isReconciled}· <span class="text-emerald-300">pointé</span>{/if}
					</p>
					<!-- #90 — le budget d'un flux de commande se lit dans ses quotes-parts. -->
					{#if flow.orderBudgets.length > 0}
						<p class="text-dark-light-blue/80 mt-1 text-xs">
							Imputation de la commande :
							{#each flow.orderBudgets as budget, index (budget.name)}
								{index > 0 ? ' · ' : ''}<span class="text-light-blue">{budget.name}</span>
								({euro.format(budget.amountTtc)})
							{/each}
						</p>
					{/if}

					{#if flow.proofs.length > 0}
						<ul class="mt-2 flex flex-wrap gap-2">
							{#each flow.proofs as proof (proof.id)}
								<li
									class="border-rule-strong text-dark-light-blue flex items-center gap-2 rounded border px-2 py-1 text-xs"
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
										<Button size="sm" type="submit" variant="danger-ghost">retirer</Button>
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
								class="text-dark-light-blue text-xs"
								accept="image/png,image/jpeg,application/pdf"
								required
								type="file"
							/>
							<Button size="sm" type="submit" variant="secondary">Déposer</Button>
							<Button onclick={() => (uploading = null)} size="sm" variant="ghost">annuler</Button>
						</form>
					{/if}

					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Button
							onclick={() => (editing = editing === flow.id ? null : flow.id)}
							size="sm"
							variant="secondary">Modifier</Button
						>
						<Button
							onclick={() => (uploading = uploading === flow.id ? null : flow.id)}
							size="sm"
							variant="secondary">Justificatif</Button
						>
						{#if awaitingOrder(flow) && !flow.isReconciled}
							<span title="Impossible de pointer : la commande doit d'abord être finalisée">
								<Button disabled size="sm" variant="secondary">Pointer</Button>
							</span>
						{:else}
							<form action="?/toggleReconciled" method="POST" use:enhance>
								<input name="id" type="hidden" value={flow.id} />
								<input name="reconciled" type="hidden" value={flow.isReconciled ? '0' : '1'} />
								<Button size="sm" type="submit" variant="secondary"
									>{flow.isReconciled ? 'Dépointer' : 'Pointer'}</Button
								>
							</form>
						{/if}
						<!-- #70 — le règlement d'une commande ne se supprime pas : la commande s'annule. -->
						{#if flow.orderId === null}
							<form action="?/delete" method="POST" use:enhance>
								<input name="id" type="hidden" value={flow.id} />
								<Button size="sm" type="submit" variant="danger">Supprimer</Button>
							</form>
						{/if}
					</div>

					{#if awaitingOrder(flow) && !flow.isReconciled}
						<p class="text-dark-light-blue/70 mt-2 text-xs">
							Commande non finalisée : ce montant suivra automatiquement toute correction de la
							commande. Le pointage sera possible une fois la commande reçue ou annulée.
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
