<script lang="ts">
	import { Button } from '@davincibot/components';
	const noop = () => undefined;

	interface Props {
		trainingsCount?: number;
		upcomingCount?: number;
		draftCount?: number;
		slotRangeDays?: number;
		onAddTraining?: () => void;
		onAddSlot?: () => void;
		/** Lien vers les statistiques ; absent, le bouton ne s'affiche pas. */
		statsHref?: string;
		/** Lien vers le calendrier public ; absent, le bouton ne s'affiche pas. */
		calendarHref?: string;
	}

	let {
		trainingsCount = 0,
		upcomingCount = 0,
		draftCount = 0,
		slotRangeDays = 0,
		onAddTraining = noop,
		onAddSlot = noop,
		statsHref = '',
		calendarHref = ''
	}: Props = $props();

	const tiles = $derived([
		{ key: 'trainings', label: 'Formations', value: trainingsCount, hint: 'catalogue actif' },
		{
			key: 'upcoming',
			label: 'Sessions à venir',
			value: upcomingCount,
			hint: `dans les ${String(slotRangeDays)} prochains jours`
		},
		{ key: 'drafts', label: 'Brouillons', value: draftCount, hint: 'à finaliser' }
	]);
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold text-white">Pilotage des formations</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Le catalogue tient les contenus de référence, les sessions les dates auxquelles ils sont
			donnés : c'est toujours une session qu'on planifie, jamais une formation.
		</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<Button onclick={onAddSlot} size="md" variant="primary">Nouvelle session</Button>
		<Button onclick={onAddTraining} size="md" variant="secondary">Nouvelle formation</Button>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- liens résolus par l'appelant -->
		{#if statsHref}
			<Button href={statsHref} size="md" variant="secondary">Statistiques</Button>
		{/if}
		{#if calendarHref}
			<Button href={calendarHref} size="md" variant="secondary">Calendrier public</Button>
		{/if}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</header>

<div class="mb-6 grid gap-4 sm:grid-cols-3">
	{#each tiles as tile (tile.key)}
		<div class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
			<p class="text-dark-light-blue text-xs">{tile.label}</p>
			<p class="mt-1 text-2xl font-bold text-white">{tile.value}</p>
			<p class="text-dark-light-blue/70 mt-1 text-xs">{tile.hint}</p>
		</div>
	{/each}
</div>
