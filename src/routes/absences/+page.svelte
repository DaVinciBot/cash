<script lang="ts">
	import {
		Button,
		Checkbox,
		Table,
		type ParseItems,
		type TableCell,
		type TableColumn
	} from '@davincibot/components';
	import RowMenu from '#lib/components/cash/RowMenu.svelte';
	import { triggerTableRefresh } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { enhance, type SubmitFunction } from '$app/forms';
	import {
		absenceFilters,
		hm,
		parseAbsenceRows,
		type AbsenceRow,
		ABSENCE_TABLE_DB
	} from '#lib/absenceTable.js';
	import {
		ABSENCE_ATTESTATION,
		ABSENCE_STATUS_LABELS,
		absenceRequestErrors,
		nameFromEmail,
		PROOF_EXTENSIONS,
		proofError,
		type AbsenceRequestErrors,
		type AbsenceStatus
	} from '#lib/absences.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const identity = $derived(nameFromEmail(data.email));

	let open = $state(false);
	let submitting = $state(false);
	let clientErrors = $state<AbsenceRequestErrors>({});
	let proofMessage = $state<string | null>(null);

	// `ActionData` est l'union des retours des deux actions ; chaque champ ne vit
	// que dans une branche, d'où les gardes `in`.
	const serverErrors = $derived<AbsenceRequestErrors>(
		form && 'errors' in form && form.errors ? form.errors : {}
	);
	const errors = $derived({ ...serverErrors, ...clientErrors });
	const failure = $derived(form && 'message' in form ? form.message : null);
	const values = $derived(form && 'values' in form ? form.values : null);

	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' });
	const stamp = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

	const STATUS_CLASSES: Record<AbsenceStatus, string> = {
		pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
		approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
		refused: 'bg-red-500/15 text-red-300 ring-red-500/30'
	};

	const TABLE_TOPIC = 'absences';

	const columns: TableColumn[] = [
		{
			key: 'absence_date',
			label: 'Date',
			width: '12rem',
			sortable: true,
			csv: (row) => {
				const { date, startTime, endTime } = request(row[0]);
				return `${date} ${hm(startTime)}-${hm(endTime)}`;
			}
		},
		{ key: 'reason', label: 'Motif', csv: (row) => request(row[2]).reason },
		{
			key: 'status',
			label: 'Statut',
			width: '7rem',
			sortable: true,
			csv: (row) => ABSENCE_STATUS_LABELS[request(row[1]).status]
		},
		{ key: 'id', label: 'Actions', width: '5rem', align: 'right', csv: () => '' }
	];

	// Une page de membre ne montre que ses demandes, même pour qui peut toutes les voir.
	const filters = $derived(
		absenceFilters(data.user?.id ? { requesterId: data.user.id } : undefined)
	);

	const request = (cell: TableCell | undefined) => cell?.value as AbsenceRow;

	const parseRequests: ParseItems = async (rows) =>
		(await parseAbsenceRows(rows)).map((value) => [
			{ value, data: value.id, cell: dateCell },
			{ value, cell: reasonCell },
			{ value, cell: statusCell },
			{ value, cell: actionCell }
		]);

	/** Annulation d'une demande en attente : la table se recharge une fois l'action passée. */
	const cancel: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				triggerTableRefresh(TABLE_TOPIC);
			}
		};
	};

	/**
	 * Valide côté navigateur, envoie le justificatif au bucket, puis laisse partir
	 * le formulaire avec le seul chemin du fichier. Si l'action échoue, la pièce
	 * envoyée est retirée : aucune demande ne la cite, la policy le permet.
	 */
	const submit: SubmitFunction = async ({ formData, cancel }) => {
		// Même règle que `text()` côté serveur : un champ qui porte un fichier vaut vide.
		const field = (key: string) => {
			const value = formData.get(key);
			return typeof value === 'string' ? value.trim() : '';
		};
		const input = {
			date: field('date'),
			startTime: field('start_time'),
			endTime: field('end_time'),
			reason: field('reason'),
			attested: field('attested') === 'on'
		};
		clientErrors = absenceRequestErrors(input);
		proofMessage = null;

		const file = formData.get('proof');
		formData.delete('proof');
		const proof = file instanceof File && file.size > 0 ? file : null;
		if (proof) {
			proofMessage = proofError(proof);
		}

		if (Object.keys(clientErrors).length > 0 || proofMessage) {
			cancel();
			return;
		}

		submitting = true;
		let uploaded: string | null = null;
		if (proof) {
			const userId = data.user?.id;
			const ext = PROOF_EXTENSIONS[proof.type];
			if (!userId || !ext) {
				proofMessage = "Le justificatif n'a pas pu être envoyé.";
				submitting = false;
				cancel();
				return;
			}
			const path = `${userId}/${crypto.randomUUID()}.${ext}`;
			const { error } = await getSupabaseBrowserClient()
				.storage.from('absence-proofs')
				.upload(path, proof, { contentType: proof.type, upsert: false });
			if (error) {
				proofMessage = "Le justificatif n'a pas pu être envoyé. Réessaie.";
				submitting = false;
				cancel();
				return;
			}
			uploaded = path;
			formData.set('proof_path', path);
		}

		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'success') {
				open = false;
				triggerTableRefresh(TABLE_TOPIC, { resetPage: true });
			} else if (uploaded) {
				void getSupabaseBrowserClient().storage.from('absence-proofs').remove([uploaded]);
			}
			await update();
		};
	};
</script>

{#snippet dateCell(cell: TableCell)}
	{@const row = request(cell)}
	<div>
		<p class="first-letter:uppercase">{day.format(new Date(`${row.date}T00:00:00`))}</p>
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
		{#if row.resolvedAt}
			<p class="text-dark-light-blue/70 mt-1 text-xs">
				{row.status === 'approved' ? 'Validée' : 'Refusée'} le {stamp.format(
					new Date(row.resolvedAt)
				)}
				{#if row.resolvedBy}par {row.resolvedBy}{/if}
			</p>
		{/if}
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
	{#if row.status === 'pending'}
		<RowMenu>
			<form action="?/cancel" method="POST" use:enhance={cancel}>
				<input name="id" type="hidden" value={row.id} />
				<Button class="w-full justify-start" size="sm" type="submit" variant="secondary"
					>Annuler la demande</Button
				>
			</form>
		</RowMenu>
	{/if}
{/snippet}

<svelte:head><title>Demandes d'excuse — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-4xl">
	<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Demandes d'excuse</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Pour te faire excuser d'un cours. Le Secrétaire transmet ta demande à l'administration puis
				la passe en « Validée » ou « Refusée ».
			</p>
		</div>
		{#if !open}
			<Button onclick={() => (open = true)} variant="primary">Nouvelle demande</Button>
		{/if}
	</header>

	{#if failure}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{failure}
		</p>
	{/if}

	{#if form && 'created' in form}
		<p
			class="mb-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30"
		>
			Demande envoyée. Elle apparaît ci-dessous, en attente.
		</p>
	{/if}

	{#if open}
		<form
			class="border-rule bg-blue-gray/15 mb-8 space-y-4 rounded-2xl border p-4 sm:p-5"
			action="?/create"
			enctype="multipart/form-data"
			method="POST"
			novalidate
			use:enhance={submit}
		>
			<h2 class="text-lg font-semibold text-white">Nouvelle demande</h2>

			<p class="text-dark-light-blue text-sm">
				Demandeur :
				<span class="text-light-blue">
					{[identity.firstName, identity.lastName].filter(Boolean).join(' ')}
				</span>
				· {data.email}
			</p>

			<div class="grid gap-4 sm:grid-cols-3">
				<label class="text-dark-light-blue block text-sm">
					Date
					<input
						name="date"
						class="border-rule-strong bg-dark-blue/60 mt-1 w-full rounded-lg border p-2 text-white"
						type="date"
						value={values?.date ?? ''}
					/>
					{#if errors.date}<span class="mt-1 block text-xs text-red-400">{errors.date}</span>{/if}
				</label>
				<label class="text-dark-light-blue block text-sm">
					Heure de début
					<input
						name="start_time"
						class="border-rule-strong bg-dark-blue/60 mt-1 w-full rounded-lg border p-2 text-white"
						type="time"
						value={values?.startTime ?? ''}
					/>
					{#if errors.startTime}
						<span class="mt-1 block text-xs text-red-400">{errors.startTime}</span>
					{/if}
				</label>
				<label class="text-dark-light-blue block text-sm">
					Heure de fin
					<input
						name="end_time"
						class="border-rule-strong bg-dark-blue/60 mt-1 w-full rounded-lg border p-2 text-white"
						type="time"
						value={values?.endTime ?? ''}
					/>
					{#if errors.endTime}
						<span class="mt-1 block text-xs text-red-400">{errors.endTime}</span>
					{/if}
				</label>
			</div>

			<label class="text-dark-light-blue block text-sm">
				Motif
				<textarea
					name="reason"
					class="border-rule-strong bg-dark-blue/60 placeholder:text-muted mt-1 w-full rounded-lg border p-2 text-sm text-white"
					placeholder="Ex. : Coupe de France de robotique, réunion d'association."
					rows="3">{values?.reason ?? ''}</textarea
				>
				{#if errors.reason}
					<span class="mt-1 block text-xs text-red-400">{errors.reason}</span>
				{/if}
			</label>

			<label class="text-dark-light-blue block text-sm">
				Pièce justificative <span class="text-dark-light-blue/70"
					>(facultatif — PDF, PNG ou JPEG, 5 Mo max)</span
				>
				<input
					name="proof"
					class="text-dark-light-blue mt-1 block w-full text-sm"
					accept="application/pdf,image/png,image/jpeg"
					type="file"
				/>
				{#if proofMessage}
					<span class="mt-1 block text-xs text-red-400">{proofMessage}</span>
				{/if}
			</label>

			<div>
				<label class="text-dark-light-blue flex items-start gap-2 text-sm">
					<Checkbox
						name="attested"
						checked={values?.attested ?? false}
						className="mt-0.5 size-4 shrink-0"
					/>
					{ABSENCE_ATTESTATION}
				</label>
				{#if errors.attested}
					<span class="mt-1 block text-xs text-red-400">{errors.attested}</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Button disabled={submitting} type="submit" variant="primary">
					{submitting ? 'Envoi…' : 'Envoyer la demande'}
				</Button>
				<Button
					onclick={() => {
						open = false;
						clientErrors = {};
						proofMessage = null;
					}}
					variant="secondary">Annuler</Button
				>
			</div>
		</form>
	{/if}

	<h2 class="mb-3 text-lg font-semibold text-white">Demandes</h2>

	<div class="overflow-x-auto">
		<Table
			{columns}
			dbInfo={ABSENCE_TABLE_DB}
			{filters}
			pageSize={10}
			parseItems={parseRequests}
			refreshTopic={TABLE_TOPIC}
			searchable="reason"
		/>
	</div>
</section>
