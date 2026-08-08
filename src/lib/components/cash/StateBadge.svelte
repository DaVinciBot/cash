<script lang="ts">
	import type { StateBadge } from '@davincibot/lib';

	interface Props {
		badge: StateBadge;
		/** Masque l'emoji quand la place manque — le libellé et la couleur suffisent. */
		compact?: boolean;
		class?: string;
	}

	let { badge, compact = false, class: className = '' }: Props = $props();
</script>

<!--
	Repère visuel unique des états (CMD-F-22, TRANS-NF-40). La couleur, le libellé
	et l'emoji viennent tous du référentiel de @davincibot/lib : aucun écran ne
	décide de sa propre palette, sans quoi les statuts redeviendraient incohérents
	entre les tables, les filtres et le détail (défaut n° 10).

	La couleur n'est jamais le seul porteur d'information : le libellé est toujours
	écrit, ce qui garde les états lisibles en cas de daltonisme.
-->
<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap {badge.className} {className}"
>
	{#if !compact}<span aria-hidden="true">{badge.emoji}</span>{/if}
	{badge.label}
</span>
