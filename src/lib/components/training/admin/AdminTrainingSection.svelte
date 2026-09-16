<script lang="ts">
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { categoryBadge, stateBadgeLabel } from '$lib/helpers/trainingTables';
	import {
		Table,
		type DBInfo,
		type Filter,
		type ParseItems,
		type TableColumn,
		type TableRow
	} from '@davincibot/components';
	import type { TrainingListItem } from '@davincibot/lib';

	const noop = () => undefined;
	const noopTraining: (training: TrainingListItem) => void = () => undefined;

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
		trainings = [],
		trainingDbInfo,
		onTrainingRowClick,
		trainingFilters = [],
		trainingTableTopic = '',
		parseTrainingItems,
		onAddTraining = noop,
		onEditTraining = noopTraining
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
			<h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">Formations types</h2>
			<p class="mt-1 text-xs text-gray-500">
				Les contenus de référence dont héritent les sessions.
			</p>
		</div>
		<button
			class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
			onclick={onAddTraining}
			type="button">Ajouter</button
		>
	</div>

	<div class="hidden rounded-lg border border-gray-700 bg-gray-800 md:block">
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

	<div class="md:hidden">
		{#if trainings.length === 0}
			<p
				class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400"
			>
				Aucune formation
			</p>
		{:else}
			<ul class="space-y-2">
				{#each trainings as training (training.training_id)}
					<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-medium text-white">{training.name}</span>
									<StateBadge badge={categoryBadge(training.category)} />
								</div>
								<p class="mt-1 text-sm text-gray-400">
									{training.description ?? 'Aucune description'}
								</p>
							</div>
							<button
								class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
								onclick={() => {
									onEditTraining(training);
								}}
								type="button">Éditer</button
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
