<script lang="ts">
	import { CAMPUS_BADGES, type Campus } from '@davincibot/lib';
	import StateBadge from './StateBadge.svelte';

	interface Props {
		campus: Campus;
		compact?: boolean;
		class?: string;
	}

	let { campus, compact = false, class: className = '' }: Props = $props();
</script>

<!--
	CMD-F-40 / TRANS-NF-41 : Nantes et Paris doivent se lire d'un coup d'œil.
	Le badge cliquable qui copie l'adresse complète (CMD-F-41) est un geste de la
	vue trésorier et arrive au jalon 5 ; côté membre il n'y a rien à copier, la
	destination n'est qu'une information.
-->
<StateBadge class={className} badge={CAMPUS_BADGES[campus]} {compact} />
