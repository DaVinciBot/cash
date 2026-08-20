<script lang="ts">
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
		<p class="mt-1 text-sm text-gray-400">
			Le catalogue tient les contenus de référence, les sessions les dates auxquelles ils sont
			donnés : c'est toujours une session qu'on planifie, jamais une formation.
		</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<button
			class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
			onclick={onAddSlot}
			type="button">Nouvelle session</button
		>
		<button
			class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
			onclick={onAddTraining}
			type="button">Nouvelle formation</button
		>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- liens résolus par l'appelant -->
		{#if statsHref}
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				href={statsHref}>Statistiques</a
			>
		{/if}
		{#if calendarHref}
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				href={calendarHref}>Calendrier public</a
			>
		{/if}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</header>

<div class="mb-6 grid gap-4 sm:grid-cols-3">
	{#each tiles as tile (tile.key)}
		<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
			<p class="text-xs text-gray-400">{tile.label}</p>
			<p class="mt-1 text-2xl font-bold text-white">{tile.value}</p>
			<p class="mt-1 text-xs text-gray-500">{tile.hint}</p>
		</div>
	{/each}
</div>
