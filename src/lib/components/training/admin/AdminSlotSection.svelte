<script lang="ts">
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { statusBadge, stateBadgeLabel } from '$lib/helpers/trainingTables';
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
			<h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
				Sessions de formation
			</h2>
			<p class="mt-1 text-xs text-gray-500">Planifiez, suivez et ajustez les sessions.</p>
		</div>
		<button
			class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
			onclick={onAddSlot}
			type="button">Ajouter</button
		>
	</div>

	<!-- La table paginée reste au clavier et à la souris ; sous 768 px elle
	     déborderait, d'où la même liste rendue en cartes. -->
	<div class="hidden rounded-lg border border-gray-700 bg-gray-800 md:block">
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
				class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400"
			>
				Aucune session
			</p>
		{:else}
			<ul class="space-y-2">
				{#each slots as slot (slot.slot_id)}
					<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="font-medium text-white">{formatSlotDate(slot.start)}</p>
								<p class="mt-1 text-sm text-gray-400">
									{findTrainingName(slot.training_id, trainings)}
								</p>
							</div>
							<button
								class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
								onclick={() => {
									onEditSlot(slot);
								}}
								type="button">Éditer</button
							>
						</div>
						<div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
							<span class="flex items-center gap-2">
								{#if slot.trainer_avatar_url}
									<img class="h-6 w-6 rounded-full" alt="" src={slot.trainer_avatar_url} />
								{/if}
								{slot.trainer_username ?? 'À définir'}
							</span>
							<StateBadge badge={statusBadge(slot.status)} />
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
