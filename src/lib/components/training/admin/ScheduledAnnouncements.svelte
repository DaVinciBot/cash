<script lang="ts">
	// Annonces Discord planifiées (formation#40) : l'annonce de la semaine se
	// prépare à l'avance, et la base l'envoie à l'heure dite (job pg_cron
	// `training-announcements`, toutes les cinq minutes), comme le bouton
	// « Envoyer » : la synthèse puis les stories.
	//
	// Typage local : la table `formation.scheduled_announcement` arrive avec la
	// prochaine version de `@davincibot/database-types` (DaVinciBot/Supabased).
	import { Button } from '@davincibot/components';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { CalendarClock } from '@lucide/svelte';
	import { onMount } from 'svelte';

	interface Announcement {
		id: number;
		send_at: string;
		period_from: string;
		period_to: string;
		text: string | null;
		status: 'pending' | 'sent' | 'failed' | 'canceled';
		error: string | null;
	}

	interface AnnouncementTable {
		select: (columns: string) => {
			in: (
				column: 'status',
				values: string[]
			) => {
				order: (
					column: 'send_at',
					options: { ascending: boolean }
				) => PromiseLike<{ data: Announcement[] | null; error: { message: string } | null }>;
			};
		};
		insert: (row: {
			send_at: string;
			period_from: string;
			period_to: string;
			text: string | null;
		}) => PromiseLike<{ error: { message: string } | null }>;
		update: (values: { status: 'canceled' }) => {
			eq: (column: 'id', value: number) => PromiseLike<{ error: { message: string } | null }>;
		};
	}

	const table = () =>
		(
			getSupabaseBrowserClient() as unknown as {
				schema: (name: 'formation') => {
					from: (name: 'scheduled_announcement') => AnnouncementTable;
				};
			}
		)
			.schema('formation')
			.from('scheduled_announcement');

	const isoDay = (date: Date) =>
		`${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

	/** Semaine annoncée par défaut : du lundi au vendredi de la semaine qui vient. */
	function nextWeek(today: Date): { from: string; to: string } {
		const offset = (8 - today.getDay()) % 7 || 7;
		const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
		const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);
		return { from: isoDay(monday), to: isoDay(friday) };
	}

	const week = nextWeek(new Date());
	let announcements = $state<Announcement[]>([]);
	let open = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let from = $state(week.from);
	let to = $state(week.to);
	let text = $state('');
	// Par défaut, le dimanche soir qui précède la semaine annoncée.
	let sendAt = $state(`${defaultSendDay(week.from)}T18:00`);

	function defaultSendDay(monday: string): string {
		const date = new Date(`${monday}T12:00:00`);
		return isoDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
	}

	const moment = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

	async function load() {
		const { data, error: loadError } = await table()
			.select('id, send_at, period_from, period_to, text, status, error')
			.in('status', ['pending', 'failed'])
			.order('send_at', { ascending: true });
		if (loadError) {
			error = 'Les annonces planifiées sont illisibles pour le moment.';
			return;
		}
		announcements = data ?? [];
	}

	async function schedule(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		const when = new Date(sendAt);
		if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
			error = "Choisissez une heure d'envoi à venir.";
			return;
		}
		if (!from || !to || to < from) {
			error = 'La fin de la période doit suivre son début.';
			return;
		}
		busy = true;
		const { error: insertError } = await table().insert({
			send_at: when.toISOString(),
			period_from: from,
			period_to: to,
			text: text.trim() || null
		});
		busy = false;
		if (insertError) {
			error = "L'annonce n'a pas pu être planifiée.";
			return;
		}
		open = false;
		text = '';
		await load();
	}

	async function cancel(id: number) {
		const { error: updateError } = await table().update({ status: 'canceled' }).eq('id', id);
		if (updateError) {
			error = "Cette annonce n'a pas pu être annulée.";
			return;
		}
		await load();
	}

	onMount(() => {
		void load();
	});

	const FIELD =
		'border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted mt-1 block w-full rounded-xl border p-2.5 text-sm';
</script>

<section class="border-rule bg-blue-gray/15 mb-6 rounded-2xl border p-4 sm:p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-light-blue flex items-center gap-2 text-sm font-semibold">
			<CalendarClock class="size-4" />
			Annonces planifiées ({announcements.filter((a) => a.status === 'pending').length})
		</h2>
		<Button onclick={() => (open = !open)} size="sm" variant="secondary"
			>{open ? 'Fermer' : 'Planifier une annonce'}</Button
		>
	</div>

	{#if error}
		<p class="mt-3 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{error}
		</p>
	{/if}

	{#if open}
		<form class="mt-4 grid gap-3 sm:grid-cols-3" onsubmit={schedule}>
			<label class="text-dark-light-blue text-xs">
				Formations du
				<input class={FIELD} required type="date" bind:value={from} />
			</label>
			<label class="text-dark-light-blue text-xs">
				au
				<input class={FIELD} required type="date" bind:value={to} />
			</label>
			<label class="text-dark-light-blue text-xs">
				Envoyer le
				<input class={FIELD} required type="datetime-local" bind:value={sendAt} />
			</label>
			<label class="text-dark-light-blue text-xs sm:col-span-3">
				Texte (facultatif : le message habituel sinon)
				<textarea class={FIELD} rows="3" bind:value={text}></textarea>
			</label>
			<div class="sm:col-span-3">
				<Button disabled={busy} size="sm" type="submit" variant="primary"
					>{busy ? 'Planification…' : "Planifier l'annonce"}</Button
				>
			</div>
		</form>
	{/if}

	{#if announcements.length > 0}
		<ul class="divide-rule mt-4 divide-y text-sm">
			{#each announcements as announcement (announcement.id)}
				<li class="flex flex-wrap items-center gap-3 py-2">
					<span class="text-light-blue">{moment.format(new Date(announcement.send_at))}</span>
					<span class="text-dark-light-blue">
						formations du {day.format(new Date(announcement.period_from))} au
						{day.format(new Date(announcement.period_to))}
					</span>
					{#if announcement.status === 'failed'}
						<span class="text-xs text-red-300" title={announcement.error ?? ''}
							>Échec de l'envoi</span
						>
					{/if}
					{#if announcement.status === 'pending'}
						<Button
							class="ml-auto"
							onclick={() => void cancel(announcement.id)}
							size="sm"
							variant="danger-ghost">Annuler</Button
						>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
