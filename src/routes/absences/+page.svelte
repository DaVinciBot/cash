<script lang="ts">
	import { Button, Checkbox } from '@davincibot/components';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { enhance, type SubmitFunction } from '$app/forms';
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

	const requests = $derived(data.requests);
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

	/** `HH:MM:SS` renvoyé par Postgres → `HH:MM`. */
	const hm = (time: string) => time.slice(0, 5);

	const STATUS_CLASSES: Record<AbsenceStatus, string> = {
		pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
		approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
		refused: 'bg-red-500/15 text-red-300 ring-red-500/30'
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
			} else if (uploaded) {
				void getSupabaseBrowserClient().storage.from('absence-proofs').remove([uploaded]);
			}
			await update();
		};
	};
</script>

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
					placeholder="Ex. : Coupe de France de robotique, stand de l'association."
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

	<h2 class="mb-3 text-lg font-semibold text-white">Mes demandes</h2>

	{#if requests.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucune demande pour l'instant.
		</p>
	{:else}
		<ul class="space-y-3">
			{#each requests as request (request.id)}
				<li class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
					<div class="flex flex-wrap items-start gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-medium text-white first-letter:uppercase">
									{day.format(new Date(`${request.absenceDate}T00:00:00`))}
								</span>
								<span class="text-light-blue text-sm">
									{hm(request.startTime)} – {hm(request.endTime)}
								</span>
								<span
									class="rounded-full px-2 py-0.5 text-xs ring-1 {STATUS_CLASSES[request.status]}"
								>
									{ABSENCE_STATUS_LABELS[request.status]}
								</span>
							</div>
							<p class="text-dark-light-blue mt-2 text-sm whitespace-pre-line">{request.reason}</p>
							{#if request.proofUrl}
								<!-- eslint-disable svelte/no-navigation-without-resolve -- URL signée du bucket, hors routes de l'app -->
								<a
									class="text-light-blue mt-2 inline-block text-sm hover:underline"
									href={request.proofUrl}
									rel="noopener noreferrer"
									target="_blank">Voir le justificatif</a
								>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/if}
							{#if request.status === 'refused' && request.refusalReason}
								<p class="mt-2 rounded bg-red-500/10 px-2 py-1 text-sm text-red-300">
									Motif du refus : {request.refusalReason}
								</p>
							{/if}
						</div>

						{#if request.status === 'pending'}
							<form action="?/cancel" method="POST" use:enhance>
								<input name="id" type="hidden" value={request.id} />
								<Button size="sm" type="submit" variant="secondary">Annuler la demande</Button>
							</form>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
