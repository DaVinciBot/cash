<script lang="ts">
	import { enhance } from '$app/forms';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import { REFUSAL_REASON_MIN_LENGTH, refusalReasonError } from '@davincibot/lib';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const items = $derived(data.items);

	const selected = new SvelteSet<number>();
	let refusing = $state<number[]>([]);
	let reason = $state('');
	// Pré-regroupement par marchand : le domaine est déjà déduit du lien à la
	// saisie (CMD-F-16). Regrouper la file par domaine est le confort minimal qui
	// évite d'éplucher vingt lignes pour retrouver les trois du même fournisseur.
	// Type explicite : sans lui `$state(true)` s'infère au littéral `true`, et la
	// branche « ne pas grouper » passe pour du code mort.
	let groupByDomain = $state<boolean>(true);

	const chosen = $derived(items.filter((i) => selected.has(i.id)));
	const chosenTotal = $derived(chosen.reduce((sum, i) => sum + i.totalTtc, 0));
	const chosenCampuses = $derived(new SvelteSet(chosen.map((i) => i.campus)));
	const campusConflict = $derived(chosenCampuses.size > 1);

	// Groupes construits en tableau plutôt qu'en Map : la valeur est recalculée
	// entièrement à chaque dépendance, donc aucune réactivité de collection n'est
	// en jeu — et `svelte/prefer-svelte-reactivity` ne distingue pas les deux cas.
	const groups = $derived.by(() => {
		if (!groupByDomain) {
			return [{ key: 'Tous les items', items }];
		}
		const buckets: { key: string; items: typeof items }[] = [];
		for (const item of items) {
			const key = item.domain ?? 'Sans lien';
			const bucket = buckets.find((b) => b.key === key);
			if (bucket) {
				bucket.items.push(item);
			} else {
				buckets.push({ key, items: [item] });
			}
		}
		return buckets.sort(
			(a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key, 'fr')
		);
	});

	function toggle(id: number) {
		if (selected.has(id)) {
			selected.delete(id);
		} else {
			selected.add(id);
		}
	}

	function selectGroup(ids: number[]) {
		const allIn = ids.every((id) => selected.has(id));
		for (const id of ids) {
			if (allIn) {
				selected.delete(id);
			} else {
				selected.add(id);
			}
		}
	}

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const reasonError = $derived(reason.length > 0 ? refusalReasonError(reason) : null);
	const failure = $derived(form && 'message' in form ? form.message : null);
	const outcome = $derived(
		form && 'refused' in form ? `${String(form.refused)} item(s) refusé(s).` : null
	);

	function waitingDays(iso: string | null): number | null {
		if (!iso) {
			return null;
		}
		return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
	}
</script>

<svelte:head><title>Items à regrouper — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Items à regrouper</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Les items validés par leur chef de projet, du plus anciennement validé au plus récent. Cochez
			ce qui part chez un même marchand, pour un même campus.
		</p>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}
	{#if outcome}
		<p
			class="mb-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30"
		>
			{outcome}
		</p>
	{/if}

	{#if items.length === 0}
		<p
			class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucun item validé en attente de regroupement.
		</p>
	{:else}
		<div
			class="border-light-blue/20 bg-blue-gray/15 mb-3 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
		>
			<label class="text-dark-light-blue flex items-center gap-2 text-sm">
				<input
					class="border-light-blue/30 bg-dark-blue/60 size-4 rounded"
					type="checkbox"
					bind:checked={groupByDomain}
				/>
				Grouper par marchand
			</label>
			<span class="text-dark-light-blue text-sm">
				{selected.size} sélectionné(s) · {euro.format(chosenTotal)}
			</span>

			<div class="ml-auto flex flex-wrap items-center gap-2">
				<form action="?/create" method="POST" use:enhance>
					{#each chosen as item (item.id)}
						<input name="id" type="hidden" value={item.id} />
					{/each}
					<button
						class="bg-light-blue text-dark-blue rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-white disabled:opacity-40"
						disabled={selected.size === 0 || campusConflict}
						type="submit">Créer une commande</button
					>
				</form>
				<button
					class="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
					disabled={selected.size === 0}
					onclick={() => {
						refusing = chosen.map((i) => i.id);
						reason = '';
					}}
					type="button">Refuser la sélection</button
				>
			</div>
		</div>

		{#if campusConflict}
			<p
				class="mb-4 rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-500/30"
			>
				Une commande n'a qu'une destination. Votre sélection mélange deux campus : retirez-en un
				avant de créer la commande (CMD-F-45).
			</p>
		{/if}

		{#if refusing.length > 0}
			<form
				class="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4"
				action="?/refuse"
				method="POST"
				use:enhance={() =>
					({ update }) => {
						refusing = [];
						reason = '';
						selected.clear();
						return update();
					}}
			>
				{#each refusing as id (id)}
					<input name="id" type="hidden" value={id} />
				{/each}
				<h2 class="text-sm font-semibold text-rose-200">
					Refuser {refusing.length === 1 ? 'cet item' : `ces ${String(refusing.length)} items`}
				</h2>
				<p class="text-dark-light-blue mt-1 text-xs">
					Le refus est terminal et se distingue de celui du chef de projet : le membre saura que la
					décision est financière.
				</p>
				<label class="text-dark-light-blue mt-3 block text-sm" for="treso-reason">
					Motif — il sera lu par le membre
				</label>
				<textarea
					id="treso-reason"
					name="reason"
					class="border-light-blue/30 bg-dark-blue/60 placeholder-dark-light-blue/50 mt-1 w-full rounded-lg border p-2 text-sm text-white"
					placeholder="Ex. : dépense reportée au prochain exercice, enveloppe épuisée."
					rows="3"
					bind:value={reason}></textarea>
				{#if reasonError}
					<p class="mt-1 text-xs text-rose-300">{reasonError}</p>
				{/if}
				<div class="mt-3 flex items-center gap-2">
					<button
						class="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-40"
						disabled={reason.trim().length < REFUSAL_REASON_MIN_LENGTH}
						type="submit">Confirmer le refus</button
					>
					<button
						class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
						onclick={() => {
							refusing = [];
						}}
						type="button">Annuler</button
					>
				</div>
			</form>
		{/if}

		{#each groups as group (group.key)}
			<div class="mb-5">
				<div class="mb-2 flex items-center gap-3">
					<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">
						{group.key}
					</h2>
					<span class="text-dark-light-blue/70 text-xs">{group.items.length} item(s)</span>
					<button
						class="text-dark-light-blue hover:text-light-blue text-xs underline"
						onclick={() => {
							selectGroup(group.items.map((i) => i.id));
						}}
						type="button">Tout cocher</button
					>
				</div>
				<ul class="space-y-2">
					{#each group.items as item (item.id)}
						<li class="border-light-blue/20 bg-blue-gray/15 rounded-lg border p-3">
							<div class="flex flex-wrap items-start gap-3">
								<input
									class="border-light-blue/30 bg-dark-blue/60 mt-1 size-4 shrink-0 rounded"
									checked={selected.has(item.id)}
									onchange={() => {
										toggle(item.id);
									}}
									type="checkbox"
								/>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										{#if item.link}
											<!-- eslint-disable svelte/no-navigation-without-resolve -- URL marchande externe saisie par le membre -->
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
										<CampusBadge campus={item.campus} />
									</div>
									<p class="text-dark-light-blue mt-1 text-sm">
										{item.projectName} · {item.requesterName} · {item.quantity} × {euro.format(
											item.unitPriceTtc
										)} =
										<span class="text-light-blue font-medium">{euro.format(item.totalTtc)}</span>
									</p>
									{#if item.cdpApprovedAt}
										<p class="text-dark-light-blue/70 mt-1 text-xs">
											validé le {day.format(new Date(item.cdpApprovedAt))}
											{#if (waitingDays(item.cdpApprovedAt) ?? 0) >= 1}
												· en attente depuis {waitingDays(item.cdpApprovedAt)} jour(s)
											{/if}
											{#if item.tags.length > 0}
												· {item.tags.join(' · ')}
											{/if}
										</p>
									{/if}
									{#if item.note}
										<p class="bg-dark-blue/40 text-dark-light-blue mt-2 rounded px-2 py-1 text-sm">
											{item.note}
										</p>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</section>
