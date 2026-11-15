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
	import type { TrainingListItem } from '@davincibot/lib';
	import { Plus } from '@lucide/svelte';

	const noop = () => undefined;

	interface Props {
		trainings?: TrainingListItem[];
		trainingDbInfo: DBInfo;
		onTrainingRowClick?: (row: TableRow) => void;
		trainingFilters?: Filter[];
		trainingTableTopic?: string;
		parseTrainingItems: ParseItems;
		onAddTraining?: () => void;
		onEditTraining?: (training: TrainingListItem) => void;
	}

	let {
		onAddTraining = noop,
		onTrainingRowClick,
		parseTrainingItems,
		trainingDbInfo,
		trainingFilters = [],
		trainingTableTopic = ''
	}: Props = $props();

	const columns: TableColumn[] = [
		{ key: 'name', label: 'Nom', sortable: true },
		{ key: 'category', label: 'Catégorie', sortable: true, csv: (row) => stateBadgeLabel(row[1]) },
		{ key: 'description', label: 'Description' }
	];
</script>

<div class="mb-8">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">
				Formations types
			</h2>
			<p class="text-dark-light-blue/70 mt-1 text-xs">
				Les contenus de référence dont héritent les sessions.
			</p>
		</div>
		<Button
			class="mr-2"
			aria-label="Ajouter une formation"
			onclick={onAddTraining}
			size="md"
			variant="primary"
		>
			<Plus class="size-4 shrink-0" />
			<span class="hidden sm:block">Ajouter une formation</span>
		</Button>
	</div>

	<div class="border-rule bg-blue-gray/15 block rounded-lg border">
		<Table
			{columns}
			dbInfo={trainingDbInfo}
			filters={trainingFilters}
			onRowClick={onTrainingRowClick}
			pageSize={5}
			parseItems={parseTrainingItems}
			refreshTopic={trainingTableTopic}
			searchable="name"
		/>
	</div>
</div>
