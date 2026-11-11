<script lang="ts">
	import { Button, Checkbox } from '@davincibot/components';
	// Identité de l'émetteur — un écran, un seul objet.
	//
	// Elle était auparavant un panneau dépliant sur l'écran des documents, à côté
	// du bouton « Émettre » : deux actes de nature différente au même endroit, et
	// l'on ne savait plus lequel on était en train de faire.
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { OFFICER_GENDERS, OFFICER_GENDER_LABELS, officerTitle } from '#lib/documents.js';
	import type { SubmitFunction } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const failure = $derived(form && 'message' in form ? form.message : null);
	const saved = $derived(form && 'saved' in form ? form.saved : null);

	// Les listes et la case sont amorcées par `value` / `checked`, pas par leurs
	// attributs : la réinitialisation par défaut d'`enhance` les ramenait à la
	// première option après chaque enregistrement.
	const keepValues: SubmitFunction =
		() =>
		({ update }) =>
			update({ reset: false });

	const FIELD =
		'border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50';
</script>

<svelte:head><title>Identité de l'émetteur — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a
		class="text-dark-light-blue hover:text-light-blue text-sm"
		href={resolve('/treasury/documents')}>← Documents</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Identité de l'émetteur</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Ces mentions figurent sur chaque document et y sont <strong>figées à l'émission</strong> : les corriger
			ici ne réécrit pas les documents déjà partis.
		</p>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}
	{#if saved}
		<p
			class="mb-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30"
		>
			Identité enregistrée.
		</p>
	{/if}
	{#if !data.canWrite}
		<p
			class="bg-blue-gray/15 text-dark-light-blue ring-rule mb-4 rounded-xl px-4 py-3 text-sm ring-1"
		>
			Consultation seule : modifier l'identité de l'émetteur demande le droit d'écriture sur la
			trésorerie.
		</p>
	{/if}

	<form
		class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5"
		action="?/save"
		method="POST"
		use:enhance={keepValues}
	>
		<fieldset class="contents" disabled={!data.canWrite}>
			<div class="grid gap-3 md:grid-cols-2">
				<label class="text-dark-light-blue text-xs">
					Genre de la présidence
					<select name="president_gender" class={FIELD} value={data.organization.presidentGender}>
						{#each OFFICER_GENDERS as g (g)}
							<option value={g}>{OFFICER_GENDER_LABELS[g]} · {officerTitle('president', g)}</option>
						{/each}
					</select>
				</label>
				<label class="text-dark-light-blue text-xs">
					Présidence
					<input
						name="president_name"
						class={FIELD}
						value={data.organization.presidentName ?? ''}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Genre de la trésorerie
					<select name="treasurer_gender" class={FIELD} value={data.organization.treasurerGender}>
						{#each OFFICER_GENDERS as g (g)}
							<option value={g}>{OFFICER_GENDER_LABELS[g]} · {officerTitle('treasurer', g)}</option>
						{/each}
					</select>
				</label>
				<label class="text-dark-light-blue text-xs">
					Trésorerie
					<input
						name="treasurer_name"
						class={FIELD}
						value={data.organization.treasurerName ?? ''}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Nom légal
					<input name="legal_name" class={FIELD} value={data.organization.legalName ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					Adresse du siège
					<input name="address_line" class={FIELD} value={data.organization.addressLine ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					Code postal
					<input name="postal_code" class={FIELD} value={data.organization.postalCode ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					Ville
					<input name="city" class={FIELD} value={data.organization.city ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					Pays
					<input name="country" class={FIELD} value={data.organization.country} />
				</label>
				<label class="text-dark-light-blue text-xs">
					RNA <span class="text-dark-light-blue/70">(W + 9 chiffres)</span>
					<input
						name="rna"
						class={FIELD}
						placeholder="W123456789"
						value={data.organization.rna ?? ''}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					SIRET <span class="text-dark-light-blue/70">(14 chiffres)</span>
					<input
						name="siret"
						class={FIELD}
						inputmode="numeric"
						value={data.organization.siret ?? ''}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					Banque
					<input name="bank_name" class={FIELD} value={data.organization.bankName ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					IBAN
					<input
						name="iban"
						class="{FIELD} font-mono"
						placeholder="FR76 …"
						value={data.organization.iban ?? ''}
					/>
				</label>
				<label class="text-dark-light-blue text-xs">
					BIC
					<input name="bic" class="{FIELD} font-mono" value={data.organization.bic ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					N° TVA <span class="text-dark-light-blue/70">(vide si non assujettie)</span>
					<input name="vat_number" class={FIELD} value={data.organization.vatNumber ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					Courriel
					<input name="email" class={FIELD} type="email" value={data.organization.email ?? ''} />
				</label>
				<label class="text-dark-light-blue text-xs">
					Site
					<input
						name="website"
						class={FIELD}
						placeholder="https://davincibot.fr"
						type="url"
						value={data.organization.website ?? ''}
					/>
				</label>
			</div>

			<div class="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
				<label class="flex items-center gap-2 text-sm text-amber-200">
					<Checkbox
						name="tax_receipts_allowed"
						checked={data.organization.taxReceiptsAllowed}
						className="size-4"
						value="1"
					/>
					L'association relève du mécénat et peut émettre des reçus fiscaux
				</label>
				<p class="text-dark-light-blue mt-1 text-xs">
					Cette déclaration engage l'association : un reçu fiscal émis à tort expose à une amende
					égale au montant de la réduction d'impôt indûment obtenue. Elle ne se déduit d'aucune
					donnée — c'est au bureau de la porter.
				</p>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<label class="text-dark-light-blue text-xs">
						Catégorie d'organisme <span class="text-dark-light-blue/70">(Cerfa 11580)</span>
						<input
							name="tax_category"
							class={FIELD}
							placeholder="Œuvre ou organisme d'intérêt général"
							value={data.organization.taxCategory ?? ''}
						/>
					</label>
					<label class="text-dark-light-blue text-xs">
						Articles du CGI applicables
						<input
							name="tax_articles"
							class={FIELD}
							placeholder="Articles 200 et 238 bis du CGI"
							value={data.organization.taxArticles ?? ''}
						/>
					</label>
				</div>
				<label class="text-dark-light-blue mt-3 block text-xs">
					Objet de l'association <span class="text-dark-light-blue/70">(statuts)</span>
					<textarea name="purpose" class={FIELD} rows="5"
						>{data.organization.purpose ?? ''}</textarea
					>
				</label>
				<p class="text-dark-light-blue mt-1 text-xs">
					Reproduit tel quel sur le reçu fiscal : c'est l'objet qui range l'association parmi les
					organismes d'intérêt général, et le donateur n'a rien d'autre sous les yeux pour le
					constater.
				</p>
			</div>

			{#if data.canWrite}
				<Button class="mt-4" size="sm" type="submit" variant="primary">Enregistrer</Button>
			{/if}
		</fieldset>
	</form>
</section>
