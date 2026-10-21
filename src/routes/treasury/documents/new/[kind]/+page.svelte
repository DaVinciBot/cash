<script lang="ts">
	import { Button } from '@davincibot/components';
	// Formulaire d'émission, pour un type déjà choisi. Plus de menu déroulant qui
	// fait apparaître et disparaître des champs : la page ne montre que ce que
	// CETTE pièce demande.
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { INVOICE_OPERATION_KINDS, INVOICE_OPERATION_LABELS } from '#lib/documents.js';
	import { round } from '#lib/numbers.js';
	import { DOCUMENT_KIND_LABELS } from '#lib/types/domain.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	const today = new Date().toISOString().slice(0, 10);

	const failure = $derived(form && 'message' in form ? form.message : null);
	const missing = $derived(form && 'missing' in form ? (form.missing as string[]) : []);
	const kind = $derived(data.kind);

	// Le vocabulaire suit la pièce : un destinataire de note de frais est un
	// demandeur, celui d'un reçu fiscal un donateur.
	const RECIPIENT_LABEL: Record<string, string> = {
		invoice: 'Client facturé',
		quote: 'Destinataire du devis',
		expense_report: 'Bénéficiaire du remboursement',
		tax_receipt: 'Donateur'
	};
	const SUBJECT_LABEL: Record<string, string> = {
		invoice: 'Objet de la facture',
		quote: 'Objet du devis',
		expense_report: 'Description de la dépense',
		tax_receipt: 'Informations complémentaires'
	};

	// Un reçu fiscal porte un montant global ; les autres pièces se détaillent.
	// Et la note de frais ne se détaille pas comme les autres : une dépense a une
	// date et deux montants, pas une quantité et un prix unitaire.
	const detailed = $derived(kind !== 'tax_receipt');
	const isExpense = $derived(kind === 'expense_report');

	const number = (raw: string) => Number(raw.replace(',', '.'));

	let lines = $state<{ id: number; label: string; quantity: string; price: string }[]>([
		{ id: 0, label: '', quantity: '1', price: '' }
	]);
	let nextLine = 1;

	let expenses = $state<{ id: number; date: string; label: string; ht: string; ttc: string }[]>([
		{ id: 0, date: today, label: '', ht: '', ttc: '' }
	]);
	let nextExpense = 1;

	const total = $derived(
		isExpense
			? round(
					expenses.reduce((sum, e) => {
						const ttc = number(e.ttc);
						return sum + (Number.isFinite(ttc) ? ttc : 0);
					}, 0)
				)
			: round(
					lines.reduce((sum, l) => {
						const q = number(l.quantity);
						const p = number(l.price);
						return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
					}, 0)
				)
	);

	function addLine() {
		lines = [...lines, { id: nextLine++, label: '', quantity: '1', price: '' }];
	}
	function removeLine(id: number) {
		lines =
			lines.length > 1
				? lines.filter((l) => l.id !== id)
				: [{ id, label: '', quantity: '1', price: '' }];
	}

	function addExpense() {
		expenses = [...expenses, { id: nextExpense++, date: today, label: '', ht: '', ttc: '' }];
	}
	function removeExpense(id: number) {
		expenses =
			expenses.length > 1
				? expenses.filter((e) => e.id !== id)
				: [{ id, date: today, label: '', ht: '', ttc: '' }];
	}

	const CHAMP =
		'mt-1 block w-full rounded-lg border border-rule-strong bg-dark-blue/60 p-2 text-sm text-white aria-invalid:border-red-500 user-invalid:border-red-500';
</script>

<svelte:head><title>{DOCUMENT_KIND_LABELS[kind]} — nouveau document</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a
		class="text-dark-light-blue hover:text-light-blue text-sm"
		href={resolve('/treasury/documents/new')}>← Changer de type</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">
			Nouvelle pièce · {DOCUMENT_KIND_LABELS[kind]}
		</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Le numéro est attribué à l'émission, dans une série par type et par année.
		</p>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if data.missing.length > 0}
		<p
			class="mb-4 rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-500/30"
		>
			Il manque {data.missing.join(', ')} à l'identité de l'émetteur.
			<a class="underline" href={resolve('/treasury/documents/issuer')}>La compléter</a>
		</p>
	{/if}

	<form class="space-y-5" method="POST" use:enhance>
		<fieldset class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
			<legend class="text-dark-light-blue px-1 text-xs font-semibold">Qui et quand</legend>

			<div class="grid gap-3 md:grid-cols-2">
				<label class="text-dark-light-blue text-xs">
					{RECIPIENT_LABEL[kind]}
					<input
						name="recipient_name"
						class={CHAMP}
						aria-invalid={missing.includes('recipient_name')}
						required
					/>
					{#if missing.includes('recipient_name')}
						<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
					{/if}
				</label>
				<label class="text-dark-light-blue text-xs">
					Date d'émission
					<input
						name="issued_on"
						class={CHAMP}
						aria-invalid={missing.includes('issued_on')}
						required
						type="date"
						value={today}
					/>
					{#if missing.includes('issued_on')}
						<span class="mt-1 block text-xs text-red-300"> Ce champ est obligatoire.</span>
					{/if}
				</label>
			</div>

			<label class="text-dark-light-blue mt-3 block text-xs">
				Adresse
				<textarea
					name="recipient_address"
					class={CHAMP}
					aria-invalid={missing.includes('recipient_address')}
					required
					rows="2"></textarea>
				{#if missing.includes('recipient_address')}
					<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
				{/if}
			</label>

			{#if kind === 'invoice'}
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<label class="text-dark-light-blue text-xs">
						Date de la prestation ou de la livraison
						<input
							name="service_on"
							class={CHAMP}
							aria-invalid={missing.includes('service_on')}
							required
							type="date"
							value={today}
						/>
						{#if missing.includes('service_on')}
							<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
						{/if}
					</label>
					<label class="text-dark-light-blue text-xs">
						SIREN du client
						<input
							name="recipient_siren"
							class="{CHAMP} font-mono"
							inputmode="numeric"
							placeholder="123 456 789"
							required
						/>
						{#if missing.includes('recipient_siren')}
							<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
						{/if}
					</label>
					<label class="text-dark-light-blue text-xs">
						Numéro de bon de commande
						<input
							name="purchase_order"
							class={CHAMP}
							aria-invalid={missing.includes('purchase_order')}
							required
						/>
						{#if missing.includes('purchase_order')}
							<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
						{/if}
					</label>
					<label class="text-dark-light-blue text-xs">
						Nature de l'opération
						<select
							name="operation_kind"
							class={CHAMP}
							aria-invalid={missing.includes('operation_kind')}
							required
						>
							{#each INVOICE_OPERATION_KINDS as operation (operation)}
								<option value={operation}>{INVOICE_OPERATION_LABELS[operation]}</option>
							{/each}
						</select>
						{#if missing.includes('operation_kind')}
							<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
						{/if}
					</label>
				</div>
			{/if}
		</fieldset>

		<fieldset class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
			<legend class="text-dark-light-blue px-1 text-xs font-semibold">
				{detailed ? 'Détail' : 'Montant'}
			</legend>

			{#if isExpense}
				{#each expenses as expense (expense.id)}
					<div class="mb-2 flex flex-wrap items-end gap-2">
						<label class="text-dark-light-blue text-xs">
							Date de la dépense
							<input
								name="expense_date"
								class="{CHAMP} w-40"
								required
								type="date"
								bind:value={expense.date}
							/>
							{#if missing.includes('expense_date')}
								<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
							{/if}
						</label>
						<label class="text-dark-light-blue flex-1 text-xs">
							Type de dépense
							<input
								name="expense_label"
								class={CHAMP}
								aria-invalid={missing.includes('expense_label')}
								required
								bind:value={expense.label}
							/>
							{#if missing.includes('expense_label')}
								<span class="mt-1 block text-xs text-red-300"> Ce champ est obligatoire.</span>
							{/if}
						</label>
						<label class="text-dark-light-blue text-xs">
							Montant HT
							<input
								name="expense_ht"
								class="{CHAMP} w-28"
								inputmode="decimal"
								placeholder="0,00"
								bind:value={expense.ht}
							/>
							{#if missing.includes('expense_ht')}
								<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
							{/if}
						</label>
						<label class="text-dark-light-blue text-xs">
							Montant TTC
							<input
								name="expense_ttc"
								class="{CHAMP} w-28"
								inputmode="decimal"
								placeholder="0,00"
								bind:value={expense.ttc}
							/>
							{#if missing.includes('expense_ttc')}
								<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
							{/if}
						</label>
						<Button
							onclick={() => {
								removeExpense(expense.id);
							}}
							size="sm"
							variant="secondary">Retirer</Button
						>
					</div>
				{/each}

				<div class="mt-2 flex flex-wrap items-center gap-3">
					<Button onclick={addExpense} size="sm" variant="secondary">Ajouter une dépense</Button>
					<span class="text-dark-light-blue text-xs">Total TTC : {euro.format(total)}</span>
					<span class="text-dark-light-blue/70 text-xs">
						L'écart entre le HT et le TTC est la TVA avancée.
					</span>
				</div>
			{:else if detailed}
				{#each lines as line (line.id)}
					<div class="mb-2 flex flex-wrap items-end gap-2">
						<label class="text-dark-light-blue flex-1 text-xs">
							Désignation
							<input
								name="line_label"
								class={CHAMP}
								aria-invalid={missing.includes('line_label')}
								required
								bind:value={line.label}
							/>
							{#if missing.includes('line_label')}
								<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
							{/if}
						</label>
						<label class="text-dark-light-blue text-xs">
							Quantité
							<input
								name="line_quantity"
								class="{CHAMP} w-20"
								inputmode="decimal"
								bind:value={line.quantity}
							/>
							{#if missing.includes('line_quantity')}
								<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
							{/if}
						</label>
						<label class="text-dark-light-blue text-xs">
							Prix unitaire
							<input
								name="line_price"
								class="{CHAMP} w-28"
								inputmode="decimal"
								bind:value={line.price}
							/>
							{#if missing.includes('line_price')}
								<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
							{/if}
						</label>
						<Button
							onclick={() => {
								removeLine(line.id);
							}}
							size="sm"
							variant="secondary">Retirer</Button
						>
					</div>
				{/each}

				<div class="mt-2 flex flex-wrap items-center gap-3">
					<Button onclick={addLine} size="sm" variant="secondary">Ajouter une ligne</Button>
					<span class="text-dark-light-blue text-xs">Total TTC : {euro.format(total)}</span>
				</div>
			{:else}
				<label class="text-dark-light-blue text-xs">
					Montant du don
					<input
						name="amount_ttc"
						class="{CHAMP} w-40"
						inputmode="decimal"
						placeholder="0,00"
						required
					/>
					{#if missing.includes('amount_ttc')}
						<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
					{/if}
				</label>
			{/if}
		</fieldset>

		<fieldset class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
			<legend class="text-dark-light-blue px-1 text-xs font-semibold">
				{kind === 'tax_receipt' ? 'Le don' : 'Précisions'}
			</legend>

			<label class="text-dark-light-blue block text-xs">
				{SUBJECT_LABEL[kind]}
				<textarea
					name="subject"
					class={CHAMP}
					aria-invalid={missing.includes('subject')}
					required
					rows="2"></textarea>
				{#if missing.includes('subject')}
					<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
				{/if}
			</label>

			{#if kind === 'expense_report'}
				<label class="text-dark-light-blue mt-3 block text-xs">
					IBAN du bénéficiaire
					<input
						name="beneficiary_iban"
						class="{CHAMP} font-mono"
						aria-invalid={missing.includes('beneficiary_iban')}
						placeholder="FR76 ..."
						required
					/>
					{#if missing.includes('beneficiary_iban')}
						<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
					{/if}
					<span class="text-dark-light-blue/70 mt-1 block">
						Le compte à rembourser change à chaque note : il appartient à la pièce, pas à
						l'association.
					</span>
				</label>
			{/if}

			{#if kind === 'tax_receipt'}
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<label class="text-dark-light-blue text-xs">
						Nature du don
						<select
							name="donation_nature"
							class={CHAMP}
							aria-invalid={missing.includes('donation_nature')}
							required
						>
							<option value="Numéraire">Numéraire</option>
							<option value="Titres de sociétés">Titres de sociétés</option>
							<option value="Don en nature">Don en nature</option>
						</select>
						{#if missing.includes('donation_nature')}
							<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
						{/if}
					</label>
					<label class="text-dark-light-blue text-xs">
						Mode de versement
						<select
							name="donation_method"
							class={CHAMP}
							aria-invalid={missing.includes('donation_method')}
							required
						>
							<option value="Virement">Virement</option>
							<option value="Chèque">Chèque</option>
							<option value="Espèces">Espèces</option>
							<option value="Carte bancaire">Carte bancaire</option>
						</select>
						{#if missing.includes('donation_method')}
							<span class="mt-1 block text-xs text-red-300">Ce champ est obligatoire.</span>
						{/if}
					</label>
				</div>
			{/if}

			{#if data.flows.length > 0}
				<label class="text-dark-light-blue mt-3 block text-xs">
					Mouvement rattaché <span class="text-dark-light-blue/70">(facultatif)</span>
					<select name="flow_id" class={CHAMP}>
						<option value="">— aucun —</option>
						{#each data.flows as f (f.id)}
							<option value={f.id}>
								{day.format(new Date(f.occurredOn))} · {f.label} · {euro.format(f.amountTtc)}
							</option>
						{/each}
					</select>
				</label>
			{/if}
		</fieldset>

		<div class="flex items-center gap-3">
			<Button disabled={data.missing.length > 0} size="md" type="submit" variant="primary"
				>Émettre</Button
			>
			<span class="text-dark-light-blue/70 text-xs">
				L'émission consomme un numéro de série : elle ne s'annule pas, elle se contrepasse.
			</span>
		</div>
	</form>
</section>
