<script lang="ts">
	import {
		Button,
		Checkbox,
		Table,
		type Filter,
		type ParseItems,
		type TableCell,
		type TableColumn
	} from '@davincibot/components';
	import { enhance, type SubmitFunction } from '$app/forms';
	import RowMenu from '#lib/components/cash/RowMenu.svelte';
	import {
		ACTIVE_PARTNERSHIPS_DB,
		ARCHIVED_PARTNERSHIPS_DB,
		parsePartnershipRows,
		type PartnershipRow
	} from '#lib/partnershipTable.js';
	import { triggerTableRefresh } from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

	const failure = $derived(form && 'message' in form ? form.message : null);

	const TABLE_TOPIC = 'partnerships';

	let editing = $state<PartnershipRow | null>(null);
	let creating = $state(false);
	let withEnvelope = $state(false);

	const columns: TableColumn[] = [
		{ key: 'name', label: 'Partenariat', sortable: true },
		{ key: 'school_year_id', label: 'Année', width: '8rem' },
		{ key: 'domains', label: 'Domaines' },
		{ key: 'account_id', label: 'Enveloppe', width: '14rem' },
		{ key: 'id', label: 'Actions', width: '5rem', align: 'right' }
	];

	// Un archivé n'a qu'un geste : le désarchiver.
	const archivedColumns: TableColumn[] = columns.map((column) =>
		column.key === 'id' ? { key: column.key, label: 'Action', width: '9rem' } : column
	);

	// Les archivés se retrouvent par année : un partenariat éteint reste lié à la sienne.
	const archivedFilters = $derived<Filter[]>([
		{
			category: 'Année',
			value: 'school_year_id',
			options: data.schoolYears.map((year) => ({ name: year.label, value: String(year.id) }))
		}
	]);

	const partner = (cell: TableCell | undefined) => cell?.value as PartnershipRow;

	const parsePartnerships: ParseItems = async (rows) =>
		(await parsePartnershipRows(rows)).map((value) => [
			{ value, cell: nameCell },
			{ value, cell: yearCell },
			{ value, cell: domainsCell },
			{ value, cell: envelopeCell },
			{ value, cell: actionsCell }
		]);

	/** Après une action réussie, les tables se rechargent et les formulaires se ferment. */
	const submit: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				creating = false;
				withEnvelope = false;
				editing = null;
				triggerTableRefresh(TABLE_TOPIC);
			}
		};
	};
</script>

<svelte:head><title>Partenariats — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Partenariats</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Les domaines servent à reconnaître le partenaire dans le lien d'un item. Seule une
				<strong>enveloppe de crédit</strong> se modélise : une remise n'a pas de solde à décompter.
			</p>
		</div>
		<Button onclick={() => (creating = !creating)} size="md" variant="primary"
			>{creating ? 'Annuler' : 'Nouveau partenariat'}</Button
		>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if creating}
		<form
			class="border-rule bg-blue-gray/15 mb-4 rounded-lg border p-4"
			action="?/create"
			method="POST"
			use:enhance={submit}
		>
			<input name="school_year_id" type="hidden" value={data.schoolYearId} />
			<div class="flex flex-wrap items-end gap-3">
				<label class="text-dark-light-blue text-xs">
					Nom
					<input
						name="name"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						required
					/>
				</label>
				<label class="text-dark-light-blue flex-1 text-xs">
					Domaines
					<input
						name="domains"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						placeholder="mouser"
					/>
				</label>
			</div>
			<label class="text-dark-light-blue mt-3 block text-xs">
				Notes
				<textarea
					name="notes"
					class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
					rows="2"></textarea>
			</label>
			<label class="text-dark-light-blue mt-3 flex items-center gap-2 text-sm">
				<Checkbox name="envelope" className="size-4" value="1" bind:checked={withEnvelope} />
				Ce partenariat donne droit à une enveloppe à consommer chez lui
			</label>
			{#if withEnvelope}
				<label class="text-dark-light-blue mt-2 block text-xs">
					Montant de l'enveloppe
					<input
						name="opening_balance"
						class="border-rule-strong bg-dark-blue/60 mt-1 block w-32 rounded-xl border p-2.5 text-sm"
						inputmode="decimal"
						value="0,00"
					/>
				</label>
				<p class="text-dark-light-blue/70 mt-1 text-xs">
					Un compte dédié sera créé. Il n'entre jamais dans le solde de trésorerie : c'est un avoir
					chez un tiers, pas de l'argent en banque.
				</p>
			{/if}
			<Button class="mt-3" size="sm" type="submit" variant="primary">Créer</Button>
		</form>
	{/if}

	{#if editing}
		{#key editing.id}
			<form
				class="border-rule-strong bg-dark-blue/60 mb-4 rounded-lg border p-3"
				action="?/update"
				method="POST"
				use:enhance={submit}
			>
				<input name="id" type="hidden" value={editing.id} />
				<div class="flex flex-wrap items-end gap-3">
					<label class="text-dark-light-blue text-xs">
						Nom
						<input
							name="name"
							class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
							required
							value={editing.name}
						/>
					</label>
					<label class="text-dark-light-blue flex-1 text-xs">
						Domaines
						<input
							name="domains"
							class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
							value={editing.domains.join(', ')}
						/>
					</label>
				</div>
				<label class="text-dark-light-blue mt-3 block text-xs">
					Notes
					<textarea
						name="notes"
						class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 mt-1 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2 disabled:opacity-50"
						rows="2">{editing.notes ?? ''}</textarea
					>
				</label>
				<div class="mt-3 flex gap-2">
					<Button size="sm" type="submit" variant="primary">Enregistrer</Button>
					<Button onclick={() => (editing = null)} size="sm" variant="secondary">Annuler</Button>
				</div>
			</form>
		{/key}
	{/if}

	<div class="overflow-x-auto">
		<Table
			{columns}
			dbInfo={ACTIVE_PARTNERSHIPS_DB}
			pageSize={20}
			parseItems={parsePartnerships}
			refreshTopic={TABLE_TOPIC}
			searchable="name"
		/>
	</div>

	<h2 class="text-dark-light-blue mt-8 mb-2 text-sm font-semibold tracking-wide uppercase">
		Archivés
	</h2>
	<div class="overflow-x-auto">
		<Table
			columns={archivedColumns}
			dbInfo={ARCHIVED_PARTNERSHIPS_DB}
			filters={archivedFilters}
			pageSize={10}
			parseItems={parsePartnerships}
			refreshTopic={TABLE_TOPIC}
			searchable="name"
		/>
	</div>
</section>

{#snippet nameCell(cell: TableCell)}
	{@const row = partner(cell)}
	<div class="min-w-0">
		<p class={row.archivedAt ? 'text-dark-light-blue/70' : 'font-medium text-white'}>{row.name}</p>
		{#if row.notes}
			<p class="text-dark-light-blue mt-1 text-xs whitespace-pre-line">{row.notes}</p>
		{/if}
	</div>
{/snippet}

{#snippet yearCell(cell: TableCell)}
	<span class="text-dark-light-blue/70 text-xs">{partner(cell).schoolYearLabel}</span>
{/snippet}

{#snippet domainsCell(cell: TableCell)}
	{@const row = partner(cell)}
	{#if row.domains.length === 0}
		<span class="text-xs text-amber-300">aucun domaine — non reconnu dans les liens</span>
	{:else}
		<span class="flex flex-wrap gap-1.5">
			{#each row.domains as domain (domain)}
				<span class="bg-dark-blue/60 text-dark-light-blue rounded-full px-2 py-0.5 text-xs"
					>{domain}</span
				>
			{/each}
		</span>
	{/if}
{/snippet}

{#snippet envelopeCell(cell: TableCell)}
	{@const row = partner(cell)}
	{#if row.accountName}
		<span class="text-sm">
			<span class="text-dark-light-blue">{row.accountName} :</span>
			<span class="text-light-blue font-medium">{euro.format(row.accountBalance ?? 0)}</span>
		</span>
	{:else}
		<span class="text-dark-light-blue/70">—</span>
	{/if}
{/snippet}

{#snippet actionsCell(cell: TableCell)}
	{@const row = partner(cell)}
	{#if !row.archivedAt}
		<RowMenu>
			{#snippet children(close: () => void)}
				<Button
					class="w-full justify-start"
					onclick={() => {
						editing = row;
						close();
					}}
					size="sm"
					variant="secondary">Modifier</Button
				>
				<form action="?/archive" method="POST" use:enhance={submit}>
					<input name="id" type="hidden" value={row.id} />
					<Button class="w-full justify-start" size="sm" type="submit" variant="secondary"
						>Archiver</Button
					>
				</form>
			{/snippet}
		</RowMenu>
	{:else}
		<form action="?/unarchive" method="POST" use:enhance={submit}>
			<input name="id" type="hidden" value={row.id} />
			<Button size="sm" type="submit" variant="primary">Désarchiver</Button>
		</form>
	{/if}
{/snippet}
