<script lang="ts">
	// La plage vit dans l'URL, donc le formulaire est un simple GET : le
	// rechargement refait le calcul côté serveur, et le lien obtenu montre à qui
	// le reçoit exactement ce que l'expéditeur avait sous les yeux.
	import type { StatsRange } from '$lib/helpers/trainingStatsTypes';

	interface Props {
		range: StatsRange;
	}

	let { range }: Props = $props();

	const field = 'mt-1 block rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white';
</script>

<form class="flex flex-wrap items-end gap-3" method="GET">
	<label class="text-xs text-gray-300">
		Du
		<input name="from" class={field} max={range.to} type="date" value={range.from} />
	</label>
	<label class="text-xs text-gray-300">
		Au
		<input name="to" class={field} min={range.from} type="date" value={range.to} />
	</label>
	<label class="text-xs text-gray-300">
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
		class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
		type="submit">Afficher</button
	>
</form>
