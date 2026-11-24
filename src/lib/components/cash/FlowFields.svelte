<script lang="ts">
	// Champs d'un mouvement de trésorerie, en création comme en modification.
	//
	// L'exercice ne se choisit plus : il se déduit de la date (#77) et l'écran
	// affiche celui qui sera retenu. Une date d'exercice clos bloque l'envoi avec
	// le message que la base renverrait (DVB41). Le flux d'une commande garde
	// l'exercice de sa commande (#91), quelle que soit sa date.
	import { Button } from '@davincibot/components';
	import { fiscalYearProblem, periodFor, type PeriodRange } from '#lib/periods.js';
	import type { FlowDirection } from '#lib/types/domain.js';
	import { untrack } from 'svelte';

	interface FlowSeed {
		direction: FlowDirection;
		amountTtc: number;
		occurredOn: string;
		label: string;
		accountId: number;
		budgetId: number | null;
		orderId: number | null;
		fiscalYearLabel: string;
	}

	interface Props {
		flow: FlowSeed | null;
		accounts: { id: number; name: string }[];
		leaves: { id: number; path: string }[];
		fiscalYears: PeriodRange[];
		today: string;
		onCancel: () => void;
	}

	let { flow, accounts, leaves, fiscalYears, today, onCancel }: Props = $props();

	const fromOrder = $derived(flow !== null && flow.orderId !== null);
	let occurredOn = $state(untrack(() => flow?.occurredOn ?? today));

	const derivedYear = $derived(periodFor(occurredOn, fiscalYears));
	const problem = $derived(fromOrder ? null : fiscalYearProblem(occurredOn, fiscalYears));
</script>

<div class="flex flex-wrap items-end gap-3">
	<label class="text-dark-light-blue text-xs">
		Sens
		<select
			name="direction"
			class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
			value={flow?.direction ?? 'debit'}
		>
			<option value="debit">Dépense (débit)</option>
			<option value="credit">Recette (crédit)</option>
		</select>
	</label>
	<label class="text-dark-light-blue text-xs">
		Montant TTC
		<input
			name="amount_ttc"
			class="border-rule-strong bg-dark-blue/60 mt-1 block w-32 rounded-xl border p-2.5 text-sm"
			inputmode="decimal"
			required
			value={flow ? flow.amountTtc.toFixed(2).replace('.', ',') : ''}
		/>
	</label>
	<label class="text-dark-light-blue text-xs">
		Date
		<input
			name="occurred_on"
			class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
			required
			type="date"
			bind:value={occurredOn}
		/>
	</label>
	<label class="text-dark-light-blue flex-1 text-xs">
		Libellé
		<input
			name="label"
			class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
			required
			value={flow?.label ?? ''}
		/>
	</label>
</div>
<div class="mt-3 flex flex-wrap items-end gap-3">
	<label class="text-dark-light-blue text-xs">
		Compte
		<select
			name="account_id"
			class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
			value={flow?.accountId ?? accounts.at(0)?.id}
		>
			{#each accounts as account (account.id)}
				<option value={account.id}>{account.name}</option>
			{/each}
		</select>
	</label>
	<div class="text-dark-light-blue text-xs">
		Exercice
		<p
			class="mt-1 rounded-xl border px-2.5 py-2.5 text-sm {problem
				? 'border-red-500/50 text-red-300'
				: 'border-rule text-light-blue'}"
		>
			{#if fromOrder}
				{flow?.fiscalYearLabel}
			{:else}
				{derivedYear?.label ?? 'aucun'}
			{/if}
		</p>
	</div>
	<label class="text-dark-light-blue flex-1 text-xs">
		Budget imputé
		<select
			name="budget_id"
			class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
			disabled={fromOrder}
			value={flow?.budgetId ?? ''}
		>
			<option value="">— aucun —</option>
			{#each leaves as leaf (leaf.id)}
				<option value={leaf.id}>{leaf.path}</option>
			{/each}
		</select>
	</label>
</div>
{#if problem}
	<p class="mt-2 text-xs text-red-300" role="alert">{problem}</p>
{:else if fromOrder}
	<p class="text-dark-light-blue/70 mt-2 text-xs">
		Ce mouvement vient de la commande #{flow?.orderId} : son exercice est hérité de la commande et sa
		ventilation budgétaire se lit dans la répartition de la commande, pas sur le mouvement.
	</p>
{:else}
	<p class="text-dark-light-blue/70 mt-2 text-xs">L'exercice se déduit de la date du mouvement.</p>
{/if}
<div class="mt-3 flex items-center gap-2">
	<Button disabled={problem !== null} size="sm" type="submit" variant="primary">Enregistrer</Button>
	<Button onclick={onCancel} size="sm" variant="secondary">Annuler</Button>
</div>
