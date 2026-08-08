<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import { ITEM_TAGS, type ItemTag } from '@davincibot/lib';
	import { untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Amorçage volontairement ponctuel : le formulaire prend la valeur chargée puis
	// appartient à l'utilisateur. Sans untrack, Svelte signale — à raison — qu'on
	// lit une valeur réactive hors de tout effet ; ici c'est bien l'intention, un
	// rechargement des données ne doit pas écraser une saisie en cours.
	const initial = untrack(() => data.item);

	let name = $state(initial.name);
	let link = $state(initial.link);
	let unitPrice = $state(String(initial.unitPriceTtc));
	let quantity = $state(String(initial.quantity));
	let tags = $state<ItemTag[]>([...initial.tags]);
	let note = $state(initial.note);
	let submitting = $state(false);

	const total = $derived((Number(unitPrice.replace(',', '.')) || 0) * (Number(quantity) || 0));

	function toggleTag(tag: ItemTag) {
		tags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
	}

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<svelte:head><title>Modifier un item — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Modifier un item</h1>
		<p class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
			<span>{data.projectName}</span>
			<CampusBadge campus={data.item.campus} />
			<span>
				Le projet et le campus sont figés à la création : pour en changer, supprimez cet item et
				refaites la demande.
			</span>
		</p>
	</header>

	{#if form?.message}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{form.message}
		</p>
	{/if}

	<form
		class="rounded-lg border border-gray-700 bg-gray-800 p-6"
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<div class="grid gap-4 sm:grid-cols-12">
			<label class="sm:col-span-6">
				<span class="mb-1 block text-sm text-gray-300">Nom</span>
				<input
					name="name"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white"
					required
					bind:value={name}
				/>
			</label>
			<label class="sm:col-span-6">
				<span class="mb-1 block text-sm text-gray-300">Lien</span>
				<input
					name="link"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white"
					type="url"
					bind:value={link}
				/>
			</label>
			<label class="sm:col-span-3">
				<span class="mb-1 block text-sm text-gray-300">Prix unitaire TTC</span>
				<input
					name="unit_price_ttc"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white"
					min="0"
					required
					step="0.01"
					type="number"
					bind:value={unitPrice}
				/>
			</label>
			<label class="sm:col-span-3">
				<span class="mb-1 block text-sm text-gray-300">Quantité</span>
				<input
					name="quantity"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white"
					min="1"
					required
					step="1"
					type="number"
					bind:value={quantity}
				/>
			</label>
			<div class="sm:col-span-6">
				<span class="mb-1 block text-sm text-gray-300">Tags</span>
				<div class="flex flex-wrap gap-2 pt-1.5">
					{#each ITEM_TAGS as tag (tag)}
						<button
							class="rounded-full px-3 py-1 text-xs {tags.includes(tag)
								? 'bg-white text-gray-900'
								: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
							onclick={() => {
								toggleTag(tag);
							}}
							type="button">{tag}</button
						>
					{/each}
				</div>
				<input name="tags" type="hidden" value={JSON.stringify(tags)} />
			</div>
			<label class="sm:col-span-12">
				<span class="mb-1 block text-sm text-gray-300">Note</span>
				<textarea
					name="note"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white"
					rows="2"
					bind:value={note}></textarea>
			</label>
		</div>

		<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
			<span class="text-lg font-medium text-white">Total : {euro.format(total)}</span>
			<div class="flex gap-3">
				<a
					class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
					href={resolve('/')}>Annuler</a
				>
				<button
					class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
					disabled={submitting}
					type="submit">{submitting ? 'Enregistrement…' : 'Enregistrer'}</button
				>
			</div>
		</div>
	</form>
</section>
