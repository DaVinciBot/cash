<script lang="ts">
	import { ITEM_STATE_BADGES, type ItemState } from '@davincibot/lib';
	import StateBadge from './StateBadge.svelte';

	interface Props {
		state: ItemState;
		compact?: boolean;
		class?: string;
	}

	let { state, compact = false, class: className = '' }: Props = $props();
</script>

<StateBadge class={className} badge={ITEM_STATE_BADGES[state]} {compact} />
