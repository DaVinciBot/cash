<script lang="ts">
	import type { StateBadge } from '@davincibot/lib';
	import type { BadgeIcon } from './stateIcons';

	interface Props {
		badge: StateBadge;
		/** Icône Lucide du registre correspondant — voir `stateIcons.ts`. */
		icon?: BadgeIcon;
		/** Masque l'icône quand la place manque — le libellé et la couleur suffisent. */
		compact?: boolean;
		class?: string;
	}

	let { badge, icon: Icon, compact = false, class: className = '' }: Props = $props();
</script>

<!--
	Repère visuel unique des états (CMD-F-22, TRANS-NF-40). La couleur et le
	libellé viennent du référentiel de @davincibot/lib, l'icône de `stateIcons.ts` :
	aucun écran ne décide de sa propre palette, sans quoi les statuts
	redeviendraient incohérents entre les tables, les filtres et le détail
	(défaut n° 10).

	Le champ `emoji` du référentiel n'est plus rendu : son dessin dépendait de la
	police du système et il n'héritait pas de la couleur du badge.

	La couleur n'est jamais le seul porteur d'information : le libellé est toujours
	écrit, ce qui garde les états lisibles en cas de daltonisme.
-->
<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap {badge.className} {className}"
>
	{#if Icon && !compact}<Icon class="size-3.5 shrink-0" />{/if}
	{badge.label}
</span>
