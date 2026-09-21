<script lang="ts">
	import { Button, FilterChip } from '@davincibot/components';
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
	// `bind:value` sur un `<input type="number">` coerce en nombre (et en `null`
	// quand le champ est vidé) : amorcer en chaîne mentait sur le type et faisait
	// planter le calcul du total à la première saisie.
	let unitPrice = $state<number | null>(initial.unitPriceTtc);
	let quantity = $state<number | null>(initial.quantity);
	let tags = $state<ItemTag[]>([...initial.tags]);
	let note = $state(initial.note);
	let submitting = $state(false);

	const total = $derived((unitPrice ?? 0) * (quantity ?? 0));

	function toggleTag(tag: ItemTag) {
		tags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
	}

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<svelte:head><title>Modifier un item — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Modifier un item</h1>
		<p class="text-dark-light-blue mt-1 flex flex-wrap items-center gap-2 text-sm">
			<span>{data.projectName}</span>
			<CampusBadge campus={data.item.campus} />
			<span>
				Le projet et le campus sont figés à la création : pour en changer, supprimez cet item et
				refaites la demande.
			</span>
		</p>
	</header>

	{#if form?.message}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{form.message}
		</p>
	{/if}

	<form
		class="border-light-blue/20 bg-blue-gray/15 rounded-lg border p-6"
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
				<span class="text-dark-light-blue mb-1 block text-sm">Nom</span>
				<input
					name="name"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 w-full rounded-xl border p-2.5 focus:outline-none disabled:opacity-50"
					required
					bind:value={name}
				/>
			</label>
			<label class="sm:col-span-6">
				<span class="text-dark-light-blue mb-1 block text-sm">Lien</span>
				<input
					name="link"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 w-full rounded-xl border p-2.5 focus:outline-none disabled:opacity-50"
					type="url"
					bind:value={link}
				/>
			</label>
			<label class="sm:col-span-3">
				<span class="text-dark-light-blue mb-1 block text-sm">Prix unitaire TTC</span>
				<input
					name="unit_price_ttc"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 w-full rounded-xl border p-2.5 focus:outline-none disabled:opacity-50"
					min="0"
					required
					step="0.01"
					type="number"
					bind:value={unitPrice}
				/>
			</label>
			<label class="sm:col-span-3">
				<span class="text-dark-light-blue mb-1 block text-sm">Quantité</span>
				<input
					name="quantity"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 w-full rounded-xl border p-2.5 focus:outline-none disabled:opacity-50"
					min="1"
					required
					step="1"
					type="number"
					bind:value={quantity}
				/>
			</label>
			<div class="sm:col-span-6">
				<span class="text-dark-light-blue mb-1 block text-sm">Tags</span>
				<div class="flex flex-wrap gap-2 pt-1.5">
					{#each ITEM_TAGS as tag (tag)}
						<FilterChip
							onclick={() => {
								toggleTag(tag);
							}}
							pressed={tags.includes(tag)}
						>
							{tag}
						</FilterChip>
					{/each}
				</div>
				<input name="tags" type="hidden" value={JSON.stringify(tags)} />
			</div>
			<label class="sm:col-span-12">
				<span class="text-dark-light-blue mb-1 block text-sm">Note</span>
				<textarea
					name="note"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 w-full rounded-xl border p-2.5 focus:outline-none disabled:opacity-50"
					rows="2"
					bind:value={note}></textarea>
			</label>
		</div>

		<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
			<span class="text-lg font-medium text-white">Total : {euro.format(total)}</span>
			<div class="flex gap-3">
				<Button href={resolve('/')} size="md" variant="secondary">Annuler</Button>
				<Button disabled={submitting} size="md" type="submit" variant="primary"
					>{submitting ? 'Enregistrement…' : 'Enregistrer'}</Button
				>
			</div>
		</div>
	</form>
</section>
