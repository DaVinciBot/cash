<script lang="ts">
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { categoryBadge } from '$lib/helpers/trainingTables';
	import {
		Table,
		type Action,
		type DBInfo,
		type Filter,
		type ParseItems
	} from '@davincibot/components';
	import type { TrainingListItem } from '@davincibot/lib';

	const noop = () => undefined;
	const noopTraining: (training: TrainingListItem) => void = () => undefined;

	interface Props {
		trainings?: TrainingListItem[];
		trainingDbInfo: DBInfo;
		trainingActions?: Action[];
		trainingFilters?: Filter[];
		trainingTableTopic?: string;
		parseTrainingItems: ParseItems;
		onAddTraining?: () => void;
		onEditTraining?: (training: TrainingListItem) => void;
	}

	let {
		trainings = [],
		trainingDbInfo,
		trainingActions = [],
		trainingFilters = [],
		trainingTableTopic = '',
		parseTrainingItems,
		onAddTraining = noop,
		onEditTraining = noopTraining
	}: Props = $props();
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
			actions={trainingActions}
			dbInfo={trainingDbInfo}
			emptyMessage="Aucune formation"
			filters={trainingFilters}
			headers={['Nom', 'Catégorie', 'Description', 'Actions']}
			parseItems={parseTrainingItems}
			refreshTopic={trainingTableTopic}
			searchable="name"
			size={5}
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
