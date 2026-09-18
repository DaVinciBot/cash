<script lang="ts">
	import { Checkbox } from '@davincibot/components';
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
		<p class="text-dark-light-blue mt-1 text-sm">
			Les demandes en attente sur {projects.length > 1 ? 'vos projets' : 'votre projet'}, de la plus
			ancienne à la plus récente. Un item validé part aussitôt dans la file du trésorier ; un item
			refusé sort du circuit avec son motif, visible par son auteur.
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

	{#if projects.length === 0}
		<p
			class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Vous n'êtes chef de projet d'aucun projet actif : il n'y a rien à revoir ici.
		</p>
	{:else}
		{#if projects.length > 1}
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<button
					class="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {projectFilter ===
					'all'
						? 'border-light-blue bg-light-blue text-dark-blue'
						: 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'}"
					onclick={() => (projectFilter = 'all')}
					type="button">Tous les projets ({items.length})</button
				>
				{#each projects as project (project.id)}
					<button
						class="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors {projectFilter ===
						project.id
							? 'border-light-blue bg-light-blue text-dark-blue'
							: 'border-light-blue/30 bg-dark-blue/60 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue'}"
						onclick={() => (projectFilter = project.id)}
						type="button"
						>{project.name} ({items.filter((i) => i.projectId === project.id).length})</button
					>
				{/each}
			</div>
		{/if}

		{#if visible.length === 0}
			<p
				class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
			>
				Aucune demande en attente. Tout est à jour.
			</p>
		{:else}
			<div
				class="border-light-blue/20 bg-blue-gray/15 mb-3 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
			>
				<label class="text-dark-light-blue flex items-center gap-2 text-sm">
					<Checkbox checked={allVisibleSelected} className="size-4" onchange={toggleAll} />
					Tout sélectionner
				</label>
				<span class="text-dark-light-blue text-sm">{selectedVisible.length} sélectionné(s)</span>

				<div class="ml-auto flex flex-wrap items-center gap-2">
					<form action="?/approve" method="POST" use:enhance>
						{#each selectedVisible as id (id)}
							<input name="id" type="hidden" value={id} />
						{/each}
						<button
							class="bg-light-blue text-dark-blue rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-white disabled:opacity-40"
							disabled={selectedVisible.length === 0}
							type="submit">Valider la sélection</button
						>
					</form>
					<button
						class="border-light-blue/30 rounded-xl border px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40"
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
					class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
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
					<h2 class="text-sm font-semibold text-red-300">
						Refuser {refusing.length === 1 ? 'cet item' : `ces ${String(refusing.length)} items`}
					</h2>
					<p class="text-dark-light-blue mt-1 text-xs">
						{refusedItems.map((i) => i.name).join(' · ')}
					</p>
					<label class="text-dark-light-blue mt-3 block text-sm" for="refusal-reason">
						Motif — il sera lu par {refusedItems.length === 1 ? 'son auteur' : 'leurs auteurs'}
					</label>
					<textarea
						id="refusal-reason"
						name="reason"
						class="border-light-blue/30 bg-dark-blue/60 placeholder-dark-light-blue/50 mt-1 w-full rounded-lg border p-2 text-sm text-white"
						placeholder="Ex. : hors budget ce trimestre, à représenter en septembre."
						rows="3"
						bind:value={reason}></textarea>
					{#if reasonError}
						<p class="mt-1 text-xs text-red-400">{reasonError}</p>
					{:else}
						<p class="text-dark-light-blue/70 mt-1 text-xs">
							{REFUSAL_REASON_MIN_LENGTH} caractères minimum.
						</p>
					{/if}
					<div class="mt-3 flex items-center gap-2">
						<button
							class="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-40"
							disabled={reason.trim().length < REFUSAL_REASON_MIN_LENGTH}
							type="submit">Confirmer le refus</button
						>
						<button
							class="border-light-blue/30 text-dark-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
							onclick={closeRefusal}
							type="button">Annuler</button
						>
					</div>
				</form>
			{/if}

			<ul class="space-y-3">
				{#each visible as item (item.id)}
					<li class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
						<div class="flex flex-wrap items-start gap-3">
							<Checkbox
								checked={selected.has(item.id)}
								className="mt-1 size-4 shrink-0"
								onchange={() => {
									toggle(item.id);
								}}
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
								<p class="text-dark-light-blue mt-1 text-sm">
									{item.projectName} · demandé par
									<span class="text-light-blue">{item.requesterName}</span>
									· {item.quantity} × {euro.format(item.unitPriceTtc)} =
									<span class="text-light-blue font-medium">{euro.format(item.totalTtc)}</span>
								</p>
								<p class="text-dark-light-blue/70 mt-1 text-xs">
									{day.format(new Date(item.createdAt))}
									{#if waitingDays(item.createdAt) >= 1}
										· en attente depuis {waitingDays(item.createdAt)} jour(s)
									{/if}
									{#if item.tags.length > 0}
										· {item.tags.join(' · ')}
									{/if}
								</p>
								{#if item.note}
									<p class="bg-dark-blue/40 text-dark-light-blue mt-2 rounded px-2 py-1 text-sm">
										{item.note}
									</p>
								{/if}
							</div>

							<div class="flex shrink-0 items-center gap-2">
								<form action="?/approve" method="POST" use:enhance>
									<input name="id" type="hidden" value={item.id} />
									<button
										class="bg-light-blue text-dark-blue rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-white"
										type="submit">Valider</button
									>
								</form>
								<button
									class="border-light-blue/30 rounded-xl border px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
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
