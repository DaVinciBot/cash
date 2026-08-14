<script lang="ts">
	import {
		ACTIVITY_BADGES,
		actorLabel,
		fieldLabel,
		formatJournalValue,
		isOpaqueField,
		summarizeActivity,
		type ActivityEntry
	} from '@davincibot/lib';

	interface Props {
		entries: ActivityEntry[];
		/** Titre de la section ; masqué quand le composant est déjà sous un en-tête. */
		title?: string;
		empty?: string;
	}

	let { entries, title = 'Historique', empty = 'Aucun mouvement enregistré.' }: Props = $props();

	// CMD-F-62 — présentation LINÉAIRE : une entrée, une ligne, une phrase. Le
	// détail champ par champ n'apparaît qu'à la demande. Tout déplier d'emblée
	// transforme cinq corrections de prix en un mur de texte, ce qui est
	// exactement ce que le format linéaire cherche à éviter.
	//
	// « Au survol » au sens du cahier des charges, mais l'ouverture répond aussi
	// au clic et au clavier : un détail qui n'existe qu'au survol n'existe pas
	// sur un écran tactile, et pas du tout pour qui navigue au clavier.
	let open = $state<number | null>(null);

	const moment = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<section>
	{#if title}
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-gray-400 uppercase">{title}</h2>
	{/if}

	{#if entries.length === 0}
		<p class="text-sm text-gray-500">{empty}</p>
	{:else}
		<ol class="relative space-y-1 border-l border-gray-700 pl-4">
			{#each entries as entry (entry.id)}
				{@const badge = ACTIVITY_BADGES[entry.kind]}
				{@const detailed = entry.changes.length > 0}
				<li
					class="relative"
					onmouseenter={() => {
						if (detailed) {
							open = entry.id;
						}
					}}
					onmouseleave={() => {
						if (open === entry.id) {
							open = null;
						}
					}}
				>
					<span
						class="absolute top-2.5 -left-5.25 size-2 rounded-full bg-gray-600"
						aria-hidden="true"
					></span>

					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1.5 text-sm">
						<span class="rounded px-1.5 py-0.5 text-xs font-medium {badge.className}"
							>{badge.emoji} {badge.label}</span
						>
						<span class="text-gray-200">{summarizeActivity(entry)}</span>
						<span class="text-gray-500">par {actorLabel(entry)}</span>
						<time class="ml-auto shrink-0 text-xs text-gray-500" datetime={entry.occurredAt}
							>{moment.format(new Date(entry.occurredAt))}</time
						>
						{#if detailed}
							<button
								class="text-xs text-gray-400 underline decoration-dotted hover:text-gray-200"
								aria-expanded={open === entry.id}
								onclick={() => (open = open === entry.id ? null : entry.id)}
								type="button">{open === entry.id ? 'masquer' : 'détail'}</button
							>
						{/if}
					</div>

					{#if detailed && open === entry.id}
						<dl class="mb-2 rounded-lg bg-gray-800/60 p-3 text-xs ring-1 ring-gray-700">
							{#each entry.changes as change (change.field)}
								<div class="flex flex-wrap items-baseline gap-2 py-0.5">
									<dt class="w-44 shrink-0 text-gray-400">{fieldLabel(change.field)}</dt>
									<dd class="text-gray-200">
										{#if isOpaqueField(change.field)}
											<!-- Un identifiant brut n'apprend rien : « projet 12 → projet 7 »
											     ne dit que ce que le nom du champ dit déjà. -->
											<span class="text-gray-500">modifié</span>
										{:else}
											<span class="text-gray-500 line-through"
												>{formatJournalValue(change.old)}</span
											>
											<span class="mx-1 text-gray-600">→</span>
											<span>{formatJournalValue(change.new)}</span>
										{/if}
									</dd>
								</div>
							{/each}
						</dl>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>
