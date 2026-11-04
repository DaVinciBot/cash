<script lang="ts">
	import { Button } from '@davincibot/components';
	import { enhance } from '$app/forms';
	import { ABSENCE_STATUS_LABELS, nameFromEmail, type AbsenceStatus } from '#lib/absences.js';
	import { REFUSAL_REASON_MIN_LENGTH, refusalReasonError } from '#lib/types/domain.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const requests = $derived(data.requests);
	const filters = $derived(data.filters);

	// Demande visée par le panneau de motif ; `null` = panneau fermé.
	let refusing = $state<number | null>(null);
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

	/** `HH:MM:SS` renvoyé par Postgres → `HH:MM`. */
	const hm = (time: string) => time.slice(0, 5);

	function fullName(email: string): string {
		const { firstName, lastName } = nameFromEmail(email);
		return [firstName, lastName].filter(Boolean).join(' ');
	}

	const STATUS_CLASSES: Record<AbsenceStatus, string> = {
		pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
		approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
		refused: 'bg-red-500/15 text-red-300 ring-red-500/30'
	};

	const fieldClass =
		'border-rule-strong bg-dark-blue/60 mt-1 block rounded-lg border p-2 text-sm text-white';

	function closeRefusal() {
		refusing = null;
		reason = '';
	}
</script>

<svelte:head><title>Excuses à traiter — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-white">Excuses à traiter</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Saisis chaque demande sur la webapp de l'école, puis passe-la en « Validée » ou « Refusée ».
			Un refus est accompagné d'un motif, lu par le membre.
		</p>
	</header>

	<form
		class="border-rule bg-blue-gray/15 mb-6 flex flex-wrap items-end gap-3 rounded-lg border px-4 py-3"
		method="GET"
	>
		<label class="text-dark-light-blue text-sm">
			Statut
			<select name="status" class={fieldClass}>
				<option selected={filters.status === 'pending'} value="pending">En attente</option>
				<option selected={filters.status === 'approved'} value="approved">Validées</option>
				<option selected={filters.status === 'refused'} value="refused">Refusées</option>
				<option selected={filters.status === null} value="all">Toutes</option>
			</select>
		</label>
		<label class="text-dark-light-blue text-sm">
			Membre
			<select name="requester" class={fieldClass}>
				<option selected={filters.requesterId === null} value="">Tous</option>
				{#each data.members as member (member.id)}
					<option selected={filters.requesterId === member.id} value={member.id}>
						{fullName(member.email) || member.email}
					</option>
				{/each}
			</select>
		</label>
		<label class="text-dark-light-blue text-sm">
			Du
			<input name="from" class={fieldClass} type="date" value={filters.from ?? ''} />
		</label>
		<label class="text-dark-light-blue text-sm">
			Au
			<input name="to" class={fieldClass} type="date" value={filters.to ?? ''} />
		</label>
		<Button size="sm" type="submit" variant="primary">Filtrer</Button>
	</form>

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

	{#if requests.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucune demande ne correspond à ces filtres.
		</p>
	{:else}
		<ul class="space-y-3">
			{#each requests as request (request.id)}
				<li class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
					<div class="flex flex-wrap items-start gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-medium text-white">
									{fullName(request.requesterEmail) || request.requesterEmail}
								</span>
								<span class="text-dark-light-blue text-sm">{request.requesterEmail}</span>
								<span
									class="rounded-full px-2 py-0.5 text-xs ring-1 {STATUS_CLASSES[request.status]}"
								>
									{ABSENCE_STATUS_LABELS[request.status]}
								</span>
							</div>
							<p class="text-light-blue mt-1 text-sm">
								{day.format(new Date(`${request.absenceDate}T00:00:00`))} · {hm(request.startTime)} –
								{hm(request.endTime)}
							</p>
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
							<p class="text-dark-light-blue/70 mt-2 text-xs">
								Demandée le {stamp.format(new Date(request.createdAt))}
								{#if request.resolvedAt}
									· décidée le {stamp.format(new Date(request.resolvedAt))}
									{#if request.resolvedByUsername}par {request.resolvedByUsername}{/if}
								{/if}
							</p>
						</div>

						<div class="flex shrink-0 flex-wrap items-center gap-2">
							{#if request.status !== 'approved'}
								<form action="?/approve" method="POST" use:enhance>
									<input name="id" type="hidden" value={request.id} />
									<Button size="sm" type="submit" variant="primary">Valider</Button>
								</form>
							{/if}
							{#if request.status !== 'refused'}
								<Button
									onclick={() => {
										refusing = request.id;
										reason = '';
									}}
									size="sm"
									variant="danger">Refuser</Button
								>
							{/if}
							{#if request.status !== 'pending'}
								<form action="?/reopen" method="POST" use:enhance>
									<input name="id" type="hidden" value={request.id} />
									<Button size="sm" type="submit" variant="secondary">Remettre en attente</Button>
								</form>
							{/if}
						</div>
					</div>

					{#if refusing === request.id}
						<form
							class="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
							action="?/refuse"
							method="POST"
							use:enhance={() =>
								({ update }) => {
									closeRefusal();
									return update();
								}}
						>
							<input name="id" type="hidden" value={request.id} />
							<label class="text-dark-light-blue block text-sm" for="refusal-reason-{request.id}">
								Motif du refus — il sera lu par le membre
							</label>
							<textarea
								id="refusal-reason-{request.id}"
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
				</li>
			{/each}
		</ul>
	{/if}
</section>
