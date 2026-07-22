<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { Checkbox } from '@davincibot/components';
	import type {
		AutocompleteCompletion,
		CrudField,
		DocumentPreview,
		FieldValue
	} from '@davincibot/lib';

	type SubmitEventHandler = (event: MouseEvent) => void | Promise<void>;
	type CloseEventHandler = (event: MouseEvent) => void | Promise<void>;

	interface CrudFormProps {
		type?: string;
		type_accord?: string;
		action?: string;
		fields?: CrudField[];
		id?: string;
		title?: string;
		submitLabel?: string;
		submitLoadingLabel?: string;
		submitting?: boolean;
		onSubmit?: SubmitEventHandler;
		onClose?: CloseEventHandler;
	}

	const noop = () => undefined;

	/* eslint-disable prefer-const */
	let {
		type = 'Utilisateur',
		type_accord = 'un',
		action = 'Ajouter',
		fields = $bindable([]),
		id = 'CrudModal',
		title = `${action} ${type_accord} ${type}`,
		submitLabel = title,
		submitLoadingLabel = 'Chargement...',
		submitting = false,
		onSubmit = noop,
		onClose = noop
	}: CrudFormProps = $props();
	/* eslint-enable prefer-const */

	let autocompleteValues: Record<string, string> = $state({});
	let autocompleteCompletions: Record<string, AutocompleteCompletion[]> = $state({});
	let autocompleteImages: Record<string, string | null> = $state({});
	let autocompleteRequestIds: Record<string, number> = $state({});

	function fieldId(field: CrudField): string {
		return field.id ?? field.name.toLowerCase();
	}

	function stringValue(value: FieldValue): string {
		if (typeof value === 'string') {
			return value;
		}
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
		return '';
	}

	function inputValue(value: FieldValue): string | number {
		return typeof value === 'number' ? value : stringValue(value);
	}

	function documentPreviews(value: FieldValue): DocumentPreview[] {
		return Array.isArray(value) ? value : [];
	}

	function fileName(value: FieldValue): string {
		return value instanceof File ? value.name : '';
	}

	function completionKey(completion: AutocompleteCompletion): string {
		return String(completion.id ?? completion.value);
	}

	function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
		return typeof value === 'object' && value !== null && 'then' in value;
	}

	function filesFromEvent(event: Event): File[] {
		const target = event.currentTarget;
		return target instanceof HTMLInputElement ? Array.from(target.files ?? []) : [];
	}
</script>

<div
	{id}
	tabindex="-1"
	class="fixed top-0 right-0 left-0 z-50 h-full w-full items-center justify-center overflow-x-hidden overflow-y-auto md:inset-0"
>
	<OverlayBackdrop />
	<div class="relative m-auto flex h-full w-full p-4">
		<!-- Modal content -->
		<div
			class="relative m-auto max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-gray-800 shadow sm:min-w-96"
			id="CrudPopup"
		>
			<div class="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-5">
				<!-- Modal header -->
				<div class="mb-4 flex justify-between rounded-t sm:mb-5">
					<h3 class="text-lg font-semibold text-white">
						{title}
					</h3>
					<button
						type="button"
						class="ml-auto inline-flex cursor-pointer items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-500 hover:bg-gray-600 hover:text-white"
						onclick={(e: MouseEvent) => onClose(e)}
					>
						<svg
							aria-hidden="true"
							class="h-5 w-5"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
							><path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							></path></svg
						>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
				<!-- Modal body -->
				<form action="#">
					<div class="mb-4 grid gap-4 sm:grid-cols-2">
						{#each fields as field (fieldId(field))}
							<div class={field.wide ? 'col-span-2' : ''}>
								{#if field.type === 'document' || field.type === 'img'}
									<p
										class="mb-2 block text-sm font-medium text-white"
										data-utils={field.data ?? ''}
									>
										{field.name}
									</p>
								{:else if field.type !== 'duplicate' && field.type !== 'info'}
									<div
										class="mb-2 block text-sm font-medium text-white"
										data-utils={field.data ?? ''}
									>
										{field.name}{field.required ? ' *' : ''}
									</div>
								{/if}
								{#if field.type === 'select'}
									<select
										id={fieldId(field)}
										name={fieldId(field)}
										class="almarai-regular focus:border-primary-500 focus:ring-primary-500 block w-full cursor-pointer rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
										onchange={field.onChange ?? null}
										disabled={field.readonly ?? false}
									>
										{#if !field.readonly && !field.required}<option
												selected={!field.autoselect}
												value="NULL">----------</option
											>
										{/if}
										{#each field.options ?? [] as option (option.value)}
											<option
												value={option.value}
												data-utils={option.data ?? ''}
												selected={option.selected}>{option.text}</option
											>
										{/each}
									</select>
								{:else if field.type === 'info'}
									<p
										class="mb-2 block max-w-prose rounded-lg bg-gray-700 p-3 text-justify text-sm text-gray-200"
									>
										{field.text}
									</p>
								{:else if field.type === 'number'}
									<input
										type="number"
										name={fieldId(field)}
										id={fieldId(field)}
										class=" focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
										placeholder={field.placeholder ?? field.name.toLowerCase()}
										required={field.required}
										value={inputValue(field.value)}
										min={field.min ?? 0}
										max={field.max ?? 2000}
										step={field.step ?? 1}
										readonly={field.readonly ?? false}
									/>
								{:else if field.type === 'textarea'}
									<textarea
										name={fieldId(field)}
										id={fieldId(field)}
										class=" focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
										placeholder={field.placeholder ?? field.name.toLowerCase()}
										required={field.required}
										value={stringValue(field.value)}
										readonly={field.readonly ?? false}></textarea>
								{:else if field.type === 'img'}
									<input
										type="file"
										name={fieldId(field)}
										id={fieldId(field)}
										accept="image/png, image/jpeg"
										class="hidden"
										onchange={field.onChange ??
											((e: Event) => {
												const file = filesFromEvent(e)[0];
												if (file) {
													const reader = new FileReader();
													reader.onload = (fileEvent) => {
														const result = fileEvent.target?.result;
														if (typeof result === 'string') {
															field.value = result;
														}
													};
													reader.readAsDataURL(file);
												}
											})}
									/>
									<label
										for={fieldId(field)}
										class="focus:border-primary-500 focus:ring-primary-500 flex h-12 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									>
										{#if field.value}
											<img
												id="svelte_breffffffffff"
												src={stringValue(field.value)}
												alt={field.name}
												class="h-full w-full rounded-lg object-contain"
											/>
										{:else}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												class="h-6 w-6 fill-gray-400"
												><path
													d="M12 8.25a.75.75 0 0 1 .75.75v2.25H15a.75.75 0 0 1 0 1.5h-2.25V15a.75.75 0 0 1-1.5 0v-2.25H9a.75.75 0 0 1 0-1.5h2.25V9a.75.75 0 0 1 .75-.75Z"
												></path><path
													d="M3 3a2 2 0 0 1 2-2h9.982a2 2 0 0 1 1.414.586l4.018 4.018A2 2 0 0 1 21 7.018V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3Zm2-.5a.5.5 0 0 0-.5.5v18a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V7.018a.5.5 0 0 0-.146-.354l-4.018-4.018a.5.5 0 0 0-.354-.146H5Z"
												></path></svg
											>
										{/if}
									</label>
								{:else if field.type === 'document'}
									{#if field.multiple}
										<div
											class="mb-2 flex w-full flex-col items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white"
										>
											{#each documentPreviews(field.value) as doc (doc.id ?? doc.name)}
												<div class="flex w-full items-center gap-2 border-gray-600 py-1">
													<svg
														aria-hidden="true"
														height="16"
														viewBox="0 0 16 16"
														version="1.1"
														width="16"
														fill="white"
														data-view-component="true"
														class="octicon octicon-file"
													>
														<path
															d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
														></path>
													</svg>
													<p>
														{doc.name}
													</p>
													<button
														type="button"
														aria-label={`Remove ${doc.name}`}
														class="hover: ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
														onclick={async (e: MouseEvent) => {
															field.value = documentPreviews(field.value).filter(
																(el) => el.name !== doc.name
															);
															if (field.onRemove) {
																await field.onRemove(e, doc.name);
															}
														}}
													>
														<svg
															aria-hidden="true"
															height="16"
															viewBox="0 0 16 16"
															version="1.1"
															width="16"
															data-view-component="true"
															class="octicon octicon-x"
															fill="white"
														>
															<path
																d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
															></path>
														</svg>
													</button>
												</div>
											{/each}
										</div>
									{/if}
									<input
										type="file"
										name={fieldId(field)}
										id={fieldId(field)}
										multiple={field.multiple ?? false}
										accept="image/png, image/jpeg, application/pdf, application/octet-stream"
										class="hidden"
										onchange={field.onChange ??
											((e: Event) => {
												const selectedFiles = filesFromEvent(e);
												if (selectedFiles.length) {
													if (field.multiple) {
														const temp_arr: DocumentPreview[] = selectedFiles.map((file) => {
															return { name: file.name, type: file.type, value: '' };
														});
														for (let i = 0; i < temp_arr.length; i++) {
															const preview = temp_arr[i];
															const file = selectedFiles[i];
															if (preview && file && preview.type.split('/')[0] === 'image') {
																const reader = new FileReader();
																reader.onload = (fileEvent) => {
																	const result = fileEvent.target?.result;
																	if (typeof result === 'string') {
																		preview.value = result;
																	}
																};
																reader.readAsDataURL(file);
															}
														}
														field.value = [...documentPreviews(field.value), ...temp_arr];
													} else {
														const file = selectedFiles[0];
														if (!file) {
															return;
														}
														field.data = file.type.split('/')[0];
														if (field.data === 'image') {
															const reader = new FileReader();
															reader.onload = (fileEvent) => {
																const result = fileEvent.target?.result;
																if (typeof result === 'string') {
																	field.value = result;
																}
															};
															reader.readAsDataURL(file);
														} else {
															field.value = file;
														}
													}
												}
											})}
									/>
									<label
										for={fieldId(field)}
										class="focus:border-primary-500 focus:ring-primary-500 flex h-12 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									>
										{#if field.value && field.data === 'image' && !field.multiple}
											<img
												id="svelte_breffffffffff"
												src={stringValue(field.value)}
												alt={field.name}
												class="h-full w-full rounded-lg object-contain"
											/>
										{:else if field.value && field.data === 'application' && !field.multiple}
											<p>
												{fileName(field.value)}
											</p>
										{:else}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												class="h-6 w-6 fill-gray-400"
												><path
													d="M12 8.25a.75.75 0 0 1 .75.75v2.25H15a.75.75 0 0 1 0 1.5h-2.25V15a.75.75 0 0 1-1.5 0v-2.25H9a.75.75 0 0 1 0-1.5h2.25V9a.75.75 0 0 1 .75-.75Z"
												></path><path
													d="M3 3a2 2 0 0 1 2-2h9.982a2 2 0 0 1 1.414.586l4.018 4.018A2 2 0 0 1 21 7.018V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3Zm2-.5a.5.5 0 0 0-.5.5v18a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V7.018a.5.5 0 0 0-.146-.354l-4.018-4.018a.5.5 0 0 0-.354-.146H5Z"
												></path></svg
											>
										{/if}
									</label>
								{:else if field.type === 'duplicate'}
									<!--Duplicate is a + btn to replicate the last collumn -->
									<button
										type="button"
										class="focus:border-primary-500 focus:ring-primary-500 flex h-8 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
										onclick={() => {
											const clean_filter = fields.filter((el) => el.type !== 'duplicate');
											let lasts: CrudField[] = []; // get the last full row, 1 if wide, 2 if not
											for (let i = clean_filter.length - 1; i >= 0; i--) {
												if (lasts.length === 2) {
													break;
												}
												const fieldToClone = clean_filter[i];
												if (!fieldToClone) {
													continue;
												}
												if (fieldToClone.wide) {
													lasts.push({ ...fieldToClone });
													break;
												} else {
													lasts.push({ ...fieldToClone });
												}
											}

											// drop the values of lasts to avoid duplicate
											lasts = lasts.map((el) => {
												el.value = '';
												el.data = '';
												// add number at the end of the id
												const match = el.id?.match(/\d+/g)?.[0];
												const num = match ? Number.parseInt(match, 10) : 0;
												if (num && el.id) {
													el.id = el.id.replace(/\d+/g, String(num + 1));
												} else {
													el.id = `${el.id ?? fieldId(el)}_1`;
												}
												return el;
											});

											fields = [
												...clean_filter,
												...lasts.reverse(),
												{ name: 'duplicate', type: 'duplicate', wide: true }
											];
										}}
										>+
									</button>
								{:else if field.type === 'autocomplete'}
									{@const fieldKey = fieldId(field)}
									{@const inputValue = autocompleteValues[fieldKey] ?? field.value ?? ''}
									{@const completion = autocompleteCompletions[fieldKey] ?? field.completion ?? []}
									{@const displayImage = autocompleteImages[fieldKey] ?? field.image}
									<div class="relative w-full">
										<div
											class="focus:border-primary-500 focus:ring-primary-500 flex w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 text-sm text-white placeholder-gray-400"
										>
											{#if displayImage}
												<img
													src={displayImage}
													alt={field.name}
													class="ml-2 h-6 w-6 rounded-full"
												/>
											{/if}
											<input
												type="text"
												id={fieldId(field)}
												class=" bordertext-sm focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400"
												placeholder={field.placeholder ?? field.name.toLowerCase()}
												required={field.required}
												value={stringValue(inputValue)}
												readonly={field.readonly ?? false}
												name={fieldId(field)}
												oninput={(
													e: Event & {
														currentTarget: EventTarget & HTMLInputElement;
													}
												) => {
													const target = e.currentTarget;
													if (!(target instanceof HTMLInputElement)) {
														return;
													}
													const nextValue = target.value;
													autocompleteValues = {
														...autocompleteValues,
														[fieldKey]: nextValue
													};
													field.value = nextValue;
													const result = field.onChange?.(e);
													if (isPromiseLike<AutocompleteCompletion[] | undefined>(result)) {
														const requestId = (autocompleteRequestIds[fieldKey] ?? 0) + 1;
														autocompleteRequestIds = {
															...autocompleteRequestIds,
															[fieldKey]: requestId
														};
														result
															.then((completion) => {
																if (autocompleteRequestIds[fieldKey] !== requestId) {
																	return;
																}
																autocompleteCompletions = {
																	...autocompleteCompletions,
																	[fieldKey]: completion ?? []
																};
															})
															.catch(() => {
																if (autocompleteRequestIds[fieldKey] !== requestId) {
																	return;
																}
																autocompleteCompletions = {
																	...autocompleteCompletions,
																	[fieldKey]: []
																};
															});
													} else {
														autocompleteCompletions = {
															...autocompleteCompletions,
															[fieldKey]: result ?? []
														};
													}
												}}
											/>
										</div>
										{#if completion.length > 0}
											<div
												class="almarai-regular focus:border-primary-500 focus:ring-primary-500 absolute top-full left-0 z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-700 p-2 pl-4 text-sm text-white"
											>
												{#each completion as c (completionKey(c))}
													<button
														type="button"
														class="almarai-regular flex w-full items-center rounded-lg border-b border-gray-700 {c.image
															? 'p-1'
															: ''} cursor-pointer"
														onclick={async () => {
															field.value = c.text;
															field.data = c.value;
															field.completion = [];
															// add image to field if exists
															if (c.image) {
																field.image = c.image;
															}
															autocompleteImages = {
																...autocompleteImages,
																[fieldKey]: c.image ?? null
															};
															// call onSelect function if exists
															await field.onSelect?.(c.value);
															autocompleteValues = {
																...autocompleteValues,
																[fieldKey]: c.text
															};
															autocompleteCompletions = {
																...autocompleteCompletions,
																[fieldKey]: []
															};
														}}
													>
														{#if c.image}
															<img
																src={c.image}
																alt={c.text}
																class="mr-2 -ml-3 h-6 w-6 rounded-full"
															/>
														{/if}
														<div class="flex flex-col items-start">
															<p>
																{c.text}
															</p>
															{#if c.subtext}
																<p class="text-xs text-gray-400">{c.subtext}</p>
															{/if}
														</div>
													</button>
												{/each}
											</div>
										{/if}
									</div>
								{:else if field.type === 'checkbox'}
									<label
										for={fieldId(field)}
										class="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
									>
										<Checkbox
											id={fieldId(field)}
											name={fieldId(field)}
											value={stringValue(field.value)}
											required={field.required}
											className="size-4"
											disabled={field.readonly ?? false}
											checked={field.checked ?? false}
											onchange={(event: Event) => {
												const target = event.currentTarget as HTMLInputElement | null;
												field.checked = target?.checked === true;
												fields = [...fields];
											}}
										/>
										<div class="flex flex-row items-center gap-2">
											<span class="text-sm text-white">
												{field.checked ? 'Oui' : 'Non'}
											</span>
											<span class="text-xs text-gray-400">Cochez pour activer</span>
										</div>
									</label>
								{:else}
									<input
										type={field.type}
										name={fieldId(field)}
										id={fieldId(field)}
										class="focus:border-primary-500 focus:ring-primary-500 block w-full cursor-text rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
										placeholder={field.placeholder ?? field.name.toLowerCase()}
										required={field.required}
										value={inputValue(field.value)}
										readonly={field.readonly ?? false}
									/>
								{/if}
							</div>
						{/each}
					</div>
					<button
						type="submit"
						class={`bg-primary-600 focus:ring-primary-800 inline-flex items-center rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none ${
							submitting ? 'cursor-not-allowed opacity-60' : 'hover:bg-primary-700'
						}`}
						disabled={submitting}
						onclick={(e: MouseEvent) => {
							if (submitting) {
								return;
							}
							void onSubmit(e);
						}}
					>
						<svg
							class={`mr-1 -ml-1 h-6 w-6 ${submitting ? 'animate-spin' : ''}`}
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
							><path
								fill-rule="evenodd"
								d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
								clip-rule="evenodd"
							></path></svg
						>
						{submitting ? submitLoadingLabel : submitLabel}
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
