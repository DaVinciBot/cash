<script lang="ts">
	import { Button } from '@davincibot/components';
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { statusBadge, stateBadgeLabel } from '$lib/helpers/trainingTables';
	import { SLOT_STATUS_ICONS } from '$lib/helpers/trainingOptions';
	import {
		Table,
		type DBInfo,
		type Filter,
		type ParseItems,
		type TableColumn,
		type TableRow
	} from '@davincibot/components';
	import type { TrainingListItem, TrainingSlotListItem } from '@davincibot/lib';

	const noop = () => undefined;
	const noopSlot: (slot: TrainingSlotListItem) => void = () => undefined;

	interface Props {
		slots?: TrainingSlotListItem[];
		slotDbInfo: DBInfo;
		onSlotRowClick?: (row: TableRow) => void;
		slotFilters?: Filter[];
		slotTableTopic?: string;
		parseSlotItems: ParseItems;
		onAddSlot?: () => void;
		onEditSlot?: (slot: TrainingSlotListItem) => void;
		formatSlotDate: (value: string) => string;
		findTrainingName: (trainingId: number, trainings: TrainingListItem[]) => string;
		trainings?: TrainingListItem[];
	}

	let {
		slots = [],
		slotDbInfo,
		onSlotRowClick,
		slotFilters = [],
		slotTableTopic = '',
		parseSlotItems,
		onAddSlot = noop,
		onEditSlot = noopSlot,
		formatSlotDate,
		findTrainingName,
		trainings = []
	}: Props = $props();

	const columns: TableColumn[] = [
		{ key: 'start', label: 'Début', sortable: true },
		{ key: 'name', label: 'Formation', sortable: true },
		{ key: 'trainer_username', label: 'Formateur·ice', sortable: true },
		{ key: 'status', label: 'Statut', sortable: true, csv: (row) => stateBadgeLabel(row[3]) }
	];
</script>

<div class="mb-8">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">
				Sessions de formation
			</h2>
			<p class="text-dark-light-blue/70 mt-1 text-xs">Planifiez, suivez et ajustez les sessions.</p>
		</div>
		<Button onclick={onAddSlot} size="sm" variant="secondary">Ajouter</Button>
	</div>

	<!-- La table paginée reste au clavier et à la souris ; sous 768 px elle
	     déborderait, d'où la même liste rendue en cartes. -->
	<div class="border-light-blue/20 bg-blue-gray/15 hidden rounded-lg border md:block">
		<Table
			{columns}
			dbInfo={slotDbInfo}
			filters={slotFilters}
			onRowClick={onSlotRowClick}
			pageSize={10}
			parseItems={parseSlotItems}
			refreshTopic={slotTableTopic}
			searchable="name"
		/>
	</div>

	<div class="md:hidden">
		{#if slots.length === 0}
			<p
				class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
			>
				Aucune session
			</p>
		{:else}
			<ul class="space-y-2">
				{#each slots as slot (slot.slot_id)}
					<li class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="font-medium text-white">{formatSlotDate(slot.start)}</p>
								<p class="text-dark-light-blue mt-1 text-sm">
									{findTrainingName(slot.training_id, trainings)}
								</p>
							</div>
							<Button
								onclick={() => {
									onEditSlot(slot);
								}}
								size="sm"
								variant="secondary">Éditer</Button
							>
						</div>
						<div class="text-dark-light-blue mt-3 flex flex-wrap items-center gap-3 text-sm">
							<span class="flex items-center gap-2">
								{#if slot.trainer_avatar_url}
									<img class="h-6 w-6 rounded-full" alt="" src={slot.trainer_avatar_url} />
								{/if}
								{slot.trainer_username ?? 'À définir'}
							</span>
							<StateBadge badge={statusBadge(slot.status)} icon={SLOT_STATUS_ICONS[slot.status]} />
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
