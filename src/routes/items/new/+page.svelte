<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import { CAMPUS_BADGES, ITEM_TAGS, type Campus, type ItemTag } from '@davincibot/lib';
	import { untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface Line {
		/**
		 * Identité stable de la ligne, purement locale — elle ne part jamais en base.
		 * Sans elle, le `{#each}` se keye sur l'index : retirer une ligne du milieu
		 * décale toutes les suivantes et les champs déjà saisis affichent la valeur
		 * de leur voisine. C'est la même famille de défaut que le n° 15.
		 */
		id: number;
		name: string;
		link: string;
		unitPrice: string;
		quantity: string;
		tags: ItemTag[];
		note: string;
	}

	let nextLineId = 0;

	const emptyLine = (): Line => ({
		id: nextLineId++,
		name: '',
		link: '',
		unitPrice: '',
		quantity: '1',
		tags: [],
		note: ''
	});

	// Présélection ponctuelle : un rechargement des données ne doit pas ramener le
	// sélecteur sur le premier projet alors que le membre en a choisi un autre.
	let projectId = $state<number | null>(untrack(() => data.projects.at(0)?.id ?? null));
	let chosenCampus = $state<Campus | ''>('');
	let lines = $state<Line[]>([emptyLine()]);
	let submitting = $state(false);

	const project = $derived(data.projects.find((p) => p.id === projectId) ?? null);

	// CMD-F-46 : la question n'est posée que si elle se pose. Quand le projet et le
	// profil concordent — ou que l'un des deux seulement porte un campus — la
	// destination se déduit et le membre n'a rien à trancher.
	const needsCampusChoice = $derived(project?.needsChoice ?? true);
	const effectiveCampus = $derived<Campus | null>(
		needsCampusChoice ? chosenCampus || null : (project?.campus ?? null)
	);

	const total = $derived(
		lines.reduce((sum, line) => {
			const price = Number(line.unitPrice.replace(',', '.'));
			const qty = Number(line.quantity);
			return sum + (Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0);
		}, 0)
	);

	// L'indicateur est purement informatif : côté membre, un budget insuffisant ne
	// bloque JAMAIS la demande (CMD-F-52). Le point de contrôle est placé là où la
	// dépense s'engage réellement, chez le trésorier (CMD-F-53).
	const budget = $derived(project?.budget ?? null);
	const remainingAfter = $derived(budget ? budget.remainingTtc - total : null);
	const overBudget = $derived(remainingAfter !== null && remainingAfter < 0);

	function addLine() {
		lines = [...lines, emptyLine()];
	}

	/**
	 * CMD-F-03 : retirer la DERNIÈRE ligne la réinitialise au lieu de la supprimer.
	 * Sans ça le formulaire se retrouve sans aucune ligne — c'est le défaut n° 15,
	 * où le membre perdait sa saisie en vidant son panier.
	 */
	function removeLine(id: number) {
		if (lines.length === 1) {
			lines = [emptyLine()];
			return;
		}
		lines = lines.filter((line) => line.id !== id);
	}

	function toggleTag(line: Line, tag: ItemTag) {
		line.tags = line.tags.includes(tag) ? line.tags.filter((t) => t !== tag) : [...line.tags, tag];
	}

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<svelte:head><title>Faire une commande — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Faire une commande</h1>
		<p class="mt-1 text-sm text-gray-400">
			Ajoutez autant de lignes que nécessaire et envoyez le tout en une fois. Chaque ligne devient
			un item indépendant, que vous suivrez depuis « Mes items ».
		</p>
	</header>

	{#if data.projects.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			Vous n'êtes rattaché à aucun projet. Demandez à votre chef de projet de vous ajouter.
		</p>
	{:else}
		{#if data.partnerships.length > 0}
			<!-- CMD-F-05 : recommander les partenaires, sans jamais contraindre. -->
			<p
				class="mb-4 rounded-lg bg-sky-500/10 px-4 py-3 text-sm text-sky-200 ring-1 ring-sky-500/25"
			>
				Passez en priorité par nos partenaires :
				<span class="font-medium">{data.partnerships.map((p) => p.name).join(', ')}</span>. Les
				remises et enveloppes négociées ne s'appliquent que chez eux.
			</p>
		{/if}

		{#if form?.message}
			<p
				class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
			>
				{form.message}
			</p>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<div class="mb-4 grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-gray-300">Projet</span>
					<select
						name="project_id"
						class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white"
						required
						bind:value={projectId}
					>
						{#each data.projects as p (p.id)}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</label>

				<div class="block">
					<span class="mb-1 block text-sm font-medium text-gray-300">Campus de livraison</span>
					{#if needsCampusChoice}
						<!--
							CMD-F-46 : la divergence n'est pas arbitrée par une règle. La question va à la
							personne qui demande à se faire livrer. L'item ne peut pas être créé tant qu'elle
							n'a pas été tranchée.
						-->
						<select
							name="campus"
							class="w-full rounded-lg border border-amber-500/50 bg-gray-700 p-2.5 text-white"
							required
							bind:value={chosenCampus}
						>
							<option disabled value="">À choisir…</option>
							{#each Object.entries(CAMPUS_BADGES) as [value, badge] (value)}
								<option {value}>{badge.emoji} {badge.label}</option>
							{/each}
						</select>
						<p class="mt-1 text-xs text-amber-300">
							{#if project?.diverges}
								Votre campus et celui du projet diffèrent : indiquez où vous voulez être livré.
							{:else}
								Ni le projet ni votre profil ne portent de campus : indiquez la destination.
							{/if}
						</p>
					{:else if effectiveCampus}
						<div class="flex h-[42px] items-center">
							<CampusBadge campus={effectiveCampus} />
						</div>
						<input name="campus" type="hidden" value={effectiveCampus} />
						<p class="mt-1 text-xs text-gray-500">Déduit du projet et de votre profil.</p>
					{/if}
				</div>
			</div>

			{#if budget}
				<!-- CMD-F-06 / CMD-F-50 : signalé au membre, jamais bloquant (CMD-F-52). -->
				<div
					class="mb-4 rounded-lg px-4 py-3 text-sm {overBudget
						? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30'
						: 'bg-gray-800 text-gray-300 ring-1 ring-gray-700'}"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span>
							Budget <span class="font-medium">{budget.name}</span> :
							{euro.format(budget.allocatedTtc)} alloués, {euro.format(budget.consumedTtc)} engagés,
							{euro.format(budget.requestedTtc)} déjà demandés.
						</span>
						<span class="font-medium">
							Reste après ce panier : {euro.format(remainingAfter ?? 0)}
						</span>
					</div>
					{#if overBudget}
						<p class="mt-2">
							Ce panier dépasse l'enveloppe du projet. Votre demande part quand même — la trésorerie
							sera alertée et tranchera au moment de commander.
						</p>
					{/if}
				</div>
			{/if}

			<div class="space-y-3">
				{#each lines as line, index (line.id)}
					<fieldset class="rounded-lg border border-gray-700 bg-gray-800 p-4">
						<legend class="px-2 text-xs text-gray-500">Composant {index + 1}</legend>

						<div class="grid gap-3 sm:grid-cols-12">
							<label class="sm:col-span-5">
								<span class="mb-1 block text-xs text-gray-400">Nom</span>
								<input
									name="name"
									class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
									placeholder="Résistance 10 kΩ 1 %"
									required
									bind:value={line.name}
								/>
							</label>
							<label class="sm:col-span-4">
								<span class="mb-1 block text-xs text-gray-400">Lien</span>
								<input
									name="link"
									class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
									placeholder="https://eu.mouser.com/…"
									type="url"
									bind:value={line.link}
								/>
							</label>
							<label class="sm:col-span-2">
								<!-- CMD-F-37 : le membre recopie le prix affiché sur le site, TTC, sans conversion. -->
								<span class="mb-1 block text-xs text-gray-400">Prix unitaire TTC</span>
								<input
									name="unit_price_ttc"
									class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
									min="0"
									placeholder="0,00"
									required
									step="0.01"
									type="number"
									bind:value={line.unitPrice}
								/>
							</label>
							<label class="sm:col-span-1">
								<span class="mb-1 block text-xs text-gray-400">Qté</span>
								<input
									name="quantity"
									class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
									min="1"
									required
									step="1"
									type="number"
									bind:value={line.quantity}
								/>
							</label>
						</div>

						<div class="mt-3 grid gap-3 sm:grid-cols-12">
							<div class="sm:col-span-4">
								<span class="mb-1 block text-xs text-gray-400">Tags</span>
								<div class="flex flex-wrap gap-2">
									{#each ITEM_TAGS as tag (tag)}
										<button
											class="rounded-full px-3 py-1 text-xs {line.tags.includes(tag)
												? 'bg-white text-gray-900'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
											onclick={() => {
												toggleTag(line, tag);
											}}
											type="button">{tag}</button
										>
									{/each}
								</div>
								<input name="tags" type="hidden" value={JSON.stringify(line.tags)} />
							</div>
							<label class="sm:col-span-8">
								<!--
									CMD-F-0B : c'est par la note que passe une demande de livraison à une
									autre adresse que celle du campus. Une destination utilisée une seule
									fois n'a rien à gagner à être structurée.
								-->
								<span class="mb-1 block text-xs text-gray-400">
									Note (référence exacte, urgence, variante acceptable, adresse de livraison
									exceptionnelle…)
								</span>
								<input
									name="note"
									class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
									bind:value={line.note}
								/>
							</label>
						</div>

						<div class="mt-3 flex items-center justify-between">
							<span class="text-sm text-gray-400">
								Total ligne : {euro.format(
									(Number(line.unitPrice.replace(',', '.')) || 0) * (Number(line.quantity) || 0)
								)}
							</span>
							<button
								class="text-sm text-rose-300 hover:underline"
								onclick={() => {
									removeLine(line.id);
								}}
								type="button">Retirer</button
							>
						</div>
					</fieldset>
				{/each}
			</div>

			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<button
					class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
					onclick={addLine}
					type="button">+ Ajouter un composant</button
				>
				<div class="flex items-center gap-4">
					<span class="text-lg font-medium text-white">Total : {euro.format(total)}</span>
					<a
						class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
						href={resolve('/')}>Annuler</a
					>
					<button
						class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
						disabled={submitting || (needsCampusChoice && !chosenCampus)}
						type="submit">{submitting ? 'Envoi…' : 'Envoyer la demande'}</button
					>
				</div>
			</div>
		</form>
	{/if}
</section>
