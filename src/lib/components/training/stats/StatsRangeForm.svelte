<script lang="ts">
	// La plage vit dans l'URL, donc le formulaire est un simple GET : le
	// rechargement refait le calcul côté serveur, et le lien obtenu montre à qui
	// le reçoit exactement ce que l'expéditeur avait sous les yeux.
	import type { StatsRange } from '$lib/helpers/trainingStatsTypes';
	import { CTAButton } from '@davincibot/components';

	interface Props {
		range: StatsRange;
	}

	let { range }: Props = $props();

	const field =
		'border-light-blue/20 bg-dark-blue/80 text-light-blue/90 mt-1 block rounded-lg border p-2 text-sm';
</script>

<form class="flex flex-wrap items-end gap-3" method="GET">
	<label class="text-light-blue/70 text-xs">
		Du
		<input name="from" class={field} max={range.to} type="date" value={range.from} />
	</label>
	<label class="text-light-blue/70 text-xs">
		Au
		<input name="to" class={field} min={range.from} type="date" value={range.to} />
	</label>
	<label class="text-light-blue/70 text-xs">
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
	<CTAButton fullWidth={false} size="sm" type="submit" variant="primary">Afficher</CTAButton>
</form>
