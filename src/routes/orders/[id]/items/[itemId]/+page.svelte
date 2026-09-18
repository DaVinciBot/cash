<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import HistoryTimeline from '$lib/components/cash/HistoryTimeline.svelte';
	import { untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
	const leaves = $derived(data.leaves);

	interface Line {
		id: number;
		budgetId: number | null;
		amount: string;
	}

	let nextLineId = 0;

	// Amorçage à la déclaration et non dans un `$effect` : un effet ne s'exécute
	// qu'après hydratation, si bien que le rendu serveur afficherait un
	// formulaire vide avant de se remplir sous les yeux. `untrack` dit
	// explicitement que la lecture est ponctuelle — le formulaire appartient
	// ensuite à la saisie, et un rechargement ne doit pas l'écraser.
	const seed = untrack(() => data.item);

	let name = $state(seed.name);
	let link = $state(seed.link ?? '');
	let unitPrice = $state(seed.unitPriceTtc.toFixed(2).replace('.', ','));
	let quantity = $state(String(seed.quantity));
	let lines = $state<Line[]>(
		seed.allocations.length > 0
			? seed.allocations.map((a) => ({
					id: nextLineId++,
					budgetId: a.budgetId,
					amount: a.amountTtc.toFixed(2).replace('.', ',')
				}))
			: [{ id: nextLineId++, budgetId: null, amount: '' }]
	);

	const parsedUnit = $derived(Number(unitPrice.replace(',', '.')));
	const parsedQuantity = $derived(Number(quantity));
	const totalTtc = $derived(
		Number.isFinite(parsedUnit) && Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0
			? Math.round((Math.round(parsedUnit * 100) / 100) * parsedQuantity * 100) / 100
			: 0
	);

	const allocated = $derived(
		Math.round(
			lines.reduce((sum, l) => {
				const value = Number(l.amount.replace(',', '.'));
				return sum + (Number.isFinite(value) && value > 0 ? value : 0);
			}, 0) * 100
		) / 100
	);
	const filled = $derived(lines.filter((l) => l.budgetId !== null && l.amount.trim() !== ''));
	const allocationMismatch = $derived(filled.length > 0 && allocated !== totalTtc);

	function addLine() {
		lines = [...lines, { id: nextLineId++, budgetId: null, amount: '' }];
	}

	function removeLine(id: number) {
		lines =
			lines.length > 1 ? lines.filter((l) => l.id !== id) : [{ id, budgetId: null, amount: '' }];
	}

	/** Porte tout le total sur la première ligne : le cas courant reste un budget unique. */
	function fillFirst() {
		if (lines.length === 0) {
			return;
		}
		lines = lines.map((l, index) =>
			index === 0 ? { ...l, amount: totalTtc.toFixed(2).replace('.', ',') } : { ...l, amount: '' }
		);
	}

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<svelte:head><title>Modifier {item.name} — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a
		class="text-dark-light-blue hover:text-light-blue text-sm"
		href={resolve('/orders/[id]', { id: String(data.order.id) })}
		>← Commande #{data.order.id}
	</a>

	<h1 class="mt-3 mb-1 text-2xl font-bold text-white">Modifier l'item</h1>
	<p class="text-dark-light-blue mb-6 text-sm">
		Demandé par {item.requesterName} pour {item.projectName}. Une correction reste possible même
		après le passage de la commande ; elle est tracée dans l'historique.
	</p>

	{#if form?.message}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{form.message}
		</p>
	{/if}

	<form class="space-y-5" method="POST" use:enhance>
		<div>
			<label class="text-dark-light-blue block text-sm" for="name">Nom</label>
			<input
				id="name"
				name="name"
				class="border-light-blue/30 bg-dark-blue/60 mt-1 w-full rounded-lg border p-2 text-sm text-white"
				required
				bind:value={name}
			/>
		</div>

		<div>
			<label class="text-dark-light-blue block text-sm" for="link">Lien marchand</label>
			<input
				id="link"
				name="link"
				class="border-light-blue/30 bg-dark-blue/60 mt-1 w-full rounded-lg border p-2 text-sm text-white"
				placeholder="https://…"
				type="url"
				bind:value={link}
			/>
		</div>

		<div class="flex flex-wrap items-end gap-4">
			<div>
				<label class="text-dark-light-blue block text-sm" for="unit_price_ttc"
					>Prix unitaire TTC</label
				>
				<input
					id="unit_price_ttc"
					name="unit_price_ttc"
					class="border-light-blue/30 bg-dark-blue/60 mt-1 w-32 rounded-lg border p-2 text-sm text-white"
					inputmode="decimal"
					required
					bind:value={unitPrice}
				/>
			</div>
			<div>
				<label class="text-dark-light-blue block text-sm" for="quantity">Quantité</label>
				<input
					id="quantity"
					name="quantity"
					class="border-light-blue/30 bg-dark-blue/60 mt-1 w-24 rounded-lg border p-2 text-sm text-white"
					min="1"
					required
					step="1"
					type="number"
					bind:value={quantity}
				/>
			</div>
			<p class="text-dark-light-blue pb-2 text-sm">
				Total : <span class="font-semibold text-white">{euro.format(totalTtc)}</span>
			</p>
		</div>

		<!-- CMD-F-18 / CMD-F-19 — imputation, éventuellement répartie. -->
		<fieldset class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
			<legend class="text-light-blue px-1 text-sm font-semibold">Imputation budgétaire</legend>
			<p class="text-dark-light-blue mb-3 text-xs">
				Seules les feuilles actives de l'année scolaire sont proposées. La somme des parts doit
				égaler le total de l'item.
			</p>

			{#each lines as line (line.id)}
				<div class="mb-2 flex flex-wrap items-end gap-2">
					<label class="text-dark-light-blue flex-1 text-xs">
						Budget
						<select
							name="budget"
							class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
							bind:value={line.budgetId}
						>
							<option value={null}>— aucun —</option>
							{#each leaves as leaf (leaf.id)}
								<option value={leaf.id}>{leaf.path} · reste {euro.format(leaf.remainingTtc)}</option
								>
							{/each}
						</select>
					</label>
					<label class="text-dark-light-blue text-xs">
						Part TTC
						<input
							name="amount"
							class="border-light-blue/30 bg-dark-blue/60 mt-1 block w-28 rounded-lg border p-2 text-sm text-white"
							inputmode="decimal"
							placeholder="0,00"
							bind:value={line.amount}
						/>
					</label>
					<button
						class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-2 text-sm"
						onclick={() => {
							removeLine(line.id);
						}}
						type="button">Retirer</button
					>
				</div>
			{/each}

			<div class="mt-3 flex flex-wrap items-center gap-2">
				<button
					class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-1.5 text-sm"
					onclick={addLine}
					type="button">Répartir sur un budget de plus</button
				>
				<button
					class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-1.5 text-sm"
					onclick={fillFirst}
					type="button">Tout sur le premier</button
				>
				<span class="text-xs {allocationMismatch ? 'text-rose-300' : 'text-dark-light-blue'}">
					Imputé : {euro.format(allocated)} sur {euro.format(totalTtc)}
				</span>
			</div>
		</fieldset>

		<div class="flex items-center gap-2">
			<button
				class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
				disabled={allocationMismatch}
				type="submit">Enregistrer</button
			>
			<a
				class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-lg border px-4 py-2 text-sm"
				href={resolve('/orders/[id]', { id: String(data.order.id) })}
				>Annuler
			</a>
		</div>
	</form>
	<!-- CMD-F-60 — qui a corrigé le prix, et quand. Le trésorier édite ici : la
	     trace de ses corrections a sa place sous le formulaire. -->
	<div class="mt-10">
		<HistoryTimeline entries={data.history} />
	</div>
</section>
