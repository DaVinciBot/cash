<script lang="ts">
	import {
		CTAButton,
		Table,
		type Action,
		type DBInfo,
		type Filter,
		type ParseItems
	} from '@davincibot/components';
	import type { TrainingListItem, TrainingSlotListItem } from '@davincibot/lib';

	const noop = () => undefined;
	const noopSlot: (slot: TrainingSlotListItem) => void = () => undefined;

	interface Props {
		slots?: TrainingSlotListItem[];
		statusOptions?: { value: string; text: string }[];
		slotDbInfo: DBInfo;
		slotActions?: Action[];
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
		statusOptions = [],
		slotDbInfo,
		slotActions = [],
		slotFilters = [],
		slotTableTopic = '',
		parseSlotItems,
		onAddSlot = noop,
		onEditSlot = noopSlot,
		formatSlotDate,
		findTrainingName,
		trainings = []
	}: Props = $props();
</script>

<section class="border-light-blue/10 bg-dark-blue/80 rounded-[28px] border p-5 sm:p-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<h2 class="text-xl font-semibold text-white">Sessions de formation</h2>
			<p class="text-light-blue/70 text-sm">Planifiez, suivez et ajustez les sessions.</p>
		</div>
		<div class="flex flex-col sm:w-40 sm:flex-row sm:flex-wrap">
			<CTAButton onclick={onAddSlot} size="sm" type="button" variant="secondary">Ajouter</CTAButton>
		</div>
	</div>

	<div class="border-light-blue/10 mt-6 overflow-hidden rounded-2xl border">
		<div class="hidden md:block">
			<Table
				actions={slotActions}
				dbInfo={slotDbInfo}
				emptyMessage="Aucune session"
				filters={slotFilters}
				headers={['Début', 'Formation', 'Formateur·ice', 'Statut', 'Actions']}
				parseItems={parseSlotItems}
				refreshTopic={slotTableTopic}
				searchable="training.name"
				size={10}
			/>
		</div>
		<div class="md:hidden">
			{#if slots.length === 0}
				<p class="text-light-blue/70 px-4 py-6 text-center text-sm">Aucune session</p>
			{:else}
				<div class="grid gap-3 p-4">
					{#each slots as slot (slot.slot_id)}
						<article class="border-light-blue/10 bg-dark-blue/90 rounded-2xl border p-4">
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="text-base font-semibold text-white">{formatSlotDate(slot.start)}</p>
									<p class="text-light-blue/70 mt-1 text-sm">
										{findTrainingName(slot.training_id, trainings)}
									</p>
								</div>
								<button
									class="text-light-blue/70 text-xs tracking-[0.2em] uppercase hover:text-white"
									onclick={() => {
										onEditSlot(slot);
									}}
								>
									Editer
								</button>
							</div>
							<div class="text-light-blue/70 mt-3 flex flex-wrap items-center gap-3 text-sm">
								<div class="flex items-center gap-2">
									{#if slot.trainer_avatar_url}
										<img
											class="h-6 w-6 rounded-full"
											alt={slot.trainer_username ?? 'Formateur·ice'}
											src={slot.trainer_avatar_url}
										/>
									{/if}
									<span>{slot.trainer_username ?? 'A definir'}</span>
								</div>
								<span class="border-light-blue/20 rounded-full border px-3 py-1 text-xs uppercase">
									{statusOptions.find((opt) => opt.value === slot.status)?.text ?? slot.status}
								</span>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>
