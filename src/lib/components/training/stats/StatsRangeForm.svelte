<script lang="ts">
	// La plage vit dans l'URL, donc le formulaire est un simple GET : le
	// rechargement refait le calcul côté serveur, et le lien obtenu montre à qui
	// le reçoit exactement ce que l'expéditeur avait sous les yeux.
	import type { StatsRange } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		range: StatsRange;
	}

	let { range }: Props = $props();

	const field =
		'mt-1 block rounded-lg border border-light-blue/30 bg-dark-blue/60 p-2 text-sm text-white';
</script>

<form class="flex flex-wrap items-end gap-3" method="GET">
	<label class="text-dark-light-blue text-xs">
		Du
		<input name="from" class={field} max={range.to} type="date" value={range.from} />
	</label>
	<label class="text-dark-light-blue text-xs">
		Au
		<input name="to" class={field} min={range.from} type="date" value={range.to} />
	</label>
	<label class="text-dark-light-blue text-xs">
		Période (jours)
		<input
			name="period"
			class="{field} w-28"
			max="366"
			min="1"
			step="1"
			type="number"
			value={range.periodDays}
		/>
	</label>
	<button
		class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-2 text-sm"
		type="submit">Afficher</button
	>
</form>
