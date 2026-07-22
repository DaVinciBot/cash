<script lang="ts">
	import { Checkbox } from '@davincibot/components';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import {
		MAX_REPORT_IMAGES,
		MAX_REPORT_TOTAL_BYTES,
		REPORT_TYPES,
		submitReport,
		TOTAL_SIZE_MESSAGE,
		validateReportImage,
		type ReportType
	} from '@davincibot/lib/settings';
	import { userdata, type UserData } from '@davincibot/lib';
	import { ChevronDown, ImagePlus, X } from '@lucide/svelte';
	import { onDestroy } from 'svelte';

	let user = $state<UserData>(null);
	let type = $state<ReportType>('bug');
	let title = $state('');
	let description = $state('');
	let images = $state<{ file: File; preview: string }[]>([]);
	let anonymous = $state<boolean>(false);
	let submitting = $state<boolean>(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	const unsubscribe = userdata.subscribe((value) => {
		user = value;
	});
	onDestroy(() => {
		unsubscribe();
		for (const image of images) {
			URL.revokeObjectURL(image.preview);
		}
	});

	function handleFilesChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		errorMessage = '';
		successMessage = '';
		for (const file of files) {
			if (images.length >= MAX_REPORT_IMAGES) {
				errorMessage = `${String(MAX_REPORT_IMAGES)} images maximum`;
				return;
			}
			const invalidReason = validateReportImage(file);
			if (invalidReason) {
				errorMessage = invalidReason;
				continue;
			}
			const totalBytes = images.reduce((sum, image) => sum + image.file.size, 0);
			if (totalBytes + file.size > MAX_REPORT_TOTAL_BYTES) {
				errorMessage = TOTAL_SIZE_MESSAGE;
				continue;
			}
			images.push({ file, preview: URL.createObjectURL(file) });
		}
	}

	function removeImage(index: number) {
		const [removed] = images.splice(index, 1);
		if (removed) {
			URL.revokeObjectURL(removed.preview);
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!user || submitting) {
			return;
		}
		errorMessage = '';
		successMessage = '';
		const trimmedTitle = title.trim();
		const trimmedDescription = description.trim();
		if (!trimmedTitle || !trimmedDescription) {
			errorMessage = 'Le titre et la description sont requis';
			return;
		}
		submitting = true;
		try {
			await submitReport(user.id, {
				type,
				title: trimmedTitle,
				description: trimmedDescription,
				images: images.map((image) => image.file),
				anonymous
			});
			for (const image of images) {
				URL.revokeObjectURL(image.preview);
			}
			images = [];
			type = 'bug';
			title = '';
			description = '';
			anonymous = false;
			successMessage = 'Signalement envoyé, merci !';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
		}
		submitting = false;
	}
</script>

<section class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
	<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
		<div>
			<label
				for="report-type"
				class="text-dark-light-blue mb-1.5 block text-[0.65rem] tracking-[0.32em] uppercase"
			>
				Type
			</label>
			<div class="relative">
				<select
					id="report-type"
					class="border-light-blue/30 bg-dark-blue/60 text-light-blue focus:border-light-blue/70 block w-full cursor-pointer appearance-none rounded-xl border p-2.5 pr-9 text-sm focus:outline-none disabled:opacity-50"
					disabled={submitting}
					bind:value={type}
				>
					{#each REPORT_TYPES as reportType (reportType.value)}
						<option value={reportType.value}>{reportType.label}</option>
					{/each}
				</select>
				<ChevronDown
					class="text-dark-light-blue pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
				/>
			</div>
		</div>

		<div>
			<label
				for="report-title"
				class="text-dark-light-blue mb-1.5 block text-[0.65rem] tracking-[0.32em] uppercase"
			>
				Titre
			</label>
			<input
				type="text"
				id="report-title"
				maxlength="200"
				placeholder="Résumé du problème"
				class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 block w-full rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
				disabled={submitting}
				bind:value={title}
			/>
		</div>

		<div>
			<label
				for="report-description"
				class="text-dark-light-blue mb-1.5 block text-[0.65rem] tracking-[0.32em] uppercase"
			>
				Description
			</label>
			<textarea
				id="report-description"
				maxlength="2000"
				rows="6"
				placeholder="Ce qui s'est passé, ce qui était attendu…"
				class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 block w-full resize-y rounded-xl border p-2.5 text-sm focus:outline-none disabled:opacity-50"
				disabled={submitting}
				bind:value={description}></textarea>
		</div>

		<div>
			<p class="text-dark-light-blue m-0 mb-1.5 text-[0.65rem] tracking-[0.32em] uppercase">
				Captures d'écran (optionnel, {MAX_REPORT_IMAGES} max)
			</p>
			<div class="flex flex-wrap gap-2">
				{#each images as image, index (image.preview)}
					<div class="relative">
						<img
							src={image.preview}
							alt="Aperçu {index + 1}"
							class="border-light-blue/20 size-20 rounded-xl border object-cover"
						/>
						<button
							type="button"
							class="bg-dark-blue border-light-blue/30 text-light-blue hover:border-light-blue/60 absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border transition"
							onclick={() => {
								removeImage(index);
							}}
							disabled={submitting}
							aria-label="Retirer l'image {index + 1}"
						>
							<X class="size-3.5" />
						</button>
					</div>
				{/each}
				{#if images.length < MAX_REPORT_IMAGES}
					<label
						class="border-light-blue/30 text-dark-light-blue hover:border-light-blue/60 hover:text-light-blue flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs font-semibold transition"
					>
						<ImagePlus class="size-5" />
						Ajouter
						<input
							type="file"
							accept="image/png, image/jpeg, image/webp"
							multiple
							class="hidden"
							disabled={submitting}
							onchange={handleFilesChange}
						/>
					</label>
				{/if}
			</div>
		</div>

		<label class="text-light-blue flex w-fit cursor-pointer items-center gap-2 text-sm">
			<Checkbox
				id="report-anonymous"
				bind:checked={anonymous}
				className="size-4"
				disabled={submitting}
			/>
			<span>Envoyer ce signalement anonymement</span>
		</label>

		{#if errorMessage}
			<p class="m-0 text-sm text-red-400">{errorMessage}</p>
		{/if}
		{#if successMessage}
			<p class="m-0 text-sm text-emerald-400">{successMessage}</p>
		{/if}

		<CtaButton
			type="submit"
			variant="secondary"
			size="sm"
			fullWidth={false}
			class="self-end"
			disabled={submitting}
		>
			{submitting ? 'Envoi…' : 'Envoyer'}
		</CtaButton>
	</form>
</section>
