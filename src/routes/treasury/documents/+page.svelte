<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		documentFollowsFlow,
		DOCUMENT_KIND_LABELS,
		DOCUMENT_KINDS,
		type DocumentKind
	} from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	const failure = $derived(form && 'message' in form ? form.message : null);
	const issued = $derived(form && 'number' in form ? form.number : null);

	let openIssuer = $state(false);
	let kind = $state<DocumentKind>('invoice');
	let lines = $state<{ id: number; label: string; quantity: string; price: string }[]>([
		{ id: 0, label: '', quantity: '1', price: '' }
	]);
	let nextLine = 1;
	let openIssue = $state(false);

	const today = new Date().toISOString().slice(0, 10);
	// `noUncheckedIndexedAccess` rend tout accès indexé possiblement absent, même
	// sur un Record dont les clés couvrent l'union. TypeScript a raison sur le
	// type, la règle ESLint raisonne sur la déclaration : on suit TypeScript.
	const missing = $derived(data.missingByKind[kind] ?? []);
	const followsFlow = $derived(documentFollowsFlow(kind));

	// Un reçu fiscal atteste un don reçu, une facture une créance : les deux se
	// rattachent à un mouvement, mais pas du même sens.
	const eligibleFlows = $derived(
		data.flows.filter((f) =>
			kind === 'tax_receipt' ? f.direction === 'credit' : f.direction === 'debit'
		)
	);

	const total = $derived(
		Math.round(
			lines.reduce((sum, l) => {
				const q = Number(l.quantity.replace(',', '.'));
				const p = Number(l.price.replace(',', '.'));
				return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
			}, 0) * 100
		) / 100
	);
	const hasLines = $derived(lines.some((l) => l.label.trim().length > 0));

	function addLine() {
		lines = [...lines, { id: nextLine++, label: '', quantity: '1', price: '' }];
	}
	function removeLine(id: number) {
		lines =
			lines.length > 1
				? lines.filter((l) => l.id !== id)
				: [{ id, label: '', quantity: '1', price: '' }];
	}
</script>

<svelte:head><title>Documents — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury' as '/')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Documents</h1>
			<p class="mt-1 text-sm text-gray-400">
				Notes de frais, devis, factures et reçus fiscaux. Un document émis fige son montant, son
				destinataire et l’identité de l’émetteur : il se rejoue à l’identique, indéfiniment.
			</p>
		</div>
		<div class="flex gap-2">
			<button
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				onclick={() => (openIssuer = !openIssuer)}
				type="button">Émetteur</button
			>
			<button
				class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
				onclick={() => (openIssue = !openIssue)}
				type="button">{openIssue ? 'Annuler' : 'Émettre un document'}</button
			>
		</div>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}
	{#if issued}
		<p
			class="mb-4 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-500/30"
		>
			Document {issued} émis.
		</p>
	{/if}

	<!-- Identité de l'émetteur -->
	{#if openIssuer}
		<form
			class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4"
			action="?/saveIssuer"
			method="POST"
			use:enhance={() =>
				({ update }) => {
					openIssuer = false;
					return update();
				}}
		>
			<h2 class="mb-1 text-sm font-semibold text-gray-200">Identité de l’émetteur</h2>
			<p class="mb-3 text-xs text-gray-500">
				Ces mentions figurent sur chaque document et y sont figées à l’émission : les corriger ici
				ne réécrit pas les documents déjà partis.
			</p>
			<div class="grid gap-3 md:grid-cols-2">
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
					Signataire
					<input
						name="signatory_name"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						value={data.organization.signatoryName ?? ''}
					/>
				</label>
				<label class="text-xs text-gray-300">
					Qualité du signataire
					<input
						name="signatory_title"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						value={data.organization.signatoryTitle ?? ''}
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
					L’association relève du mécénat et peut émettre des reçus fiscaux
				</label>
				<p class="mt-1 text-xs text-gray-400">
					Cette déclaration engage l’association : un reçu fiscal émis à tort expose à une amende
					égale au montant de la réduction d’impôt indûment obtenue. Elle ne se déduit d’aucune
					donnée — c’est au bureau de la porter.
				</p>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<label class="text-xs text-gray-300">
						Catégorie d’organisme <span class="text-gray-500">(Cerfa 11580)</span>
						<input
							name="tax_category"
							class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
							placeholder="Œuvre ou organisme d’intérêt général"
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
			</div>

			<button
				class="bg-primary-600 hover:bg-primary-800 mt-4 rounded-lg px-3 py-2 text-sm font-medium text-white"
				type="submit">Enregistrer</button
			>
		</form>
	{/if}

	<!-- Émission -->
	{#if openIssue}
		<form
			class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4"
			action="?/issue"
			method="POST"
			use:enhance={() =>
				({ update }) => {
					openIssue = false;
					lines = [{ id: nextLine++, label: '', quantity: '1', price: '' }];
					return update();
				}}
		>
			<div class="flex flex-wrap items-end gap-3">
				<label class="text-xs text-gray-300">
					Type
					<select
						name="kind"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						bind:value={kind}
					>
						{#each DOCUMENT_KINDS as k (k)}
							<option value={k}>{DOCUMENT_KIND_LABELS[k]}</option>
						{/each}
					</select>
				</label>
				<label class="text-xs text-gray-300">
					Date d’émission
					<input
						name="issued_on"
						class="mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
						type="date"
						value={today}
					/>
				</label>
				<label class="flex-1 text-xs text-gray-300">
					Destinataire
					<input
						name="recipient_name"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						required
					/>
				</label>
			</div>

			<div class="mt-3 flex flex-wrap items-end gap-3">
				<label class="flex-1 text-xs text-gray-300">
					Adresse du destinataire
					<input
						name="recipient_address"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					/>
				</label>
				<label class="flex-1 text-xs text-gray-300">
					Objet
					<input
						name="subject"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					/>
				</label>
			</div>

			{#if followsFlow}
				<label class="mt-3 block text-xs text-gray-300">
					Mouvement rattaché <span class="text-gray-500">(facultatif)</span>
					<select
						name="flow_id"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
					>
						<option value="">— aucun —</option>
						{#each eligibleFlows as f (f.id)}
							<option value={f.id}>
								{day.format(new Date(f.occurredOn))} · {f.label} · {euro.format(f.amountTtc)}
							</option>
						{/each}
					</select>
				</label>
			{/if}

			{#if kind === 'expense_report'}
				<label class="mt-3 block text-xs text-gray-300">
					IBAN du bénéficiaire
					<input
						name="beneficiary_iban"
						class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 font-mono text-sm text-white"
						placeholder="FR76 ..."
					/>
					<span class="mt-1 block text-gray-500">
						Le compte à rembourser change à chaque note : il appartient à la pièce, pas à
						l'association.
					</span>
				</label>
			{/if}

			{#if kind === 'tax_receipt'}
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<label class="text-xs text-gray-300">
						Nature du don
						<select
							name="donation_nature"
							class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						>
							<option value="Numéraire">Numéraire</option>
							<option value="Titres de sociétés">Titres de sociétés</option>
							<option value="Don en nature">Don en nature</option>
						</select>
					</label>
					<label class="text-xs text-gray-300">
						Mode de versement
						<select
							name="donation_method"
							class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
						>
							<option value="Virement">Virement</option>
							<option value="Chèque">Chèque</option>
							<option value="Espèces">Espèces</option>
							<option value="Carte bancaire">Carte bancaire</option>
						</select>
					</label>
				</div>
			{/if}

			<!-- Lignes : un devis ou une facture les détaille, un reçu porte un montant. -->
			<fieldset class="mt-4 rounded-lg border border-gray-600 p-3">
				<legend class="px-1 text-xs font-semibold text-gray-300">Détail</legend>
				{#each lines as line (line.id)}
					<div class="mb-2 flex flex-wrap items-end gap-2">
						<label class="flex-1 text-xs text-gray-300">
							Désignation
							<input
								name="line_label"
								class="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
								bind:value={line.label}
							/>
						</label>
						<label class="text-xs text-gray-300">
							Quantité
							<input
								name="line_quantity"
								class="mt-1 block w-20 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
								inputmode="decimal"
								bind:value={line.quantity}
							/>
						</label>
						<label class="text-xs text-gray-300">
							Prix unitaire TTC
							<input
								name="line_price"
								class="mt-1 block w-28 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
								inputmode="decimal"
								bind:value={line.price}
							/>
						</label>
						<button
							class="rounded-lg border border-gray-600 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
							onclick={() => {
								removeLine(line.id);
							}}
							type="button">Retirer</button
						>
					</div>
				{/each}
				<div class="mt-2 flex flex-wrap items-center gap-3">
					<button
						class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
						onclick={addLine}
						type="button">Ajouter une ligne</button
					>
					{#if hasLines}
						<span class="text-xs text-gray-400">Total : {euro.format(total)}</span>
					{:else}
						<label class="text-xs text-gray-300">
							Montant TTC <span class="text-gray-500">(sans détail)</span>
							<input
								name="amount_ttc"
								class="mt-1 ml-2 inline-block w-28 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
								inputmode="decimal"
								placeholder="0,00"
							/>
						</label>
					{/if}
				</div>
			</fieldset>

			{#if missing.length > 0}
				<p
					class="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30"
				>
					Il manque {missing.join(', ')} à l’identité de l’émetteur. Un document incomplet consommerait
					un numéro de série, et une série ne se réécrit pas.
				</p>
			{/if}

			<button
				class="bg-primary-600 hover:bg-primary-800 mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
				disabled={missing.length > 0}
				type="submit">Émettre</button
			>
		</form>
	{/if}

	<!-- Liste -->
	{#if data.documents.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			Aucun document émis.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.documents as doc (doc.id)}
				<li
					class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm"
				>
					<span class="font-mono text-xs text-gray-400">{doc.number}</span>
					<span class="font-medium text-white">{DOCUMENT_KIND_LABELS[doc.kind]}</span>
					<span class="text-gray-300">{doc.recipientName}</span>
					{#if doc.subject}<span class="truncate text-xs text-gray-500">{doc.subject}</span>{/if}
					<span class="ml-auto font-medium text-gray-100">{euro.format(doc.amountTtc)}</span>
					<span class="text-xs text-gray-500">{day.format(new Date(doc.issuedOn))}</span>
					<a
						class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
						href={resolve(`/treasury/documents/${String(doc.id)}` as '/')}>Ouvrir</a
					>
				</li>
			{/each}
		</ul>
	{/if}
</section>
