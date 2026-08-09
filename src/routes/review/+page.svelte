<script lang="ts">
	import { enhance } from '$app/forms';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import { REFUSAL_REASON_MIN_LENGTH, refusalReasonError } from '@davincibot/lib';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const items = $derived(data.items);
	const projects = $derived(data.projects);

	let projectFilter = $state<number | 'all'>('all');
	const selected = new SvelteSet<number>();
	// Items visés par le panneau de motif. Vide = panneau fermé. Un refus
	// unitaire et un refus en lot n'y diffèrent que par la taille de la liste :
	// même formulaire, même validation, même action serveur.
	let refusing = $state<number[]>([]);
	let reason = $state('');

	const visible = $derived(
		projectFilter === 'all' ? items : items.filter((i) => i.projectId === projectFilter)
	);

	const visibleIds = $derived(visible.map((i) => i.id));
	const selectedVisible = $derived(visibleIds.filter((id) => selected.has(id)));
	const allVisibleSelected = $derived(
		visibleIds.length > 0 && selectedVisible.length === visibleIds.length
	);

	const refusedItems = $derived(items.filter((i) => refusing.includes(i.id)));
	const reasonError = $derived(reason.length > 0 ? refusalReasonError(reason) : null);

	function toggle(id: number) {
		if (selected.has(id)) {
			selected.delete(id);
		} else {
			selected.add(id);
		}
	}

	function toggleAll() {
		const remove = allVisibleSelected;
		for (const id of visibleIds) {
			if (remove) {
				selected.delete(id);
			} else {
				selected.add(id);
			}
		}
	}

	function openRefusal(ids: number[]) {
		refusing = ids;
		reason = '';
	}

	function closeRefusal() {
		refusing = [];
		reason = '';
	}

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	/** Attente en jours pleins, telle que le CDP doit la lire dans la file. */
	function waitingDays(iso: string): number {
		return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
	}

	// `ActionData` est l'union des retours des deux actions ; chaque champ ne
	// vit que dans une branche, d'où les gardes `in` plutôt qu'un accès direct.
	const failure = $derived(form && 'message' in form ? form.message : null);

	const outcome = $derived.by(() => {
		// `ignored` compte les items qu'un co-CDP a traités entre l'affichage de la
		// file et la soumission : les taire ferait croire à une action complète.
		const traites = (ignored: number | undefined) =>
			ignored && ignored > 0 ? ` ${String(ignored)} déjà traité(s) entre-temps.` : '';
		if (form && 'approved' in form) {
			return `${String(form.approved)} item(s) validé(s).${traites(form.ignored)}`;
		}
		if (form && 'refused' in form) {
			return `${String(form.refused)} item(s) refusé(s).${traites(form.ignored)}`;
		}
		return null;
	});
</script>

<svelte:head><title>Items à valider — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Items à valider</h1>
		<p class="mt-1 text-sm text-gray-400">
			Les demandes en attente sur {projects.length > 1 ? 'vos projets' : 'votre projet'}, de la plus
			ancienne à la plus récente. Un item validé part aussitôt dans la file du trésorier ; un item
			refusé sort du circuit avec son motif, visible par son auteur.
		</p>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	{#if outcome}
		<p
			class="mb-4 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-500/30"
		>
			{outcome}
		</p>
	{/if}

	{#if projects.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			Vous n'êtes chef de projet d'aucun projet actif : il n'y a rien à revoir ici.
		</p>
	{:else}
		{#if projects.length > 1}
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<button
					class="rounded-full px-3 py-1 text-xs font-medium {projectFilter === 'all'
						? 'bg-white text-gray-900'
						: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					onclick={() => (projectFilter = 'all')}
					type="button">Tous les projets ({items.length})</button
				>
				{#each projects as project (project.id)}
					<button
						class="rounded-full px-3 py-1 text-xs font-medium {projectFilter === project.id
							? 'bg-white text-gray-900'
							: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
						onclick={() => (projectFilter = project.id)}
						type="button"
						>{project.name} ({items.filter((i) => i.projectId === project.id).length})</button
					>
				{/each}
			</div>
		{/if}

		{#if visible.length === 0}
			<p
				class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400"
			>
				Aucune demande en attente. Tout est à jour.
			</p>
		{:else}
			<div
				class="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3"
			>
				<label class="flex items-center gap-2 text-sm text-gray-300">
					<input
						class="size-4 rounded border-gray-600 bg-gray-700"
						checked={allVisibleSelected}
						onchange={toggleAll}
						type="checkbox"
					/>
					Tout sélectionner
				</label>
				<span class="text-sm text-gray-400">{selectedVisible.length} sélectionné(s)</span>

				<div class="ml-auto flex flex-wrap items-center gap-2">
					<form action="?/approve" method="POST" use:enhance>
						{#each selectedVisible as id (id)}
							<input name="id" type="hidden" value={id} />
						{/each}
						<button
							class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
							disabled={selectedVisible.length === 0}
							type="submit">Valider la sélection</button
						>
					</form>
					<button
						class="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
						disabled={selectedVisible.length === 0}
						onclick={() => {
							openRefusal(selectedVisible);
						}}
						type="button">Refuser la sélection</button
					>
				</div>
			</div>

			{#if refusing.length > 0}
				<form
					class="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/5 p-4"
					action="?/refuse"
					method="POST"
					use:enhance={() =>
						({ update }) => {
							closeRefusal();
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
					<p class="mt-1 text-xs text-gray-400">
						{refusedItems.map((i) => i.name).join(' · ')}
					</p>
					<label class="mt-3 block text-sm text-gray-300" for="refusal-reason">
						Motif — il sera lu par {refusedItems.length === 1 ? 'son auteur' : 'leurs auteurs'}
					</label>
					<textarea
						id="refusal-reason"
						name="reason"
						class="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white placeholder-gray-400"
						placeholder="Ex. : hors budget ce trimestre, à représenter en septembre."
						rows="3"
						bind:value={reason}></textarea>
					{#if reasonError}
						<p class="mt-1 text-xs text-rose-300">{reasonError}</p>
					{:else}
						<p class="mt-1 text-xs text-gray-500">
							{REFUSAL_REASON_MIN_LENGTH} caractères minimum.
						</p>
					{/if}
					<div class="mt-3 flex items-center gap-2">
						<button
							class="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-40"
							disabled={reason.trim().length < REFUSAL_REASON_MIN_LENGTH}
							type="submit">Confirmer le refus</button
						>
						<button
							class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
							onclick={closeRefusal}
							type="button">Annuler</button
						>
					</div>
				</form>
			{/if}

			<ul class="space-y-3">
				{#each visible as item (item.id)}
					<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
						<div class="flex flex-wrap items-start gap-3">
							<input
								class="mt-1 size-4 shrink-0 rounded border-gray-600 bg-gray-700"
								checked={selected.has(item.id)}
								onchange={() => {
									toggle(item.id);
								}}
								type="checkbox"
							/>

							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									{#if item.link}
										<!-- eslint-disable svelte/no-navigation-without-resolve -- URL marchande externe saisie par le membre, hors routes de l'app -->
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
								<p class="mt-1 text-sm text-gray-400">
									{item.projectName} · demandé par
									<span class="text-gray-200">{item.requesterName}</span>
									· {item.quantity} × {euro.format(item.unitPriceTtc)} =
									<span class="font-medium text-gray-200">{euro.format(item.totalTtc)}</span>
								</p>
								<p class="mt-1 text-xs text-gray-500">
									{day.format(new Date(item.createdAt))}
									{#if waitingDays(item.createdAt) >= 1}
										· en attente depuis {waitingDays(item.createdAt)} jour(s)
									{/if}
									{#if item.tags.length > 0}
										· {item.tags.join(' · ')}
									{/if}
								</p>
								{#if item.note}
									<p class="mt-2 rounded bg-gray-700/50 px-2 py-1 text-sm text-gray-300">
										{item.note}
									</p>
								{/if}
							</div>

							<div class="flex shrink-0 items-center gap-2">
								<form action="?/approve" method="POST" use:enhance>
									<input name="id" type="hidden" value={item.id} />
									<button
										class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
										type="submit">Valider</button
									>
								</form>
								<button
									class="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
									onclick={() => {
										openRefusal([item.id]);
									}}
									type="button">Refuser</button
								>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>
