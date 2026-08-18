<script lang="ts">
	// Formulaire d'émission, pour un type déjà choisi. Plus de menu déroulant qui
	// fait apparaître et disparaître des champs : la page ne montre que ce que
	// CETTE pièce demande.
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { INVOICE_OPERATION_KINDS, INVOICE_OPERATION_LABELS } from '$lib/documents';
	import { DOCUMENT_KIND_LABELS } from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	const today = new Date().toISOString().slice(0, 10);

	const failure = $derived(form && 'message' in form ? form.message : null);
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
	const round = (v: number) => Math.round(v * 100) / 100;

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
	const hasLines = $derived(
		isExpense
			? expenses.some((e) => e.label.trim().length > 0)
			: lines.some((l) => l.label.trim().length > 0)
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
		'mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white';
</script>

<svelte:head><title>{DOCUMENT_KIND_LABELS[kind]} — nouveau document</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury/documents/new')}
		>← Changer de type</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">
			Nouvelle pièce · {DOCUMENT_KIND_LABELS[kind]}
		</h1>
		<p class="mt-1 text-sm text-gray-400">
			Le numéro est attribué à l'émission, dans une série par type et par année.
		</p>
	</header>

	{#if failure}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{failure}
		</p>
	{/if}

	{#if data.missing.length > 0}
		<p
			class="mb-4 rounded-lg bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/30"
		>
			Il manque {data.missing.join(', ')} à l'identité de l'émetteur.
			<a class="underline" href={resolve('/treasury/documents/issuer')}>La compléter</a>
		</p>
	{/if}

	<form class="space-y-5" method="POST" use:enhance>
		<fieldset class="rounded-lg border border-gray-700 bg-gray-800 p-4">
			<legend class="px-1 text-xs font-semibold text-gray-300">Qui et quand</legend>

			<div class="grid gap-3 md:grid-cols-2">
				<label class="text-xs text-gray-300">
					{RECIPIENT_LABEL[kind]}
					<input name="recipient_name" class={CHAMP} required />
				</label>
				<label class="text-xs text-gray-300">
					Date d'émission
					<input name="issued_on" class={CHAMP} required type="date" value={today} />
				</label>
			</div>

			<label class="mt-3 block text-xs text-gray-300">
				Adresse
				<textarea name="recipient_address" class={CHAMP} rows="2"></textarea>
			</label>

			{#if kind === 'invoice'}
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<label class="text-xs text-gray-300">
						Date de la prestation ou de la livraison
						<input name="service_on" class={CHAMP} required type="date" value={today} />
					</label>
					<label class="text-xs text-gray-300">
						SIREN du client
						<input
							name="recipient_siren"
							class="{CHAMP} font-mono"
							inputmode="numeric"
							placeholder="123 456 789"
							required
						/>
					</label>
					<label class="text-xs text-gray-300">
						Numéro de bon de commande
						<input name="purchase_order" class={CHAMP} required />
					</label>
					<label class="text-xs text-gray-300">
						Nature de l'opération
						<select name="operation_kind" class={CHAMP} required>
							{#each INVOICE_OPERATION_KINDS as operation (operation)}
								<option value={operation}>{INVOICE_OPERATION_LABELS[operation]}</option>
							{/each}
						</select>
					</label>
				</div>
			{/if}
		</fieldset>

		<fieldset class="rounded-lg border border-gray-700 bg-gray-800 p-4">
			<legend class="px-1 text-xs font-semibold text-gray-300">
				{detailed ? 'Détail' : 'Montant'}
			</legend>

			{#if isExpense}
				{#each expenses as expense (expense.id)}
					<div class="mb-2 flex flex-wrap items-end gap-2">
						<label class="text-xs text-gray-300">
							Date de la dépense
							<input
								name="expense_date"
								class="{CHAMP} w-40"
								required
								type="date"
								bind:value={expense.date}
							/>
						</label>
						<label class="flex-1 text-xs text-gray-300">
							Type de dépense
							<input name="expense_label" class={CHAMP} bind:value={expense.label} />
						</label>
						<label class="text-xs text-gray-300">
							Montant HT
							<input
								name="expense_ht"
								class="{CHAMP} w-28"
								inputmode="decimal"
								placeholder="0,00"
								bind:value={expense.ht}
							/>
						</label>
						<label class="text-xs text-gray-300">
							Montant TTC
							<input
								name="expense_ttc"
								class="{CHAMP} w-28"
								inputmode="decimal"
								placeholder="0,00"
								bind:value={expense.ttc}
							/>
						</label>
						<button
							class="rounded-lg border border-gray-600 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
							onclick={() => {
								removeExpense(expense.id);
							}}
							type="button">Retirer</button
						>
					</div>
				{/each}

				<div class="mt-2 flex flex-wrap items-center gap-3">
					<button
						class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
						onclick={addExpense}
						type="button">Ajouter une dépense</button
					>
					{#if hasLines}
						<span class="text-xs text-gray-400">Total TTC : {euro.format(total)}</span>
					{:else}
						<label class="text-xs text-gray-300">
							Montant TTC <span class="text-gray-500">(sans détail)</span>
							<input
								name="amount_ttc"
								class="{CHAMP} ml-2 inline-block w-28"
								inputmode="decimal"
								placeholder="0,00"
							/>
						</label>
					{/if}
					<span class="text-xs text-gray-500">
						Le HT laissé vide vaut le TTC : l'écart entre les deux est la TVA avancée.
					</span>
				</div>
			{:else if detailed}
				{#each lines as line (line.id)}
					<div class="mb-2 flex flex-wrap items-end gap-2">
						<label class="flex-1 text-xs text-gray-300">
							Désignation
							<input name="line_label" class={CHAMP} bind:value={line.label} />
						</label>
						<label class="text-xs text-gray-300">
							Quantité
							<input
								name="line_quantity"
								class="{CHAMP} w-20"
								inputmode="decimal"
								bind:value={line.quantity}
							/>
						</label>
						<label class="text-xs text-gray-300">
							Prix unitaire
							<input
								name="line_price"
								class="{CHAMP} w-28"
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
						<span class="text-xs text-gray-400">Total TTC : {euro.format(total)}</span>
					{:else}
						<label class="text-xs text-gray-300">
							Montant TTC <span class="text-gray-500">(sans détail)</span>
							<input
								name="amount_ttc"
								class="{CHAMP} ml-2 inline-block w-28"
								inputmode="decimal"
								placeholder="0,00"
							/>
						</label>
					{/if}
				</div>
			{:else}
				<label class="text-xs text-gray-300">
					Montant du don
					<input
						name="amount_ttc"
						class="{CHAMP} w-40"
						inputmode="decimal"
						placeholder="0,00"
						required
					/>
				</label>
			{/if}
		</fieldset>

		<fieldset class="rounded-lg border border-gray-700 bg-gray-800 p-4">
			<legend class="px-1 text-xs font-semibold text-gray-300">
				{kind === 'tax_receipt' ? 'Le don' : 'Précisions'}
			</legend>

			<label class="block text-xs text-gray-300">
				{SUBJECT_LABEL[kind]}
				<textarea name="subject" class={CHAMP} rows="2"></textarea>
			</label>

			{#if kind === 'expense_report'}
				<label class="mt-3 block text-xs text-gray-300">
					IBAN du bénéficiaire
					<input name="beneficiary_iban" class="{CHAMP} font-mono" placeholder="FR76 ..." />
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
						<select name="donation_nature" class={CHAMP}>
							<option value="Numéraire">Numéraire</option>
							<option value="Titres de sociétés">Titres de sociétés</option>
							<option value="Don en nature">Don en nature</option>
						</select>
					</label>
					<label class="text-xs text-gray-300">
						Mode de versement
						<select name="donation_method" class={CHAMP}>
							<option value="Virement">Virement</option>
							<option value="Chèque">Chèque</option>
							<option value="Espèces">Espèces</option>
							<option value="Carte bancaire">Carte bancaire</option>
						</select>
					</label>
				</div>
			{/if}

			{#if data.flows.length > 0}
				<label class="mt-3 block text-xs text-gray-300">
					Mouvement rattaché <span class="text-gray-500">(facultatif)</span>
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
			<button
				class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
				disabled={data.missing.length > 0}
				type="submit">Émettre</button
			>
			<span class="text-xs text-gray-500">
				L'émission consomme un numéro de série : elle ne s'annule pas, elle se contrepasse.
			</span>
		</div>
	</form>
</section>
