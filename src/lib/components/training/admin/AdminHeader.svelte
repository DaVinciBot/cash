<script lang="ts">
	import { CTAButton } from '@davincibot/components';

	const noop = () => undefined;

	interface Props {
		trainingsCount?: number;
		upcomingCount?: number;
		draftCount?: number;
		slotRangeDays?: number;
		onAddTraining?: () => void;
		onAddSlot?: () => void;
	}

	const {
		trainingsCount = 0,
		upcomingCount = 0,
		draftCount = 0,
		slotRangeDays = 0,
		onAddTraining = noop,
		onAddSlot = noop
	}: Props = $props();
</script>

<header
	class="border-light-blue/15 bg-dark-blue/70 flex flex-col gap-6 rounded-[28px] border p-5 shadow-[0_20px_50px_rgba(1,7,32,0.35)] sm:p-6"
>
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-light-blue/60 text-xs tracking-[0.3em] uppercase">Administration</p>
			<h1 class="mt-2 text-2xl font-bold text-white sm:text-3xl">Pilotage des formations</h1>
			<p class="text-light-blue/70 mt-2 text-sm">
				Gérez le catalogue et les sessions planifiées en un coup d'oeil.
			</p>
		</div>
		<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
			<CTAButton onclick={onAddSlot} size="sm" type="button" variant="primary">
				Nouvelle session
			</CTAButton>
			<CTAButton onclick={onAddTraining} size="sm" type="button" variant="secondary">
				Nouvelle formation
			</CTAButton>
		</div>
	</div>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div class="border-light-blue/20 bg-dark-blue/80 rounded-2xl border p-4">
			<p class="text-light-blue/60 text-xs tracking-[0.25em] uppercase">Formations</p>
			<p class="mt-2 text-3xl font-bold text-white">{trainingsCount}</p>
			<p class="text-light-blue/70 mt-1 text-xs">catalogue actif</p>
		</div>
		<div class="border-light-blue/20 bg-dark-blue/80 rounded-2xl border p-4">
			<p class="text-light-blue/60 text-xs tracking-[0.25em] uppercase">Sessions à venir</p>
			<p class="mt-2 text-3xl font-bold text-white">{upcomingCount}</p>
			<p class="text-light-blue/70 mt-1 text-xs">dans les {slotRangeDays} prochains jours</p>
		</div>
		<div class="border-light-blue/20 bg-dark-blue/80 rounded-2xl border p-4">
			<p class="text-light-blue/60 text-xs tracking-[0.25em] uppercase">Brouillons</p>
			<p class="mt-2 text-3xl font-bold text-white">{draftCount}</p>
			<p class="text-light-blue/70 mt-1 text-xs">à finaliser</p>
		</div>
	</div>
</header>
