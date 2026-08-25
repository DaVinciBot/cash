<script lang="ts">
	// Identité de l'émetteur — un écran, un seul objet.
	//
	// Elle était auparavant un panneau dépliant sur l'écran des documents, à côté
	// du bouton « Émettre » : deux actes de nature différente au même endroit, et
	// l'on ne savait plus lequel on était en train de faire.
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { OFFICER_GENDERS, OFFICER_GENDER_LABELS, officerTitle } from '$lib/documents';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const failure = $derived(form && 'message' in form ? form.message : null);
	const saved = $derived(form && 'saved' in form ? form.saved : false);
</script>

<svelte:head><title>Identité de l'émetteur — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury/documents')}
		>← Documents</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Identité de l'émetteur</h1>
		<p class="mt-1 text-sm text-gray-400">
			Ces mentions figurent sur chaque document et y sont <strong>figées à l'émission</strong> : les corriger
			ici ne réécrit pas les documents déjà partis.
		</p>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}
	{#if saved}
		<p
			class="mb-4 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-500/30"
		>
			Identité enregistrée.
		</p>
	{/if}

	<form
		class="rounded-lg border border-gray-700 bg-gray-800 p-4"
		action="?/save"
		method="POST"
		use:enhance
	>
		<h2 class="mb-1 text-sm font-semibold text-gray-200">Identité de l'émetteur</h2>
		<p class="mb-3 text-xs text-gray-500">
			Ces mentions figurent sur chaque document et y sont figées à l'émission : les corriger ici ne
			réécrit pas les documents déjà partis.
		</p>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="text-xs text-gray-300">
				Genre de la présidence
				<select
					name="president_gender"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.presidentGender}
				>
					{#each OFFICER_GENDERS as g (g)}
						<option value={g}>{OFFICER_GENDER_LABELS[g]} · {officerTitle('president', g)}</option>
					{/each}
				</select>
			</label>
			<label class="text-xs text-gray-300">
				Présidence
				<input
					name="president_name"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.presidentName ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Genre de la trésorerie
				<select
					name="treasurer_gender"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.treasurerGender}
				>
					{#each OFFICER_GENDERS as g (g)}
						<option value={g}>{OFFICER_GENDER_LABELS[g]} · {officerTitle('treasurer', g)}</option>
					{/each}
				</select>
			</label>
			<label class="text-xs text-gray-300">
				Trésorerie
				<input
					name="treasurer_name"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.treasurerName ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Nom légal
				<input
					name="legal_name"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.legalName ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Adresse du siège
				<input
					name="address_line"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.addressLine ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Code postal
				<input
					name="postal_code"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.postalCode ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Ville
				<input
					name="city"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.city ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Pays
				<input
					name="country"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.country}
				/>
			</label>
			<label class="text-xs text-gray-300">
				RNA <span class="text-gray-500">(W + 9 chiffres)</span>
				<input
					name="rna"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.rna ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				SIRET
				<input
					name="siret"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.siret ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Banque
				<input
					name="bank_name"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.bankName ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				IBAN
				<input
					name="iban"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 font-mono text-sm text-white"
					value={data.organization.iban ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				BIC
				<input
					name="bic"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 font-mono text-sm text-white"
					value={data.organization.bic ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				N° TVA <span class="text-gray-500">(vide si non assujettie)</span>
				<input
					name="vat_number"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.vatNumber ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Courriel
				<input
					name="email"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.email ?? ''}
				/>
			</label>
			<label class="text-xs text-gray-300">
				Site
				<input
					name="website"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					value={data.organization.website ?? ''}
				/>
			</label>
		</div>

		<div class="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
			<label class="flex items-center gap-2 text-sm text-amber-200">
				<input
					name="tax_receipts_allowed"
					class="size-4 rounded border-gray-600 bg-gray-700"
					checked={data.organization.taxReceiptsAllowed}
					type="checkbox"
					value="1"
				/>
				L'association relève du mécénat et peut émettre des reçus fiscaux
			</label>
			<p class="mt-1 text-xs text-gray-400">
				Cette déclaration engage l'association : un reçu fiscal émis à tort expose à une amende
				égale au montant de la réduction d'impôt indûment obtenue. Elle ne se déduit d'aucune donnée
				— c'est au bureau de la porter.
			</p>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				<label class="text-xs text-gray-300">
					Catégorie d'organisme <span class="text-gray-500">(Cerfa 11580)</span>
					<input
						name="tax_category"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						placeholder="Œuvre ou organisme d'intérêt général"
						value={data.organization.taxCategory ?? ''}
					/>
				</label>
				<label class="text-xs text-gray-300">
					Articles du CGI applicables
					<input
						name="tax_articles"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						placeholder="Articles 200 et 238 bis du CGI"
						value={data.organization.taxArticles ?? ''}
					/>
				</label>
			</div>
			<label class="mt-3 block text-xs text-gray-300">
				Objet de l'association <span class="text-gray-500">(statuts)</span>
				<textarea
					name="purpose"
					class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					rows="5">{data.organization.purpose ?? ''}</textarea
				>
			</label>
			<p class="mt-1 text-xs text-gray-400">
				Reproduit tel quel sur le reçu fiscal : c'est l'objet qui range l'association parmi les
				organismes d'intérêt général, et le donateur n'a rien d'autre sous les yeux pour le
				constater.
			</p>
		</div>

		<button
			class="bg-primary-600 hover:bg-primary-800 mt-4 rounded-lg px-3 py-2 text-sm font-medium text-white"
			type="submit">Enregistrer</button
		>
	</form>
</section>
