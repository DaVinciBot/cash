<script lang="ts">
	import {
		CTAButton,
		Table,
		type Action,
		type DBInfo,
		type Filter,
		type ParseItems
	} from '@davincibot/components';
	import type { TrainingListItem } from '@davincibot/lib';

	const noop = () => undefined;
	const noopTraining: (training: TrainingListItem) => void = () => undefined;

	interface AdminTrainingSectionProps {
		trainings?: TrainingListItem[];
		categoryOptions?: { value: string; text: string; selected?: boolean }[];
		trainingDbInfo: DBInfo;
		trainingActions?: Action[];
		trainingFilters?: Filter[];
		trainingTableTopic?: string;
		parseTrainingItems: ParseItems;
		onAddTraining?: () => void;
		onEditTraining?: (training: TrainingListItem) => void;
	}

	const {
		trainings = [],
		categoryOptions = [],
		trainingDbInfo,
		trainingActions = [],
		trainingFilters = [],
		trainingTableTopic = '',
		parseTrainingItems,
		onAddTraining = noop,
		onEditTraining = noopTraining
	}: AdminTrainingSectionProps = $props();
</script>

<section class="border-light-blue/10 bg-dark-blue/80 rounded-[28px] border p-5 sm:p-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<h2 class="text-xl font-semibold text-white">Formations types</h2>
			<p class="text-light-blue/70 text-sm">Gérez les contenus de référence pour les sessions.</p>
		</div>
		<div class="flex flex-col sm:w-40 sm:flex-row sm:flex-wrap">
			<CTAButton onclick={onAddTraining} size="sm" type="button" variant="secondary">
				Ajouter
			</CTAButton>
		</div>
	</div>

	<div class="border-light-blue/10 mt-6 overflow-hidden rounded-xl border">
		<div class="hidden md:block">
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
				<p class="text-light-blue/70 px-4 py-6 text-center text-sm">Aucune formation</p>
			{:else}
				<div class="grid gap-3 p-4">
					{#each trainings as training (training.training_id)}
						<article class="border-light-blue/10 bg-dark-blue/90 rounded-2xl border p-4">
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="text-base font-semibold text-white">{training.name}</p>
									<p class="text-light-blue/60 mt-1 text-xs tracking-[0.2em] uppercase">
										{categoryOptions.find((opt) => opt.value === training.category)?.text ??
											'Autre'}
									</p>
								</div>
								<button
									class="text-light-blue/70 text-xs tracking-[0.2em] uppercase hover:text-white"
									onclick={() => {
										onEditTraining(training);
									}}
								>
									Editer
								</button>
							</div>
							<p class="text-light-blue/70 mt-3 text-sm">
								{training.description ?? 'Aucune description'}
							</p>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>
