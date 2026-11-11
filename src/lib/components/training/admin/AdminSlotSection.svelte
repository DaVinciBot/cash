<script lang="ts">
	import { Button } from '@davincibot/components';
	import { stateBadgeLabel } from '#lib/helpers/trainingTables.js';
	import {
		Table,
		type DBInfo,
		type Filter,
		type ParseItems,
		type TableColumn,
		type TableRow
	} from '@davincibot/components';
	import type { TrainingListItem, TrainingSlotListItem } from '@davincibot/lib';
	import { Plus } from '@lucide/svelte';

	const noop = () => undefined;

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
		onAddSlot = noop,
		onSlotRowClick,
		parseSlotItems,
		slotDbInfo,
		slotFilters = [],
		slotTableTopic = ''
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
		<Button
			class="mr-2"
			aria-label="Ajouter une session"
			onclick={onAddSlot}
			size="md"
			variant="primary"
		>
			<Plus class="size-4 shrink-0" />
			<span class="hidden sm:block">Ajouter une session</span>
		</Button>
	</div>

	<div class="border-rule bg-blue-gray/15 block rounded-lg border">
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
</div>
