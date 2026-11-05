<script lang="ts">
	import {
		Button,
		Table,
		type ParseItems,
		type TableCell,
		type TableColumn
	} from '@davincibot/components';
	import RowMenu from '#lib/components/cash/RowMenu.svelte';
	import { triggerTableRefresh } from '@davincibot/lib';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { ABSENCE_STATUS_LABELS, nameFromEmail, type AbsenceStatus } from '#lib/absences.js';
	import {
		absenceFilters,
		ABSENCE_TABLE_DB,
		hm,
		parseAbsenceRows,
		type AbsenceRow
	} from '#lib/absenceTable.js';
	import { REFUSAL_REASON_MIN_LENGTH, refusalReasonError } from '#lib/types/domain.js';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const TABLE_TOPIC = 'absences-review';

	// Demande visée par le panneau de motif ; `null` = panneau fermé.
	let refusing = $state<AbsenceRow | null>(null);
	let reason = $state('');
	const reasonError = $derived(reason.length > 0 ? refusalReasonError(reason) : null);

	const failure = $derived(form && 'message' in form ? form.message : null);
	const outcome = $derived.by(() => {
		if (!form || !('decided' in form) || !form.decided) {
			return null;
		}
		return `Demande passée en « ${ABSENCE_STATUS_LABELS[form.decided]} ».`;
	});

	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	const stamp = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

	function fullName(email: string): string {
		const { firstName, lastName } = nameFromEmail(email);
		return [firstName, lastName].filter(Boolean).join(' ');
	}

	const STATUS_CLASSES: Record<AbsenceStatus, string> = {
		pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
		approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
		refused: 'bg-red-500/15 text-red-300 ring-red-500/30'
	};

	const request = (cell: TableCell | undefined) => cell?.value as AbsenceRow;

	const columns: TableColumn[] = [
		{
			key: 'requester_email',
			label: 'Membre',
			width: '13rem',
			sortable: true,
			csv: (row) => request(row[0]).email
		},
		{
			key: 'absence_date',
			label: 'Date',
			width: '9rem',
			sortable: true,
			csv: (row) => {
				const { date, startTime, endTime } = request(row[1]);
				return `${date} ${hm(startTime)}-${hm(endTime)}`;
			}
		},
		{ key: 'reason', label: 'Motif', csv: (row) => request(row[3]).reason },
		{
			key: 'status',
			label: 'Statut',
			width: '7rem',
			sortable: true,
			csv: (row) => ABSENCE_STATUS_LABELS[request(row[2]).status]
		},
		{ key: 'id', label: 'Actions', width: '5rem', align: 'right', csv: () => '' }
	];

	const filters = absenceFilters();

	const parseRequests: ParseItems = async (rows) =>
		(await parseAbsenceRows(rows)).map((value) => [
			{ value, data: value.id, cell: memberCell },
			{ value, cell: dateCell },
			{ value, cell: reasonCell },
			{ value, cell: statusCell },
			{ value, cell: actionCell }
		]);

	function closeRefusal() {
		refusing = null;
		reason = '';
	}

	/** Valider ou remettre en attente : la table se recharge une fois la décision prise. */
	const decide: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				triggerTableRefresh(TABLE_TOPIC);
			}
		};
	};

	const refuse: SubmitFunction = () => {
		return async ({ result, update }) => {
			closeRefusal();
			await update();
			if (result.type === 'success') {
				triggerTableRefresh(TABLE_TOPIC);
			}
		};
	};
</script>

{#snippet memberCell(cell: TableCell)}
	{@const row = request(cell)}
	<div class="min-w-0">
		<p class="font-medium">{fullName(row.email) || row.email}</p>
		<p class="text-dark-light-blue/70 truncate text-xs">{row.email}</p>
	</div>
{/snippet}

{#snippet dateCell(cell: TableCell)}
	{@const row = request(cell)}
	<div>
		<p>{day.format(new Date(`${row.date}T00:00:00`))}</p>
		<p class="text-dark-light-blue/70 text-xs">{hm(row.startTime)} – {hm(row.endTime)}</p>
	</div>
{/snippet}

{#snippet reasonCell(cell: TableCell)}
	{@const row = request(cell)}
	<div class="min-w-0">
		<p class="whitespace-pre-line">{row.reason}</p>
		{#if row.proofUrl}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- URL signée du bucket, hors routes de l'app -->
			<a
				class="text-light-blue mt-1 inline-block text-xs hover:underline"
				href={row.proofUrl}
				rel="noopener noreferrer"
				target="_blank">Voir le justificatif</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
		{#if row.status === 'refused' && row.refusalReason}
			<p class="mt-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">
				Motif du refus : {row.refusalReason}
			</p>
		{/if}
		<p class="text-dark-light-blue/70 mt-1 text-xs">
			Demandée le {stamp.format(new Date(row.createdAt))}
			{#if row.resolvedAt}
				· décidée le {stamp.format(new Date(row.resolvedAt))}
			{/if}
		</p>
	</div>
{/snippet}

{#snippet statusCell(cell: TableCell)}
	{@const row = request(cell)}
	<span class="rounded-full px-2 py-0.5 text-xs ring-1 {STATUS_CLASSES[row.status]}">
		{ABSENCE_STATUS_LABELS[row.status]}
	</span>
{/snippet}

{#snippet actionCell(cell: TableCell)}
	{@const row = request(cell)}
	<RowMenu>
		{#snippet children(close: () => void)}
			{#if row.status !== 'approved'}
				<form action="?/approve" method="POST" use:enhance={decide}>
					<input name="id" type="hidden" value={row.id} />
					<Button class="w-full justify-start" size="sm" type="submit" variant="primary"
						>Valider</Button
					>
				</form>
			{/if}
			{#if row.status !== 'refused'}
				<Button
					class="w-full justify-start"
					onclick={() => {
						refusing = row;
						reason = '';
						close();
					}}
					size="sm"
					variant="danger">Refuser</Button
				>
			{/if}
			{#if row.status !== 'pending'}
				<form action="?/reopen" method="POST" use:enhance={decide}>
					<input name="id" type="hidden" value={row.id} />
					<Button class="w-full justify-start" size="sm" type="submit" variant="secondary"
						>Remettre en attente</Button
					>
				</form>
			{/if}
		{/snippet}
	</RowMenu>
{/snippet}

<svelte:head><title>Excuses à traiter — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Excuses à traiter</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Saisis chaque demande sur la webapp de l'école, puis passe-la en « Validée » ou « Refusée ».
			Un refus est accompagné d'un motif, lu par le membre.
		</p>
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if outcome}
		<p
			class="mb-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30"
		>
			{outcome}
		</p>
	{/if}

	{#if refusing}
		<form
			class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
			action="?/refuse"
			method="POST"
			use:enhance={refuse}
		>
			<input name="id" type="hidden" value={refusing.id} />
			<label class="text-dark-light-blue block text-sm" for="refusal-reason">
				Motif du refus de {fullName(refusing.email) || refusing.email}, le
				{day.format(new Date(`${refusing.date}T00:00:00`))} — il sera lu par le membre
			</label>
			<textarea
				id="refusal-reason"
				name="reason"
				class="border-rule-strong bg-dark-blue/60 placeholder:text-muted mt-1 w-full rounded-lg border p-2 text-sm text-white"
				placeholder="Ex. : créneau de sport, non excusable."
				rows="3"
				bind:value={reason}></textarea>
			{#if reasonError}
				<p class="mt-1 text-xs text-red-400">{reasonError}</p>
			{:else}
				<p class="text-dark-light-blue/70 mt-1 text-xs">
					{REFUSAL_REASON_MIN_LENGTH} caractères minimum.
				</p>
			{/if}
			<div class="mt-3 flex items-center gap-2">
				<Button
					disabled={reason.trim().length < REFUSAL_REASON_MIN_LENGTH}
					size="sm"
					type="submit"
					variant="danger">Confirmer le refus</Button
				>
				<Button onclick={closeRefusal} size="sm" variant="secondary">Annuler</Button>
			</div>
		</form>
	{/if}

	<div class="overflow-x-auto">
		<Table
			{columns}
			dbInfo={ABSENCE_TABLE_DB}
			{filters}
			pageSize={10}
			parseItems={parseRequests}
			refreshTopic={TABLE_TOPIC}
			searchable="requester_email"
		/>
	</div>
</section>
