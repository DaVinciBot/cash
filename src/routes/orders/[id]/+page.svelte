<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import HistoryTimeline from '$lib/components/cash/HistoryTimeline.svelte';
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
	let passing = $state(false);
	let canceling = $state(false);

	const receivedCount = $derived(order.items.filter((i) => i.state === 'received').length);
	const total = $derived(order.amountTtc + order.shippingCostTtc);

	// Répartition du règlement (TRESO-F-14). Une somme nulle vaut « tout sur le
	// compte courant » et laisse `on_order_ordered` faire comme avant ; dès
	// qu'un montant est saisi, la somme doit tomber exactement sur le dû.
	const settlementRaw = $state<string[]>([]);
	const settlement = $derived(
		settlementRaw.reduce((sum, raw) => {
			const value = Number(raw.replace(',', '.'));
			return sum + (Number.isFinite(value) && value > 0 ? value : 0);
		}, 0)
	);
	const settlementError = $derived(
		settlement > 0 && Math.round(settlement * 100) !== Math.round(total * 100)
	);
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
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/orders')}
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
				title="Copier l'adresse de livraison"
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
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	<p class="text-dark-light-blue mb-6 text-sm">
		Année scolaire {order.schoolYearLabel} · créée le {day.format(new Date(order.createdAt))}
		{#if order.orderedAt}· passée le {day.format(new Date(order.orderedAt))}{/if}
		{#if order.deliveredAt}· livrée le {day.format(new Date(order.deliveredAt))}{/if}
		{#if order.items.length > 0}· {receivedCount} / {order.items.length} reçus{/if}
	</p>

	{#if data.address}
		<pre
			class="border-light-blue/20 bg-blue-gray/15 text-dark-light-blue mb-6 rounded-lg border px-4 py-3 text-sm whitespace-pre-wrap">{data.address}</pre>
	{/if}

	<!-- Actions de cycle de vie -->
	<div class="mb-6 flex flex-wrap items-center gap-2">
		{#if isOrderPassable(order.state)}
			<button
				class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
				onclick={() => (passing = !passing)}
				type="button">Passer la commande</button
			>
		{/if}
		{#if isOrderCancelable(order.state)}
			<button
				class="rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
				onclick={() => (canceling = !canceling)}
				type="button">Annuler la commande</button
			>
		{/if}
	</div>

	<!-- TRESO-F-14 — le règlement peut être scindé sur deux comptes -->
	{#if passing}
		<form
			class="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4"
			action="?/pass"
			method="POST"
			use:enhance={() =>
				({ update }) => {
					passing = false;
					return update();
				}}
		>
			<h2 class="text-sm font-semibold text-emerald-200">Régler {euro.format(total)}</h2>
			<p class="text-dark-light-blue mt-1 text-xs">
				Laissez les montants à zéro pour régler entièrement sur le compte courant. Une enveloppe
				partenaire ne couvre que ce qu'elle contient — le complément se met sur un autre compte.
			</p>
			<div class="mt-3 space-y-2">
				{#each data.accounts as account, index (account.id)}
					<label class="text-dark-light-blue flex flex-wrap items-center gap-2 text-sm">
						<input name="account_id" type="hidden" value={account.id} />
						<span class="w-56">{account.name}</span>
						<span class="text-dark-light-blue/70 w-32 text-xs"
							>solde {euro.format(account.balance)}
							{#if !account.countsTowardTreasury}· enveloppe{/if}</span
						>
						<input
							name="account_amount"
							class="border-light-blue/30 bg-dark-blue/60 w-32 rounded-lg border p-2 text-sm text-white"
							inputmode="decimal"
							placeholder="0,00"
							bind:value={settlementRaw[index]}
						/>
					</label>
				{/each}
			</div>
			<p class="mt-2 text-xs {settlementError ? 'text-rose-300' : 'text-dark-light-blue/70'}">
				Réparti : {euro.format(settlement)} sur {euro.format(total)}
			</p>
			<div class="mt-3 flex items-center gap-2">
				<button
					class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
					disabled={settlementError}
					type="submit">Confirmer le passage</button
				>
				<button
					class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-4 py-2.5 text-sm"
					onclick={() => (passing = false)}
					type="button">Annuler</button
				>
			</div>
		</form>
	{/if}

	<!-- TRESO-F-23 — la contrepassation est proposée, pas imposée -->
	{#if canceling}
		<form
			class="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4"
			action="?/cancel"
			method="POST"
			use:enhance={() =>
				({ update }) => {
					canceling = false;
					return update();
				}}
		>
			<h2 class="text-sm font-semibold text-rose-200">Annuler la commande #{order.id}</h2>
			<p class="text-dark-light-blue mt-1 text-xs">
				Les items non reçus repartent dans la file de regroupement.
				{#if receivedCount > 0}
					<span class="text-amber-300">
						{receivedCount} item(s) déjà reçus resteront rattachés à cette commande, et la contrepassation
						annulera la totalité du débit.
					</span>
				{/if}
			</p>
			<label class="text-dark-light-blue mt-3 flex items-center gap-2 text-sm">
				<input
					name="reverse"
					class="border-light-blue/30 bg-dark-blue/60 size-4 rounded"
					checked
					type="checkbox"
					value="1"
				/>
				Contrepasser le mouvement de trésorerie
			</label>
			<p class="text-dark-light-blue/70 mt-1 text-xs">
				À décocher si l'argent est réellement parti : annuler la commande ici ne rappelle pas un
				virement.
			</p>
			<div class="mt-3 flex items-center gap-2">
				<button
					class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
					type="submit">Confirmer l'annulation</button
				>
				<button
					class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-4 py-2.5 text-sm"
					onclick={() => (canceling = false)}
					type="button">Revenir</button
				>
			</div>
		</form>
	{/if}

	{#if unallocated.length > 0 && isOrderPassable(order.state)}
		<p
			class="mb-4 rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-500/30"
		>
			{unallocated.length} item(s) ne sont imputés sur aucun budget : la commande ne peut pas être passée
			tant qu'ils n'ont pas de poste de dépense.
		</p>
	{/if}

	<!-- CMD-F-53 — dépassement signalé avant le clic, avec les trois issues. -->
	{#if overdrawn.length > 0}
		<div class="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4">
			<h2 class="text-sm font-semibold text-rose-200">Budget insuffisant</h2>
			<ul class="text-dark-light-blue mt-2 space-y-1 text-sm">
				{#each overdrawn as share (share.budgetId)}
					<li>
						{share.budgetPath} — dépassé de
						<span class="font-medium text-rose-200">{euro.format(-share.remainingTtc)}</span>
					</li>
				{/each}
			</ul>
			<p class="text-dark-light-blue mt-3 text-xs">
				Trois issues : imputer l'item sur un autre budget, le répartir sur plusieurs budgets — les
				deux depuis l'édition de l'item —, ou porter l'enveloppe au montant nécessaire si elle était
				sous-évaluée.
			</p>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				{#each overdrawn as share (share.budgetId)}
					<button
						class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-xs"
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
					<label class="text-dark-light-blue text-xs">
						Nouveau montant de l'enveloppe
						<input
							name="amount_ttc"
							class="border-light-blue/30 bg-dark-blue/60 mt-1 block w-40 rounded-lg border p-2 text-sm text-white"
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
						class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
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
			class="border-light-blue/20 bg-blue-gray/15 mb-6 rounded-2xl border p-4 sm:p-5"
			action="?/shipping"
			method="POST"
			use:enhance
		>
			<h2 class="text-light-blue mb-3 text-sm font-semibold">Frais de port</h2>
			<div class="flex flex-wrap items-end gap-3">
				<label class="text-dark-light-blue text-xs">
					Montant TTC
					<input
						name="shipping_cost_ttc"
						class="border-light-blue/30 bg-dark-blue/60 mt-1 block w-32 rounded-lg border p-2 text-sm text-white"
						inputmode="decimal"
						bind:value={shippingCost}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Répartition entre les budgets
					<select
						name="shipping_allocation"
						class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
						bind:value={shippingMode}
					>
						{#each SHIPPING_ALLOCATIONS as mode (mode)}
							<option value={mode}>{SHIPPING_ALLOCATION_LABELS[mode]}</option>
						{/each}
					</select>
				</label>
				<button
					class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
					type="submit">Enregistrer</button
				>
			</div>
		</form>
	{/if}

	<!-- Items -->
	<h2 class="text-dark-light-blue mb-3 text-sm font-semibold tracking-wide uppercase">
		Items ({order.items.length})
	</h2>
	<ul class="mb-8 space-y-2">
		{#each order.items as item (item.id)}
			<li class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
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
						<p class="text-dark-light-blue mt-1 text-sm">
							{item.projectName} · {item.requesterName} · {item.quantity} × {euro.format(
								item.unitPriceTtc
							)} =
							<span class="text-light-blue font-medium">{euro.format(item.totalTtc)}</span>
						</p>
						<!-- CMD-F-0B — la note reste visible sans déplier : c'est par elle
						     que passe une demande de livraison exceptionnelle. -->
						{#if item.note}
							<p class="bg-dark-blue/40 text-dark-light-blue mt-2 rounded px-2 py-1 text-sm">
								{item.note}
							</p>
						{/if}
						<p class="text-dark-light-blue/70 mt-2 text-xs">
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
								class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
								href={resolve('/orders/[id]/items/[itemId]', {
									id: String(order.id),
									itemId: String(item.id)
								})}
								>Modifier
							</a>
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
									class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
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
		<h2 class="text-dark-light-blue mb-3 text-sm font-semibold tracking-wide uppercase">
			Répartition budgétaire
		</h2>
		<div class="border-light-blue/20 overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-blue-gray/15 text-dark-light-blue text-left text-xs uppercase">
					<tr>
						<th class="px-4 py-2">Budget</th>
						<th class="px-4 py-2 text-right">Items</th>
						<th class="px-4 py-2 text-right">Quote-part de port</th>
						<th class="px-4 py-2 text-right">Total imputé</th>
						<th class="px-4 py-2 text-right">Reste</th>
					</tr>
				</thead>
				<tbody class="divide-light-blue/10 divide-y">
					{#each order.shares as share (share.budgetId)}
						<tr>
							<td class="text-light-blue px-4 py-2">{share.budgetPath}</td>
							<td class="text-dark-light-blue px-4 py-2 text-right"
								>{euro.format(share.itemsSubtotal)}</td
							>
							<td class="text-dark-light-blue px-4 py-2 text-right"
								>{euro.format(share.shippingShare)}</td
							>
							<td class="text-light-blue px-4 py-2 text-right font-medium"
								>{euro.format(share.totalShare)}</td
							>
							<td
								class="px-4 py-2 text-right {share.remainingTtc < 0
									? 'text-rose-300'
									: 'text-dark-light-blue'}">{euro.format(share.remainingTtc)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<!-- CMD-F-60/61 — la trace de la commande : passation, annulation, corrections
	     de port. Elle se lit ici plutôt que dans l'écran d'audit, qui sert à
	     chercher ce qu'on ne sait pas encore où trouver. -->
	<div class="mt-10">
		<HistoryTimeline entries={data.history} />
	</div>
</section>
