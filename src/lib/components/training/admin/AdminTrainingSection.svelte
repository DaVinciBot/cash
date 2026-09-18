<script lang="ts">
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { categoryBadge, stateBadgeLabel } from '$lib/helpers/trainingTables';
	import { TRAINING_CATEGORY_ICONS } from '$lib/helpers/trainingOptions';
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
			<h2 class="text-dark-light-blue text-sm font-semibold tracking-wide uppercase">
				Formations types
			</h2>
			<p class="text-dark-light-blue/70 mt-1 text-xs">
				Les contenus de référence dont héritent les sessions.
			</p>
		</div>
		<button
			class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
			onclick={onAddTraining}
			type="button">Ajouter</button
		>
	</div>

	<div class="border-light-blue/20 bg-blue-gray/15 hidden rounded-lg border md:block">
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
				class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
			>
				Aucune formation
			</p>
		{:else}
			<ul class="space-y-2">
				{#each trainings as training (training.training_id)}
					<li class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-medium text-white">{training.name}</span>
									<StateBadge
										badge={categoryBadge(training.category)}
										icon={TRAINING_CATEGORY_ICONS[training.category]}
									/>
								</div>
								<p class="text-dark-light-blue mt-1 text-sm">
									{training.description ?? 'Aucune description'}
								</p>
							</div>
							<button
								class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-xl border px-3 py-1.5 text-sm"
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
