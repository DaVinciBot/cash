<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import ItemStateBadge from '$lib/components/cash/ItemStateBadge.svelte';
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import {
		CAMPUS_BADGES,
		isOrderCancelable,
		isOrderEditable,
		isOrderPassable,
		ORDER_STATE_BADGES,
		SHIPPING_ALLOCATION_LABELS,
		SHIPPING_ALLOCATIONS
	} from '@davincibot/lib';
	import { untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const order = $derived(data.order);
	const leaves = $derived(data.leaves);
	const editable = $derived(isOrderEditable(order.state));

	// Amorçage à la déclaration : un `$effect` ne s'exécute qu'après hydratation,
	// et le rendu serveur montrerait un champ de port vide avant de se remplir.
	const seed = untrack(() => data.order);
	let shippingCost = $state(seed.shippingCostTtc.toFixed(2).replace('.', ','));
	let shippingMode = $state<string>(seed.shippingAllocation);
	let copied = $state(false);
	// Feuille visée par la troisième issue de CMD-F-53. Vide = panneau fermé.
	let raising = $state<number | null>(null);
	let raiseAmount = $state('');

	const receivedCount = $derived(order.items.filter((i) => i.state === 'received').length);
	const total = $derived(order.amountTtc + order.shippingCostTtc);
	const unallocated = $derived(order.items.filter((i) => i.allocations.length === 0));
	// Le dépassement se lit avant de cliquer : `budget_consumption` compte déjà
	// les quotes-parts de cette commande, même non passée. Attendre le refus
	// DVB06 pour l'annoncer serait une surprise évitable.
	const overdrawn = $derived(order.shares.filter((s) => s.remainingTtc < 0));

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const failure = $derived(form && 'message' in form ? form.message : null);

	async function copyAddress() {
		if (!data.address) {
			return;
		}
		await navigator.clipboard.writeText(data.address);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head><title>Commande #{order.id} — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/orders' as '/')}
		>← Toutes les commandes</a
	>

	<header class="mt-3 mb-6 flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-bold text-white">Commande #{order.id}</h1>
		<StateBadge badge={ORDER_STATE_BADGES[order.state]} />
		{#if order.campus}
			<!-- CMD-F-41 — le badge campus est aussi le bouton qui copie l'adresse. -->
			<button
				class="cursor-pointer border-0 bg-transparent p-0"
				onclick={copyAddress}
				title="Copier l’adresse de livraison"
				type="button"
			>
				<StateBadge badge={CAMPUS_BADGES[order.campus]} />
			</button>
			{#if copied}
				<span class="text-xs text-emerald-300">Adresse copiée</span>
			{/if}
		{/if}
		<span class="ml-auto text-lg font-semibold text-white">{euro.format(total)}</span>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	<p class="mb-6 text-sm text-gray-400">
		Année scolaire {order.schoolYearLabel} · créée le {day.format(new Date(order.createdAt))}
		{#if order.orderedAt}· passée le {day.format(new Date(order.orderedAt))}{/if}
		{#if order.deliveredAt}· livrée le {day.format(new Date(order.deliveredAt))}{/if}
		{#if order.items.length > 0}· {receivedCount} / {order.items.length} reçus{/if}
	</p>

	{#if data.address}
		<pre
			class="mb-6 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm whitespace-pre-wrap text-gray-300">{data.address}</pre>
	{/if}

	<!-- Actions de cycle de vie -->
	<div class="mb-6 flex flex-wrap items-center gap-2">
		{#if isOrderPassable(order.state)}
			<form action="?/pass" method="POST" use:enhance>
				<button
					class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
					type="submit">Passer la commande</button
				>
			</form>
		{/if}
		{#if isOrderCancelable(order.state)}
			<form action="?/cancel" method="POST" use:enhance>
				<button
					class="rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
					type="submit">Annuler la commande</button
				>
			</form>
		{/if}
	</div>

	{#if unallocated.length > 0 && isOrderPassable(order.state)}
		<p
			class="mb-4 rounded-lg bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/30"
		>
			{unallocated.length} item(s) ne sont imputés sur aucun budget : la commande ne peut pas être passée
			tant qu’ils n’ont pas de poste de dépense.
		</p>
	{/if}

	<!-- CMD-F-53 — dépassement signalé avant le clic, avec les trois issues. -->
	{#if overdrawn.length > 0}
		<div class="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4">
			<h2 class="text-sm font-semibold text-rose-200">Budget insuffisant</h2>
			<ul class="mt-2 space-y-1 text-sm text-gray-300">
				{#each overdrawn as share (share.budgetId)}
					<li>
						{share.budgetPath} — dépassé de
						<span class="font-medium text-rose-200">{euro.format(-share.remainingTtc)}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-xs text-gray-400">
				Trois issues : imputer l’item sur un autre budget, le répartir sur plusieurs budgets — les
				deux depuis l’édition de l’item —, ou porter l’enveloppe au montant nécessaire si elle était
				sous-évaluée.
			</p>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				{#each overdrawn as share (share.budgetId)}
					<button
						class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
						onclick={() => {
							raising = share.budgetId;
							raiseAmount = '';
						}}
						type="button">Augmenter {share.budgetPath}</button
					>
				{/each}
			</div>
			{#if raising !== null}
				<form
					class="mt-3 flex flex-wrap items-end gap-2"
					action="?/raiseBudget"
					method="POST"
					use:enhance
				>
					<input name="budget" type="hidden" value={raising} />
					<label class="text-xs text-gray-300">
						Nouveau montant de l’enveloppe
						<input
							name="amount_ttc"
							class="mt-1 block w-40 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
							inputmode="decimal"
							placeholder="0,00"
							bind:value={raiseAmount}
						/>
					</label>
					<button
						class="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
						type="submit">Enregistrer</button
					>
					<button
						class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
						onclick={() => {
							raising = null;
						}}
						type="button">Annuler</button
					>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Frais de port (CMD-F-12, §7.2) -->
	{#if editable}
		<form
			class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4"
			action="?/shipping"
			method="POST"
			use:enhance
		>
			<h2 class="mb-3 text-sm font-semibold text-gray-200">Frais de port</h2>
			<div class="flex flex-wrap items-end gap-3">
				<label class="text-xs text-gray-300">
					Montant TTC
					<input
						name="shipping_cost_ttc"
						class="mt-1 block w-32 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						inputmode="decimal"
						bind:value={shippingCost}
					/>
				</label>
				<label class="text-xs text-gray-300">
					Répartition entre les budgets
					<select
						name="shipping_allocation"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						bind:value={shippingMode}
					>
						{#each SHIPPING_ALLOCATIONS as mode (mode)}
							<option value={mode}>{SHIPPING_ALLOCATION_LABELS[mode]}</option>
						{/each}
					</select>
				</label>
				<button
					class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
					type="submit">Enregistrer</button
				>
			</div>
		</form>
	{/if}

	<!-- Items -->
	<h2 class="mb-3 text-sm font-semibold tracking-wide text-gray-300 uppercase">
		Items ({order.items.length})
	</h2>
	<ul class="mb-8 space-y-2">
		{#each order.items as item (item.id)}
			<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							{#if item.link}
								<!-- eslint-disable svelte/no-navigation-without-resolve -- URL marchande externe -->
								<a
									class="truncate font-medium text-white hover:underline"
									href={item.link}
									rel="noopener noreferrer"
									target="_blank">{item.name}</a
								>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{:else}
								<span class="truncate font-medium text-white">{item.name}</span>
							{/if}
							<ItemStateBadge state={item.state} />
							<CampusBadge campus={item.campus} />
						</div>
						<p class="mt-1 text-sm text-gray-400">
							{item.projectName} · {item.requesterName} · {item.quantity} × {euro.format(
								item.unitPriceTtc
							)} =
							<span class="font-medium text-gray-200">{euro.format(item.totalTtc)}</span>
						</p>
						<!-- CMD-F-0B — la note reste visible sans déplier : c'est par elle
						     que passe une demande de livraison exceptionnelle. -->
						{#if item.note}
							<p class="mt-2 rounded bg-gray-700/50 px-2 py-1 text-sm text-gray-300">{item.note}</p>
						{/if}
						<p class="mt-2 text-xs text-gray-500">
							{#if item.allocations.length === 0}
								<span class="text-amber-300">Aucune imputation budgétaire</span>
							{:else}
								Imputé sur
								{#each item.allocations as allocation, index (allocation.budgetId)}
									{index > 0 ? ' · ' : ' '}{leaves.find((l) => l.id === allocation.budgetId)
										?.path ?? `#${String(allocation.budgetId)}`}
									({euro.format(allocation.amountTtc)})
								{/each}
							{/if}
						</p>
					</div>

					<div class="flex shrink-0 flex-col items-end gap-2">
						{#if editable}
							<a
								class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
								href={resolve(`/orders/${String(order.id)}/items/${String(item.id)}` as '/')}
								>Modifier</a
							>
						{/if}
						{#if item.state === 'bundled' && order.state === 'pending_delivery'}
							<form action="?/receive" method="POST" use:enhance>
								<input name="item" type="hidden" value={item.id} />
								<button
									class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
									type="submit">Marquer reçu</button
								>
							</form>
						{/if}
						{#if item.state === 'bundled' && order.state === 'pending_treso'}
							<form action="?/detach" method="POST" use:enhance>
								<input name="item" type="hidden" value={item.id} />
								<button
									class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
									type="submit">Retirer</button
								>
							</form>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>

	<!-- Quotes-parts par budget (§7.2, CMD-F-51) -->
	{#if order.shares.length > 0}
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-gray-300 uppercase">
			Répartition budgétaire
		</h2>
		<div class="overflow-x-auto rounded-lg border border-gray-700">
			<table class="w-full text-sm">
				<thead class="bg-gray-800 text-left text-xs text-gray-400 uppercase">
					<tr>
						<th class="px-4 py-2">Budget</th>
						<th class="px-4 py-2 text-right">Items</th>
						<th class="px-4 py-2 text-right">Quote-part de port</th>
						<th class="px-4 py-2 text-right">Total imputé</th>
						<th class="px-4 py-2 text-right">Reste</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700">
					{#each order.shares as share (share.budgetId)}
						<tr>
							<td class="px-4 py-2 text-gray-200">{share.budgetPath}</td>
							<td class="px-4 py-2 text-right text-gray-300">{euro.format(share.itemsSubtotal)}</td>
							<td class="px-4 py-2 text-right text-gray-300">{euro.format(share.shippingShare)}</td>
							<td class="px-4 py-2 text-right font-medium text-gray-100"
								>{euro.format(share.totalShare)}</td
							>
							<td
								class="px-4 py-2 text-right {share.remainingTtc < 0
									? 'text-rose-300'
									: 'text-gray-300'}">{euro.format(share.remainingTtc)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
