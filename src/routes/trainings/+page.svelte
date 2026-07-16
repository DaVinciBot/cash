<script lang="ts">
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import Spinner from '$lib/components/share/Spinner.svelte';
	import AdminHeader from '$lib/components/training/admin/AdminHeader.svelte';
	import AdminSlotSection from '$lib/components/training/admin/AdminSlotSection.svelte';
	import AdminTrainingSection from '$lib/components/training/admin/AdminTrainingSection.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';
	import { getParisDateKey, parseParisDatetimeLocal } from '$lib/helpers/parisTime';
	import {
		buildSlotFields,
		buildSummaryFields,
		buildTrainingFields,
		type ProfileOption,
		type SlotFieldsConfig
	} from '$lib/helpers/trainingForms';
	import { categoryOptions, statusOptions } from '$lib/helpers/trainingOptions';
	import {
		createSlotTableItems,
		createTrainingTableItems,
		findTrainingName,
		formatSlotDate
	} from '$lib/helpers/trainingTables';
	import {
		createTraining,
		createTrainingSlot,
		getTrainingList,
		getTrainingSlots,
		updateTraining,
		updateTrainingSlot,
		type SlotStatus,
		type TrainingCategory,
		type TrainingListItem,
		type TrainingSlotListItem,
		type UpdateTrainingSlotPayload
	} from '$lib/services/training';
	import { triggerTableRefresh } from '$lib/store';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { CrudField } from '$lib/types/crud';
	import { onMount } from 'svelte';

	function getFormString(formData: FormData, key: string): string {
		const val = formData.get(key);
		return typeof val === 'string' ? val : '';
	}

	let trainings: TrainingListItem[] = $state([]);
	let slots: TrainingSlotListItem[] = $state([]);
	let profiles: ProfileOption[] = [];
	let loading = $state<boolean>(false);
	let error: string | null = $state(null);
	let formError: string | null = $state(null);

	let showTrainingModal = $state<boolean>(false);
	let showSlotModal = $state<boolean>(false);
	let editingTraining = $state<TrainingListItem | null>(null);
	let editingSlot = $state<TrainingSlotListItem | null>(null);
	let trainingFields = $state<CrudField[]>([]);
	let slotFields = $state<CrudField[]>([]);
	let selectedTrainerId: string | null = $state(null);
	let selectedTrainingId: number | null = $state(null);
	let summaryFrom = '';
	let summaryTo = '';
	let summaryText = '';
	let summarySending = $state<boolean>(false);
	let summaryError: string | null = $state(null);
	let showSummaryModal = $state<boolean>(false);
	let summaryFields = $state<CrudField[]>([]);

	const defaultSummaryText = `# Formations de la semaine {emoji_dvb}
:wave: Hello {member_tag} :blue_heart: !

Voici une synthèse des formations prévues du {from} au {to} : {nb} formation{s} prévue{s}, pour s'inscrire ça se passe [**sur le site ouais ouais**](https://davincibot.fr/formation) !

:warning: Si tu ne peux plus venir, n'oublie pas de te désinscrire pour libérer la place.

:arrow_right: Si tu souhaites une formation en particulier tu peux faire une demande [**ici**](https://forms.office.com/e/KKeQs53RAu?origin=lprLink)

DVBisous ! :robot:`;

	const slotRangeDays = 120;
	const trainingTableTopic = 'admin-trainings';
	const slotTableTopic = 'admin-slots';
	const trainingDbInfo = {
		table: 'training',
		key: 'id,name,category,description,prerequisites',
		ordering: 'name:asc'
	};
	const slotDbInfo = {
		table: 'training_slot',
		key: 'id,training_id,custom_name,custom_description,custom_prerequisites,start,duration_hours,on_site_seats,remote_seats,location,video_conference_link,excusable,status,trainer_id,training!inner(name,description,prerequisites,category),profiles!slot_trainer_id_fkey(username,avatar_url)',
		ordering: 'start:desc'
	};
	let trainingIndex = new Map<number, TrainingListItem>();
	let slotIndex = new Map<number, TrainingSlotListItem>();

	async function searchProfiles(search: string) {
		const supabaseClient = getSupabaseBrowserClient();
		const { data, error } = await supabaseClient
			.from('profiles')
			.select('id, username, avatar_url')
			.ilike('username', `%${search}%`)
			.range(0, 4);

		if (error) {
			return [];
		}

		return data.map(
			(profile: { id: string; username: string | null; avatar_url: string | null }) => ({
				id: profile.id,
				value: profile.id,
				text: profile.username ?? 'Membre',
				image: profile.avatar_url ?? undefined
			})
		);
	}

	async function searchTrainings(search: string) {
		const supabaseClient = getSupabaseBrowserClient();
		const { data, error } = await supabaseClient
			.from(trainingDbInfo.table)
			.select('id, name')
			.ilike('name', `%${search}%`)
			.order('name')
			.range(0, 6);

		if (error) {
			return [];
		}

		return data.map((training: { id: number; name: string }) => ({
			id: training.id,
			value: String(training.id),
			text: training.name
		}));
	}

	async function loadProfiles() {
		const supabaseClient = getSupabaseBrowserClient();
		const { data, error: profilesError } = await supabaseClient
			.from('profiles')
			.select('id, username, avatar_url')
			.order('username');
		if (profilesError) {
			throw profilesError;
		}
		profiles = data.map(
			(profile: { id: string; username: string | null; avatar_url: string | null }) => ({
				...profile,
				email: null
			})
		);
	}

	async function loadData() {
		const supabaseClient = getSupabaseBrowserClient();
		loading = true;
		error = null;
		try {
			const [trainingList, slotList] = await Promise.all([
				getTrainingList(supabaseClient),
				getTrainingSlots(supabaseClient, new Date(), slotRangeDays)
			]);
			trainings = trainingList;
			slots = slotList;
			await loadProfiles();
		} catch {
			error = "Impossible de charger l'espace admin.";
		} finally {
			loading = false;
		}
	}

	function openTrainingModal(training: TrainingListItem | null = null) {
		formError = null;
		editingTraining = training;
		trainingFields = buildTrainingFields(training);
		showTrainingModal = true;
	}

	function openSlotModal(slot: TrainingSlotListItem | null = null) {
		formError = null;
		editingSlot = slot;
		selectedTrainerId = slot?.trainer_id ?? null;
		selectedTrainingId = slot?.training_id ?? null;
		const rebuildSlotFields = (nextTrainingId: number | null) => {
			const previousFields = slotFields;
			const nextConfig: SlotFieldsConfig = {
				slot,
				trainings,
				profiles,
				searchTrainings,
				searchProfiles,
				selectedTrainingId: nextTrainingId,
				onTrainerChange: (nextId: string | null) => {
					selectedTrainerId = nextId;
				},
				onTrainingChange: (nextId: number | null) => {
					selectedTrainingId = nextId;
					rebuildSlotFields(nextId);
				}
			};
			const nextFields = buildSlotFields(nextConfig);

			const previousById = new Map(
				previousFields.filter((field) => field.id).map((field) => [field.id, field])
			);

			slotFields = nextFields.map((nextField): CrudField => {
				const field: CrudField = nextField;
				const previous = field.id ? previousById.get(field.id) : null;
				if (!previous || field.id === 'training_id') {
					return field;
				}
				if (previous.value !== undefined) {
					field.value = previous.value;
				}
				if (previous.checked !== undefined) {
					field.checked = previous.checked;
				}
				if (previous.data !== undefined) {
					field.data = previous.data;
				}
				if (previous.image !== undefined) {
					field.image = previous.image;
				}
				return field;
			});
			selectedTrainingId = nextTrainingId;
		};
		const slotConfig: SlotFieldsConfig = {
			slot,
			trainings,
			profiles,
			searchTrainings,
			searchProfiles,
			selectedTrainingId,
			onTrainerChange: (nextId: string | null) => {
				selectedTrainerId = nextId;
			},
			onTrainingChange: (nextId: number | null) => {
				selectedTrainingId = nextId;
				rebuildSlotFields(nextId);
			}
		};
		slotFields = buildSlotFields(slotConfig);
		showSlotModal = true;
	}

	function closeTrainingModal() {
		showTrainingModal = false;
		editingTraining = null;
		trainingFields = [];
	}

	function closeSlotModal() {
		showSlotModal = false;
		editingSlot = null;
		selectedTrainerId = null;
		selectedTrainingId = null;
		slotFields = [];
	}

	function openSummaryModal() {
		summaryError = null;
		summaryText = defaultSummaryText;
		summaryFields = buildSummaryFields({
			from: summaryFrom,
			to: summaryTo,
			text: summaryText
		});
		showSummaryModal = true;
	}

	function closeSummaryModal() {
		showSummaryModal = false;
		summaryFields = [];
	}

	async function handleTrainingSubmit(event: Event) {
		const supabaseClient = getSupabaseBrowserClient();
		event.preventDefault();
		const form = document.querySelector<HTMLFormElement>('#TrainingModal form');
		if (!form) {
			return;
		}
		const formData = new FormData(form);
		const name = getFormString(formData, 'name').trim();
		const category = getFormString(formData, 'category');
		const description = getFormString(formData, 'description').trim() || null;
		const prerequisites = getFormString(formData, 'prerequisites').trim() || null;

		if (!name || !category) {
			formError = 'Nom et catégorie obligatoires.';
			return;
		}

		try {
			if (editingTraining) {
				await updateTraining(supabaseClient, editingTraining.training_id, {
					name,
					category: category as TrainingCategory,
					description,
					prerequisites
				});
			} else {
				await createTraining(supabaseClient, {
					name,
					category: category as TrainingCategory,
					description,
					prerequisites
				});
			}
			await loadData();
			triggerTableRefresh(trainingTableTopic);
			closeTrainingModal();
		} catch {
			formError = "Impossible d'enregistrer la formation.";
		}
	}

	async function handleSlotSubmit(event: Event) {
		const supabaseClient = getSupabaseBrowserClient();
		event.preventDefault();
		const form = document.querySelector<HTMLFormElement>('#SlotModal form');
		if (!form) {
			return;
		}
		const formData = new FormData(form);
		const trainingField = slotFields.find((field) => field.id === 'training_id');
		const trainingFromField = trainingField?.data ?? null;
		const trainingFromForm = Number(formData.get('training_id'));
		const trainingCandidate =
			selectedTrainingId ??
			(trainingFromField !== null && trainingFromField !== ''
				? Number(trainingFromField)
				: trainingFromForm);
		const trainingId = Number.isNaN(trainingCandidate) ? 0 : trainingCandidate;
		const startInput = getFormString(formData, 'start');
		const duration = Number(formData.get('duration_hours'));
		const statusStr = getFormString(formData, 'status') || 'draft';
		const status = statusStr as SlotStatus;
		const onSiteSeatsRaw = getFormString(formData, 'on_site_seats');
		const remoteSeatsRaw = getFormString(formData, 'remote_seats');
		const location = getFormString(formData, 'location').trim() || null;
		const videoLink = getFormString(formData, 'video_conference_link').trim() || null;
		const excusable = formData.has('excusable');
		const startIso = startInput ? parseParisDatetimeLocal(startInput) : '';
		const onSiteSeats = onSiteSeatsRaw === '' ? null : Number(onSiteSeatsRaw);
		const remoteSeats = remoteSeatsRaw === '' ? null : Number(remoteSeatsRaw);
		const trainerId = selectedTrainerId ?? '';
		const customName = getFormString(formData, 'custom_name').trim() || null;
		const customDescription = getFormString(formData, 'custom_description').trim() || null;
		const customPrerequisites = getFormString(formData, 'custom_prerequisites').trim() || null;
		const baseTraining = trainings.find((training) => training.training_id === trainingId) ?? null;
		const baseName = baseTraining?.name ?? null;
		const baseDescription = baseTraining?.description ?? null;
		const basePrerequisites = baseTraining?.prerequisites ?? null;

		if (!trainingId || !startIso || !duration || !trainerId) {
			formError = 'Formation, formateur·ice, date et durée sont obligatoires.';
			return;
		}

		try {
			if (editingSlot) {
				const updates: UpdateTrainingSlotPayload & {
					custom_name?: string | null;
					custom_description?: string | null;
					custom_prerequisites?: string | null;
				} = {
					training_id: trainingId,
					trainer_id: trainerId,
					start: startIso,
					duration_hours: duration,
					on_site_seats: onSiteSeats,
					remote_seats: remoteSeats,
					location,
					video_conference_link: videoLink,
					excusable,
					status
				};
				if (customName && customName !== baseName) {
					updates.custom_name = customName;
				}
				if (customDescription && customDescription !== baseDescription) {
					updates.custom_description = customDescription;
				}
				if (customPrerequisites && customPrerequisites !== basePrerequisites) {
					updates.custom_prerequisites = customPrerequisites;
				}

				await updateTrainingSlot(supabaseClient, editingSlot.slot_id, {
					...updates
				});
			} else {
				await createTrainingSlot(supabaseClient, {
					training_id: trainingId,
					custom_name: customName && customName !== baseName ? customName : null,
					custom_description:
						customDescription && customDescription !== baseDescription ? customDescription : null,
					custom_prerequisites:
						customPrerequisites && customPrerequisites !== basePrerequisites
							? customPrerequisites
							: null,
					trainer_id: trainerId,
					start: startIso,
					duration_hours: duration,
					on_site_seats: onSiteSeats,
					remote_seats: remoteSeats,
					location,
					video_conference_link: videoLink,
					excusable,
					status
				});
			}
			await loadData();
			triggerTableRefresh(slotTableTopic);
			closeSlotModal();
		} catch {
			formError = "Impossible d'enregistrer le slot.";
		}
	}

	function parseTrainingItems(data: unknown[]) {
		const { index, rows } = createTrainingTableItems(
			data as Parameters<typeof createTrainingTableItems>[0]
		);
		trainingIndex = index;
		return rows;
	}

	function parseSlotItems(data: unknown[]) {
		const { index, rows } = createSlotTableItems(
			data as Parameters<typeof createSlotTableItems>[0]
		);
		slotIndex = index;
		return rows;
	}

	async function sendDiscordSummary(config?: {
		from?: string;
		to?: string;
		text?: string;
		mode?: 'test' | 'live';
	}) {
		summaryError = null;
		const from = config?.from ?? summaryFrom;
		const to = config?.to ?? summaryTo;
		const text = config?.text ?? summaryText;
		const mode = config?.mode ?? 'live';
		if (!from || !to) {
			summaryError = 'Sélectionnez une date de début et une date de fin.';
			return false;
		}
		if (from > to) {
			summaryError = 'La date de début doit être avant la date de fin.';
			return false;
		}
		summarySending = true;
		try {
			const supabaseClient = getSupabaseBrowserClient();
			const cleanText = text.trim();
			const { error: invokeError } = await supabaseClient.functions.invoke('discord-summary', {
				body: {
					from,
					to,
					mode,
					...(cleanText ? { text: cleanText } : {})
				}
			});
			if (invokeError) {
				summaryError =
					"Impossible de déclencher le webhook. Assurez-vous qu'il y a des formations prévues dans la période sélectionnée et réessayez.";
				return false;
			}
			return true;
		} catch {
			summaryError =
				mode === 'test'
					? "Impossible d'envoyer le test webhook."
					: 'Impossible de déclencher le webhook.';
			return false;
		} finally {
			summarySending = false;
		}
	}

	async function handleSummarySubmit(event: Event) {
		event.preventDefault();
		if (summarySending) {
			return;
		}
		const form = document.querySelector<HTMLFormElement>('#SummaryModal form');
		if (!form) {
			return;
		}
		const formData = new FormData(form);
		const from = getFormString(formData, 'summary_from');
		const to = getFormString(formData, 'summary_to');
		const text = getFormString(formData, 'summary_text').trim();
		summaryFrom = from;
		summaryTo = to;
		summaryText = text;

		const testSent = await sendDiscordSummary({
			from,
			to,
			text,
			mode: 'test'
		});
		if (!testSent) {
			return;
		}

		const shouldSendLive = window.confirm(
			'Test envoyé sans ping sur le webhook de test. Envoyer maintenant la synthèse sur le webhook réel ?'
		);
		if (!shouldSendLive) {
			closeSummaryModal();
			return;
		}

		const liveSent = await sendDiscordSummary({ from, to, text, mode: 'live' });
		if (liveSent) {
			closeSummaryModal();
		}
	}

	const trainingActions = [
		{
			title: 'Editer',
			type: 'view',
			handler: (event: Event) => {
				const id = Number(
					(event.target as HTMLElement | null)?.closest('tr')?.querySelector('th')?.dataset.utils
				);
				const training =
					trainingIndex.get(id) ?? trainings.find((item) => item.training_id === id) ?? null;
				if (training) {
					openTrainingModal(training);
				}
			}
		}
	];

	const slotActions = [
		{
			title: 'Editer',
			type: 'view',
			handler: (event: Event) => {
				const id = Number(
					(event.target as HTMLElement | null)?.closest('tr')?.querySelector('th')?.dataset.utils
				);
				const slot = slotIndex.get(id) ?? slots.find((item) => item.slot_id === id) ?? null;
				if (slot) {
					openSlotModal(slot);
				}
			}
		}
	];

	const trainingFilters = [
		{
			category: 'Catégorie',
			value: 'category',
			options: categoryOptions.map((opt) => ({ value: opt.value, name: opt.text }))
		}
	];

	const slotFilters = [
		{
			category: 'Statut',
			value: 'status',
			options: statusOptions.map((opt) => ({ value: opt.value, name: opt.text }))
		}
	];

	const upcomingSlots = $derived(slots.filter((slot) => new Date(slot.start) >= new Date()));
	const draftSlots = $derived(slots.filter((slot) => slot.status === 'draft'));

	onMount(() => {
		if (!summaryFrom) {
			summaryFrom = getParisDateKey(new Date());
		}
		if (!summaryTo) {
			summaryTo = getParisDateKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
		}
		if (!summaryText) {
			summaryText = defaultSummaryText;
		}
		void loadData();
	});
</script>

<section class="px-4 py-6 sm:px-6 sm:py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
		<section class="border-light-blue/10 bg-dark-blue/70 rounded-[22px] border p-4 sm:p-5">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-base font-semibold text-white">Calendrier public</h2>
					<p class="text-light-blue/60 text-xs">Consulter les formations publiées.</p>
				</div>
				<CTAButton href="/formation" variant="secondary" size="sm" fullWidth={false}>
					Voir le calendrier
				</CTAButton>
			</div>
		</section>

		<AdminHeader
			trainingsCount={trainings.length}
			upcomingCount={upcomingSlots.length}
			draftCount={draftSlots.length}
			{slotRangeDays}
			onAddTraining={() => {
				openTrainingModal();
			}}
			onAddSlot={() => {
				openSlotModal();
			}}
		/>

		<section class="border-light-blue/10 bg-dark-blue/70 rounded-[22px] border p-4 sm:p-5">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-base font-semibold text-white">Discord</h2>
					<p class="text-light-blue/60 text-xs">Synthèse des formations.</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<CTAButton
						type="button"
						variant={summarySending ? 'disabled' : 'primary'}
						size="sm"
						fullWidth={false}
						disabled={summarySending}
						onclick={openSummaryModal}
					>
						{summarySending ? 'Envoi...' : 'Configurer & envoyer'}
					</CTAButton>
				</div>
			</div>
			{#if summaryError}
				<p class="text-waiting mt-3 text-sm">{summaryError}</p>
			{/if}
		</section>

		{#if loading}
			<Spinner
				divClass="rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-light-blue/80"
			>
				Chargement des données
			</Spinner>
		{:else if error}
			<div
				class="border-light-blue/20 bg-dark-blue/80 text-waiting flex flex-col items-center justify-center gap-3 rounded-[26px] border p-10"
			>
				<p class="text-sm">{error}</p>
				<CTAButton type="button" variant="peps" size="sm" onclick={loadData}>Réessayer</CTAButton>
			</div>
		{:else}
			{#if formError}
				<p class="text-waiting text-sm">{formError}</p>
			{/if}

			<div class="grid gap-8">
				<AdminSlotSection
					{slots}
					{statusOptions}
					{slotDbInfo}
					{slotActions}
					{slotFilters}
					{slotTableTopic}
					{parseSlotItems}
					{formatSlotDate}
					{findTrainingName}
					{trainings}
					onAddSlot={() => {
						openSlotModal();
					}}
					onEditSlot={(slot: TrainingSlotListItem) => {
						openSlotModal(slot);
					}}
				/>
				<AdminTrainingSection
					{trainings}
					{categoryOptions}
					{trainingDbInfo}
					{trainingActions}
					{trainingFilters}
					{trainingTableTopic}
					{parseTrainingItems}
					onAddTraining={() => {
						openTrainingModal();
					}}
					onEditTraining={(training: TrainingListItem) => {
						openTrainingModal(training);
					}}
				/>
			</div>
		{/if}
	</div>
</section>

{#if showSlotModal}
	<CrudForm
		id="SlotModal"
		type="session"
		type_accord="une"
		action={editingSlot ? 'Modifier' : 'Ajouter'}
		fields={slotFields}
		onClose={closeSlotModal}
		onSubmit={handleSlotSubmit}
	/>
{/if}

{#if showTrainingModal}
	<CrudForm
		id="TrainingModal"
		type="formation"
		type_accord="une"
		action={editingTraining ? 'Modifier' : 'Ajouter'}
		fields={trainingFields}
		onClose={closeTrainingModal}
		onSubmit={handleTrainingSubmit}
	/>
{/if}

{#if showSummaryModal}
	<CrudForm
		id="SummaryModal"
		type="synthese"
		type_accord="une"
		action="Envoyer"
		title="Envoyer la synthèse Discord"
		submitting={summarySending}
		submitLoadingLabel="Envoi..."
		fields={summaryFields}
		onClose={closeSummaryModal}
		onSubmit={handleSummarySubmit}
	/>
{/if}
