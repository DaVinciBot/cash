<script lang="ts">
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onDestroy, onMount } from 'svelte';
	import type { Database } from '@davincibot/database-types';

	import { Stepper } from '@davincibot/components';
	import { OverlayBackdrop } from '@davincibot/components';
	import { Icon } from '@davincibot/components';

	interface DocumentPreview {
		id?: string | number;
		name: string;
		type: string;
		value: string;
	}

	type MaybePromise<T> = T | Promise<T>;
	type FieldValue =
		| string
		| number
		| boolean
		| File
		| DocumentPreview[]
		| MultiSelectItem[]
		| ProjectRoleItem[]
		| StructuredBodyValue
		| string[]
		| null
		| undefined;

	interface StepperStep {
		done?: boolean;
		icon?: string;
		[key: string]: unknown;
	}

	interface DrawerValues {
		header: { title: string; sub?: string; stepper?: StepperStep[] };
		body: BodyItem[];
	}

	interface BodyItem {
		id?: string;
		label: string;
		type?: string;
		value: BodyValue;
		data?: FieldValue;
	}

	type BodyValue = string | number | boolean | null | StructuredBodyValue;

	type StructuredBodyValue = UpdatesValue | BadgesValue | ItemsValue;

	interface UpdatesValue {
		type: 'updates';
		list: UpdateEntry[];
	}

	interface UpdateEntry {
		type: string;
		date?: string | null;
		message?: string | null;
		user?: string | null;
	}

	interface BadgesValue {
		type: 'badges';
		list: BadgeItem[];
	}

	interface BadgeItem {
		text: string;
		color?: string | null;
	}

	interface ItemsValue {
		type: 'items';
		list: OrderItem[];
		onEdit?: (item: OrderItem) => void;
		onDelete?: (item: OrderItem) => MaybePromise<void>;
	}

	interface OrderItem {
		id: string | number;
		link?: string | null;
		name: string;
		quantity?: string | number;
		price?: string | number;
	}

	interface FilePreview {
		mime: string;
		url: string | null;
		name?: string;
	}

	interface Permission {
		value: string;
		label: string;
	}

	interface PermissionPackage {
		label: string;
		perms: string[];
	}

	interface SelectOption {
		value: string;
		text: string;
		selected?: boolean;
		data?: string | number | null;
	}

	interface ProjectOption {
		value: string;
		name: string;
	}

	interface MultiSelectItem {
		value: string;
		text: string;
		image?: string | null;
	}

	interface ProjectRoleItem {
		project_id: string | null;
		role: string;
	}

	interface AutocompleteCompletion extends MultiSelectItem {
		id?: string | number;
		subtext?: string;
	}

	interface EditableField {
		id?: string;
		name: string;
		type: string;
		wide?: boolean;
		data?: FieldValue;
		text?: string;
		required?: boolean;
		readonly?: boolean;
		autoselect?: boolean;
		value?: FieldValue;
		options?: SelectOption[];
		placeholder?: string;
		min?: number;
		max?: number;
		step?: number;
		multiple?: boolean;
		onChange?: (event: Event) => MaybePromise<AutocompleteCompletion[] | undefined>;
		onRemove?: (eventOrValue: Event | string, name?: string) => MaybePromise<void>;
		onSelect?: (value: string) => MaybePromise<void>;
		completion?: AutocompleteCompletion[];
		image?: string | null;
		checked?: boolean;
		searchTerm?: string;
		packages?: PermissionPackage[];
		categories?: Record<string, Permission[]>;
		projects?: ProjectOption[];
		roles?: SelectOption[];
		defaultRole?: string;
	}

	interface SelectorAction {
		type: 'selector';
		title: ProjectOption[];
		handler: (event: Event) => void;
	}

	interface ButtonAction {
		type: 'validate' | 'delete';
		title: string;
		handler: (event: MouseEvent) => void | Promise<void>;
	}

	type DrawerAction = SelectorAction | ButtonAction;

	interface Props {
		values?: DrawerValues;
		files?: string[];
		actions?: DrawerAction[];
		fields?: EditableField[];
		id?: string;
		onSubmit?: (
			event: SubmitEvent,
			form: HTMLFormElement | null,
			fields: EditableField[]
		) => MaybePromise<void>;
		onClose?: (event: Event) => void | Promise<void>;
	}

	const noop = () => undefined;

	/* eslint-disable prefer-const */
	let {
		values = {
			header: { title: 'Pas de détails', sub: '-', stepper: [] },
			body: []
		},
		files = [],
		actions = [],
		fields = $bindable([]),
		id = 'readDrawer',
		onSubmit = noop,
		onClose = noop
	}: Props = $props();
	/* eslint-enable prefer-const */

	let isEditing = $state<boolean>(false);
	function handleSave(e: SubmitEvent) {
		e.preventDefault();
		void onSubmit(e, forms, fields);
		isEditing = false;
	}
	function handleCancel() {
		isEditing = false;
	}

	let current_file = $state('');
	let current_file_index = $state(0);
	let scroll_body: HTMLDivElement | null = $state<HTMLDivElement | null>(null);
	let isMobile = $state<boolean>(false);
	const files_array: FilePreview[] = $state([{ mime: 'application/pdf', url: null }]);
	let forms: HTMLFormElement | null = $state<HTMLFormElement | null>(null);

	// Resizing state for the right-anchored drawer (drag from left edge)
	let width = $state(384); // default equals Tailwind w-96
	const minWidth = 320;
	const maxWidth = 960;
	let isResizing = false;
	let startX = 0;
	// svelte-ignore state_referenced_locally
	let startWidth = width;

	const updateText: Partial<Record<string, string>> = {
		'order-creation': 'Création de la commande',
		comment: 'Commentaire ajouté',
		update: 'Mise à jour de la commande',
		'review-cdp-requested': 'Validation par le chef de projet demandée',
		'review-cdp-approved': 'Validation par le chef de projet effectuée',
		'review-cdp-refused': 'Validation par le chef de projet refusée',
		'review-treso-requested': 'Validation par le trésorier demandée',
		'review-treso-approved': 'Validation par le trésorier effectuée',
		'review-treso-refused': 'Validation par le trésorier refusée',
		'order-pending-delivery': 'Commande validée, en attente de livraison',
		'order-canceled-user': 'Commande annulée par le demandeur',
		'order-canceled-ops': 'Commande annulée côté opérationnel',
		'order-completed': 'Commande complétée'
	} satisfies Record<string, string>;

	function beginResize(clientX: number) {
		isResizing = true;
		startX = clientX;
		startWidth = width;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', endResize);
		window.addEventListener('touchmove', onTouchMove, { passive: false });
		window.addEventListener('touchend', endResize);
	}

	function onMouseMove(e: MouseEvent) {
		if (!isResizing) {
			return;
		}
		const dx = startX - e.clientX; // dragging left increases width
		width = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
	}

	function onTouchMove(e: TouchEvent) {
		if (!isResizing) {
			return;
		}
		if (e.touches.length > 0) {
			e.preventDefault();
			const dx = startX - (e.touches[0]?.clientX ?? 0);
			width = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
		}
	}

	function endResize() {
		isResizing = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mouseup', endResize);
		window.removeEventListener('touchmove', onTouchMove);
		window.removeEventListener('touchend', endResize);
	}

	function onResizeTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		if (!touch) {
			return;
		}
		beginResize(touch.clientX);
	}

	const cropTitle = $derived(
		values.header.title.length > width / 10
			? values.header.title.slice(0, width / 10 - 3) + '...'
			: values.header.title
	);

	onDestroy(() => {
		// ensure listeners are cleared if component is destroyed mid-drag
		endResize();
	});

	const __onClose = (e: Event): void => {
		void onClose(e);
	};

	function getSignedFileName(url: string | null): string {
		if (!url) {
			return '';
		}
		const parts = url.split('/');
		const rawName = parts[10] ?? parts[parts.length - 1] ?? '';
		const cleanName = rawName.split('?')[0] ?? '';
		return decodeURI(cleanName);
	}

	function getPermissionCategories(
		categories: Record<string, Permission[]> | null | undefined
	): [string, Permission[]][] {
		return Object.entries(categories ?? {});
	}

	function getFieldKey(field: EditableField): string {
		return field.id ?? field.name.toLowerCase();
	}

	function setFieldValue(field: EditableField, value: FieldValue) {
		const fieldKey = getFieldKey(field);

		fields = fields.map((currentField) => {
			const isSameField =
				currentField === field || (fieldKey && getFieldKey(currentField) === fieldKey);

			if (!isSameField) {
				return currentField;
			}
			return { ...currentField, value };
		});
	}

	function updateFileScrollTransform(direction: 1 | -1): void {
		const target = scroll_body;
		if (!target || files.length === 0) {
			return;
		}
		const offset = (target.scrollWidth / files.length) * current_file_index;
		target.style.transform = `translateX(${direction === -1 ? '-' : ''}${String(offset)}px)`;
	}

	function parseValuesToFields() {
		fields.forEach((field) => {
			const fieldKey = getFieldKey(field);
			const bodyItem = values.body.find((item) => {
				const bodyKey = item.id ?? item.label.toLowerCase();
				return bodyKey === fieldKey;
			});
			if (bodyItem) {
				// Special handling for multiselect fields
				if (field.type === 'multiselect') {
					if (bodyItem.data) {
						field.value = bodyItem.data;
					}
				} else if (field.type === 'select') {
					// set the selected: true value for select fields. data is just value
					field.options?.forEach((option) => {
						option.selected = option.value === bodyItem.value;
					});
					field.value = bodyItem.value;
				} else if (['permissions_grouped', 'project_roles'].includes(field.type)) {
					field.value = bodyItem.data;
				} else {
					field.value = bodyItem.value;
				}
			}
		});
	}

	let cachedSupabase: SupabaseClient<Database> | null = null;

	function getSupabase(): SupabaseClient<Database> {
		if (!cachedSupabase) {
			const client: unknown = getSupabaseBrowserClient();
			cachedSupabase = client as SupabaseClient<Database>;
		}
		return cachedSupabase;
	}

	function stringValue(value: FieldValue | BodyValue): string {
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

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	function isDocumentPreview(value: unknown): value is DocumentPreview {
		return isRecord(value) && typeof value.name === 'string' && typeof value.type === 'string';
	}

	function isMultiSelectItem(value: unknown): value is MultiSelectItem {
		return isRecord(value) && typeof value.value === 'string' && typeof value.text === 'string';
	}

	function isProjectRoleItem(value: unknown): value is ProjectRoleItem {
		return (
			isRecord(value) &&
			(value.project_id === null || typeof value.project_id === 'string') &&
			typeof value.role === 'string'
		);
	}

	function documentPreviews(value: FieldValue): DocumentPreview[] {
		return Array.isArray(value) && value.every(isDocumentPreview) ? value : [];
	}

	function multiSelectItems(value: FieldValue): MultiSelectItem[] {
		return Array.isArray(value) && value.every(isMultiSelectItem) ? value : [];
	}

	function projectRoles(value: FieldValue): ProjectRoleItem[] {
		return Array.isArray(value) && value.every(isProjectRoleItem) ? value : [];
	}

	function selectedPermissionValues(value: FieldValue): string[] {
		return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];
	}

	function fileName(value: FieldValue): string {
		return value instanceof File ? value.name : '';
	}

	function completionKey(completion: AutocompleteCompletion): string {
		return String(completion.id ?? completion.value);
	}

	function actionKey(action: DrawerAction): string {
		return action.type === 'selector'
			? `selector-${action.title.map((option) => option.value).join(',')}`
			: `${action.type}-${action.title}`;
	}

	function structuredValue(value: BodyValue): StructuredBodyValue | null {
		return typeof value === 'object' && value !== null ? value : null;
	}

	function isPendingCdp(): boolean {
		return values.body.some((item) => item.label === 'Status' && item.type === 'pending_cdp');
	}

	function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
		return typeof value === 'object' && value !== null && 'then' in value;
	}

	onMount(async () => {
		// check if mobile
		isMobile = window.innerWidth < 768;
		if (files.length > 0) {
			// get the all signed url from supabase
			const { data: urls } = await getSupabase().storage.from('proof').createSignedUrls(files, 600);
			if (!urls) {
				return;
			}

			for (const [i, signedUrlResult] of urls.entries()) {
				const signedUrl = signedUrlResult.signedUrl;
				if (signedUrlResult.error || !signedUrl) {
					continue;
				}
				// get the blob from the url
				const r = await fetch(signedUrl);
				if (!r.ok) {
					continue;
				}
				const b = await r.blob();
				files_array[i] = {
					mime: b.type,
					url: signedUrl,
					name: getSignedFileName(signedUrl)
				};
			}
			current_file = files_array[0]?.name ?? '';
		}
	});
</script>

<!-- Backdrop -->
<OverlayBackdrop className="z-40" onClose={__onClose} />

<!-- Drawer -->
<div
	id={'drawer-' + id}
	style={`transform: translateX(0); width: ${String(width)}px;`}
	class="fixed top-0 right-0 z-50 flex h-full flex-col bg-gray-800 shadow-lg transition-transform duration-300"
	tabindex="-1"
>
	<!-- Resize handle (left edge) -->
	<button
		class="group absolute top-0 left-0 h-full w-2 cursor-col-resize bg-transparent focus:outline-none"
		aria-label="Resize drawer"
		onkeydown={(e: KeyboardEvent) => {
			// keyboard resizing: arrow left increases width (drawer anchored right)
			const step = e.shiftKey ? 40 : 10;
			if (e.key === 'ArrowLeft') {
				width = Math.min(maxWidth, width + step);
			}
			if (e.key === 'ArrowRight') {
				width = Math.max(minWidth, width - step);
			}
		}}
		onmousedown={(e: MouseEvent) => {
			beginResize(e.clientX);
		}}
		ontouchstart={onResizeTouchStart}
		type="button"
	>
		<span class="absolute top-0 right-0 h-full w-1 bg-transparent group-hover:bg-gray-600/60"
		></span>
	</button>
	<!-- Header -->
	<div class="flex items-center justify-between border-gray-700 p-4">
		<div class="flex flex-col">
			<span class="text-lg font-semibold text-white">{cropTitle}</span>
			{#if values.header.sub}
				<span class="text-sm text-gray-400">{values.header.sub}</span>
			{/if}
		</div>
		<button
			class="rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
			onclick={__onClose}
			type="button"
		>
			<svg class="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
				<path
					clip-rule="evenodd"
					d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
					fill-rule="evenodd"
				></path>
			</svg>
			<span class="sr-only">Close drawer</span>
		</button>
	</div>
	{#if values.header.stepper}
		{@const stepper = values.header.stepper}
		<div class="m-auto w-full border-b border-gray-700 px-4 pt-2 pb-4">
			<Stepper steps={stepper} />
		</div>
	{/if}
	<!-- Content -->
	<div class="flex-1 space-y-4 overflow-y-auto p-4">
		{#if isEditing}
			<form bind:this={forms} onsubmit={handleSave}>
				<div class="mb-4 grid gap-4 sm:grid-cols-2">
					{#each fields as field (getFieldKey(field))}
						<div class={field.wide ? 'col-span-2' : ''}>
							{#if field.type === 'document' || field.type === 'img'}
								<p
									class="mb-2 block text-sm font-medium text-white"
									data-utils={stringValue(field.data)}
								>
									{field.name}
								</p>
							{:else if field.type !== 'duplicate' && field.type !== 'info'}
								<label
									class="mb-2 block text-sm font-medium text-white"
									data-utils={stringValue(field.data)}
									for={getFieldKey(field)}>{field.name}</label
								>
							{/if}
							{#if field.type === 'select'}
								<select
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class=" focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									disabled={field.readonly ?? false}
									onchange={field.onChange ?? null}
								>
									{#if !field.readonly}<option selected={!field.autoselect} value="NULL"
											>----------</option
										>
									{/if}
									{#each field.options ?? [] as option (option.value)}
										<option
											data-utils={option.data ?? ''}
											selected={option.selected}
											value={option.value}>{option.text}</option
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
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class=" focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									max={field.max ?? 2000}
									min={field.min ?? 0}
									placeholder={field.placeholder ?? field.name.toLowerCase()}
									readonly={field.readonly ?? false}
									required={field.required}
									step={field.step ?? 1}
									type="number"
									value={inputValue(field.value)}
								/>
							{:else if field.type === 'textarea'}
								<textarea
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class=" focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									placeholder={field.placeholder ?? field.name.toLowerCase()}
									readonly={field.readonly ?? false}
									required={field.required}
									value={stringValue(field.value)}></textarea>
							{:else if field.type === 'img'}
								<input
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class="hidden"
									accept="image/png, image/jpeg"
									onchange={field.onChange ??
										((e) => {
											const input = e.currentTarget;
											if (!(input instanceof HTMLInputElement) || !input.files?.length) {
												return;
											}
											const file = input.files.item(0);
											if (!file) {
												return;
											}
											const reader = new FileReader();
											reader.onload = () => {
												if (typeof reader.result === 'string') {
													field.value = reader.result;
												}
											};
											reader.readAsDataURL(file);
										})}
									type="file"
								/>
								<label
									class="focus:border-primary-500 focus:ring-primary-500 flex h-12 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									for={getFieldKey(field)}
								>
									{#if field.value}
										<img
											id="svelte_breffffffffff"
											class="h-full w-full rounded-lg object-contain"
											alt={field.name}
											src={stringValue(field.value)}
										/>
									{:else}
										<svg
											class="h-6 w-6 fill-gray-400"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
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
													class="octicon octicon-file"
													aria-hidden="true"
													data-view-component="true"
													fill="white"
													height="16"
													viewBox="0 0 16 16"
													width="16"
												>
													<path
														d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
													></path>
												</svg>
												<p>
													{doc.name}
												</p>
												<button
													class="hover: ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
													aria-label="Remove document"
													onclick={async (e: MouseEvent) => {
														field.value = documentPreviews(field.value).filter(
															(el) => el.name !== doc.name
														);
														if (field.onRemove) {
															await field.onRemove(e, doc.name);
														}
													}}
													type="button"
												>
													<svg
														class="octicon octicon-x"
														aria-hidden="true"
														data-view-component="true"
														fill="white"
														height="16"
														viewBox="0 0 16 16"
														width="16"
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
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class="hidden"
									accept="image/png, image/jpeg, application/pdf, application/octet-stream"
									multiple={field.multiple ?? false}
									onchange={field.onChange ??
										((e) => {
											const input = e.currentTarget;
											if (!(input instanceof HTMLInputElement) || !input.files?.length) {
												return;
											}
											if (field.multiple) {
												const selectedFiles = Array.from(input.files);
												const temp_arr = selectedFiles.map((file) => {
													return { name: file.name, type: file.type, value: '' };
												});
												selectedFiles.forEach((file, i) => {
													const tempFile = temp_arr[i];
													if (!tempFile) {
														return;
													}
													if (tempFile.type.split('/')[0] === 'image') {
														const reader = new FileReader();
														reader.onload = () => {
															if (typeof reader.result === 'string') {
																tempFile.value = reader.result;
															}
														};
														reader.readAsDataURL(file);
													}
												});
												field.value = [...documentPreviews(field.value), ...temp_arr];
											} else {
												const file = input.files.item(0);
												if (!file) {
													return;
												}
												field.data = file.type.split('/')[0];
												if (field.data === 'image') {
													const reader = new FileReader();
													reader.onload = () => {
														if (typeof reader.result === 'string') {
															field.value = reader.result;
														}
													};
													reader.readAsDataURL(file);
												} else {
													field.value = file;
												}
											}
										})}
									type="file"
								/>
								<label
									class="focus:border-primary-500 focus:ring-primary-500 flex h-12 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									for={getFieldKey(field)}
								>
									{#if field.value && field.data === 'image' && !field.multiple}
										<img
											id="svelte_breffffffffff"
											class="h-full w-full rounded-lg object-contain"
											alt={field.name}
											src={stringValue(field.value)}
										/>
									{:else if field.value && field.data === 'application' && !field.multiple}
										<p>
											{fileName(field.value)}
										</p>
									{:else}
										<svg
											class="h-6 w-6 fill-gray-400"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
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
									class="focus:border-primary-500 focus:ring-primary-500 flex h-8 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									onclick={() => {
										const clean_filter = fields.filter((el) => el.type !== 'duplicate');
										let lasts: EditableField[] = []; // get the last full row, 1 if wide, 2 if not
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
											const currentId = typeof el.id === 'string' ? el.id : null;
											const match = currentId ? /\d+/.exec(currentId) : null;
											const num = match ? Number(match[0]) : null;
											if (currentId && num !== null && !Number.isNaN(num)) {
												el.id = currentId.replace(/\d+/g, String(num + 1));
											} else {
												el.id = `${el.id ?? getFieldKey(el)}_1`;
											}
											return el;
										});

										fields = [
											...clean_filter,
											...lasts.reverse(),
											{ name: 'duplicate', type: 'duplicate', wide: true }
										];
									}}
									type="button"
									>+
								</button>
							{:else if field.type === 'autocomplete'}
								{@const autocompleteCompletion = field.completion ?? []}
								<div
									class="focus:border-primary-500 focus:ring-primary-500 relative flex w-full flex-row items-center justify-center rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
								>
									{#if field.image}
										<img
											class="mr-1 -ml-1 h-6 w-6 rounded-full"
											alt={field.name}
											src={field.image}
										/>
									{/if}
									<input
										id={getFieldKey(field)}
										name={getFieldKey(field)}
										class=" bordertext-sm focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400"
										oninput={async (
											e: Event & {
												currentTarget: EventTarget & HTMLInputElement;
											}
										) => {
											const completion = field.onChange?.(e);
											field.completion = isPromiseLike<AutocompleteCompletion[] | undefined>(
												completion
											)
												? ((await completion) ?? [])
												: (completion ?? []);
										}}
										placeholder={field.placeholder ?? field.name.toLowerCase()}
										readonly={field.readonly ?? false}
										required={field.required}
										type="text"
										value={stringValue(field.value)}
									/>
								</div>
								{#if autocompleteCompletion.length > 0}
									<div
										class="focus:border-primary-500 focus:ring-primary-500 absolute z-10 mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 pl-4 text-sm text-white"
									>
										{#each autocompleteCompletion as c (completionKey(c))}
											<button
												class=" flex w-full
												items-center rounded-lg border-b border-gray-700 {c.image ? 'p-1' : ''} cursor-pointer"
												onclick={async () => {
													field.value = c.text;
													field.data = c.value;
													field.completion = [];
													// add image to field if exists
													if (c.image) {
														field.image = c.image;
													}
													// call onSelect function if exists
													await field.onSelect?.(c.value);
												}}
												type="button"
											>
												{#if c.image}
													<img class="mr-1 -ml-1 h-6 w-6 rounded-full" alt={c.text} src={c.image} />
												{/if}
												<p>
													{c.text}
												</p>
												<br />
											</button>
										{/each}
									</div>
								{/if}
							{:else if field.type === 'multiselect'}
								{@const selectedItems = multiSelectItems(field.value)}
								{@const autocompleteCompletion = field.completion ?? []}
								<!-- Selected items display -->
								{#if selectedItems.length > 0}
									<div class="mb-2 flex flex-wrap gap-2">
										{#each selectedItems as item (item.value)}
											<div
												class="flex items-center rounded-md bg-blue-600 px-2 py-1 text-sm text-white"
											>
												{#if item.image}
													<img class="mr-1 h-4 w-4 rounded-full" alt={item.text} src={item.image} />
												{/if}
												<span>{item.text}</span>
												<button
													class="ml-2 text-white hover:text-gray-300"
													aria-label={`Remove ${item.text}`}
													onclick={async () => {
														const nextValue = selectedItems.filter((v) => v.value !== item.value);
														field.value = nextValue;
														field.data = nextValue.map((v) => v.value);
														await field.onRemove?.(item.value);
													}}
													type="button"
												>
													<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
														<path
															clip-rule="evenodd"
															d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
															fill-rule="evenodd"
														></path>
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}
								<!-- Search input -->
								<div class="relative w-full">
									<input
										id={getFieldKey(field)}
										name={getFieldKey(field)}
										class="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
										oninput={async (
											e: Event & {
												currentTarget: EventTarget & HTMLInputElement;
											}
										) => {
											const input = e.currentTarget;
											if (!(input instanceof HTMLInputElement)) {
												return;
											}
											field.searchTerm = input.value;
											if (field.searchTerm.length > 0) {
												const completion = field.onChange?.(e);
												field.completion = isPromiseLike<AutocompleteCompletion[] | undefined>(
													completion
												)
													? ((await completion) ?? [])
													: (completion ?? []);
											} else {
												field.completion = [];
											}
										}}
										placeholder={field.placeholder ?? field.name.toLowerCase()}
										readonly={field.readonly ?? false}
										type="text"
										value={field.searchTerm ?? ''}
									/>
									{#if autocompleteCompletion.length > 0}
										<div
											class="focus:border-primary-500 focus:ring-primary-500 absolute z-10 mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white"
										>
											{#each autocompleteCompletion as c (completionKey(c))}
												{@const isSelected = selectedItems.some((v) => v.value === c.value)}
												{#if !isSelected}
													<button
														class="flex w-full items-center rounded-lg border-b border-gray-700 {c.image
															? 'p-1'
															: ''} cursor-pointer hover:bg-gray-600"
														onclick={async (e: MouseEvent) => {
															// Add selected item to value array
															field.value = [
																...selectedItems,
																{ text: c.text, value: c.value, image: c.image }
															];
															field.data = multiSelectItems(field.value).map((v) => v.value);

															// Clear search and completion
															field.searchTerm = '';
															field.completion = [];

															// Clear the input
															const root =
																e.currentTarget instanceof HTMLElement
																	? e.currentTarget.closest('.relative')
																	: null;
															const input = root?.querySelector('input');
															if (input instanceof HTMLInputElement) {
																input.value = '';
															}

															// call onSelect function if exists
															await field.onSelect?.(c.value);
														}}
														type="button"
													>
														{#if c.image}
															<img
																class="mr-1 -ml-1 h-6 w-6 rounded-full"
																alt={c.text}
																src={c.image}
															/>
														{/if}
														<p>{c.text}</p>
													</button>
												{/if}
											{/each}
										</div>
									{/if}
								</div>
							{:else if field.type === 'permissions_grouped'}
								{@const packages = field.packages ?? []}
								{@const permissionValues = selectedPermissionValues(field.value)}
								<div class="mb-4 space-y-4">
									{#if packages.length > 0}
										<div
											class="mb-4 flex flex-wrap gap-2 rounded-lg border border-gray-600 bg-gray-900 p-3"
										>
											<p class="mb-1 w-full text-xs font-semibold text-gray-400">
												Packs pré-définis :
											</p>
											{#each packages as pack (pack.label)}
												<button
													class="hover:bg-primary-600 rounded-md border border-gray-500 bg-gray-700 px-2 py-1 text-xs text-white transition-colors"
													onclick={() => {
														setFieldValue(field, [...pack.perms]);
													}}
													type="button"
												>
													{pack.label}
												</button>
											{/each}
											<div class="mt-1 flex w-full justify-end border-t border-gray-700 pt-2">
												<button
													class="px-2 py-1 text-xs text-red-400 underline hover:text-red-300"
													onclick={() => {
														setFieldValue(field, []);
													}}
													type="button"
												>
													Tout décocher
												</button>
											</div>
										</div>
									{/if}
									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										{#each getPermissionCategories(field.categories) as [catName, perms] (catName)}
											<div class="rounded-lg border border-gray-700 bg-gray-800 p-3">
												<h4
													class="mb-3 border-b border-gray-700 pb-1 text-sm font-semibold text-white"
												>
													{catName}
												</h4>
												<div class="flex flex-col gap-2">
													{#each perms as perm (perm.value)}
														<label class="group inline-flex cursor-pointer items-center">
															<input
																name={field.id ?? 'permissions'}
																class="text-primary-600 focus:ring-primary-600 h-4 w-4 cursor-pointer rounded border-gray-500 bg-gray-900 transition duration-200 focus:ring-2"
																checked={permissionValues.includes(perm.value)}
																onchange={(e: Event) => {
																	const input = e.currentTarget;
																	if (!(input instanceof HTMLInputElement)) {
																		return;
																	}
																	const currentValue = selectedPermissionValues(field.value);

																	if (input.checked) {
																		if (!currentValue.includes(perm.value)) {
																			setFieldValue(field, [...currentValue, perm.value]);
																		}
																	} else {
																		setFieldValue(
																			field,
																			currentValue.filter((value) => value !== perm.value)
																		);
																	}
																}}
																type="checkbox"
																value={perm.value}
															/>
															<span
																class="ml-2 text-sm text-gray-300 transition-colors group-hover:text-white"
																>{perm.label}</span
															>
														</label>
													{/each}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else if field.type === 'project_roles'}
								{@const rolesValue = projectRoles(field.value)}
								<div class="mb-4 space-y-2">
									{#each rolesValue as item, idx (`${item.project_id ?? 'empty'}-${String(idx)}`)}
										<div class="flex items-center gap-2">
											<select
												class="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
												bind:value={item.project_id}
											>
												<option value={null}>Sélectionner un projet</option>
												{#each field.projects ?? [] as p (p.value)}
													<option
														disabled={rolesValue.some(
															(value, i) => i !== idx && value.project_id === p.value
														)}
														value={p.value}>{p.name}</option
													>
												{/each}
											</select>
											<select
												class="focus:border-primary-500 focus:ring-primary-500 block w-32 rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
												bind:value={item.role}
											>
												{#each field.roles ?? [] as r (r.value)}
													<option value={r.value}>{r.text}</option>
												{/each}
											</select>
											<button
												class="rounded-lg bg-transparent p-2 text-red-500 hover:bg-gray-700 hover:text-red-400"
												aria-label="Supprimer ce projet"
												onclick={() => {
													field.value = rolesValue.filter((_, i) => i !== idx);
												}}
												type="button"
											>
												<svg
													class="h-5 w-5"
													aria-hidden="true"
													fill="currentColor"
													viewBox="0 0 20 20"
													><path
														clip-rule="evenodd"
														d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
														fill-rule="evenodd"
													></path></svg
												>
											</button>
										</div>
									{/each}
									<button
										class="text-primary-500 mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 p-2 text-sm hover:bg-gray-700"
										onclick={() => {
											field.value = [
												...rolesValue,
												{ project_id: null, role: field.defaultRole ?? 'membre' }
											];
										}}
										type="button"
									>
										<svg
											class="mr-2 h-3.5 w-3.5"
											aria-hidden="true"
											fill="currentColor"
											viewBox="0 0 20 20"
											xmlns="http://www.w3.org/2000/svg"
											><path
												clip-rule="evenodd"
												d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
												fill-rule="evenodd"
											></path></svg
										>Ajouter un projet
									</button>
									<input
										name={getFieldKey(field)}
										type="hidden"
										value={JSON.stringify(rolesValue)}
									/>
								</div>
							{:else if field.type === 'checkbox'}
								<input
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									checked={field.checked ?? false}
									placeholder={field.placeholder ?? field.name.toLowerCase()}
									readonly={field.readonly ?? false}
									required={field.required}
									type="checkbox"
									value={stringValue(field.value)}
								/>
							{:else}
								<input
									id={getFieldKey(field)}
									name={getFieldKey(field)}
									class="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									placeholder={field.placeholder ?? field.name.toLowerCase()}
									readonly={field.readonly ?? false}
									required={field.required}
									type={field.type}
									value={inputValue(field.value)}
								/>
							{/if}
						</div>
					{/each}
				</div>
				<div class="flex space-x-2">
					<button
						class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
						type="submit">Save</button
					>
					<button
						class="rounded-lg bg-gray-700 px-4 py-2 text-gray-400 hover:bg-gray-600"
						onclick={handleCancel}
						type="button">Cancel</button
					>
				</div>
			</form>
		{:else}
			{#if files.length > 0}
				<div>
					<h3 class="mb-2 text-lg font-semibold text-white">Pièces jointes</h3>
					<div class="mb-2 flex items-center">
						<button
							class="rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
							aria-label="Previous file"
							onclick={() => {
								if (current_file_index > 0) {
									current_file_index--;
									current_file = files_array[current_file_index]?.name ?? '';
									updateFileScrollTransform(1);
								}
							}}
						>
							<svg class="h-5 w-5" fill="white" viewBox="0 0 20 20"
								><path
									clip-rule="evenodd"
									d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
									fill-rule="evenodd"
								></path></svg
							>
						</button>
						<p class="flex-1 text-center text-sm text-gray-400">
							{current_file || 'Chargement'} - {current_file_index + 1}/{files.length}
						</p>
						<button
							class="rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
							aria-label="Next file"
							onclick={() => {
								if (current_file_index < files.length - 1) {
									current_file_index++;
									current_file = files_array[current_file_index]?.name ?? '';
									updateFileScrollTransform(-1);
								}
							}}
						>
							<svg class="h-5 w-5 rotate-180" fill="white" viewBox="0 0 20 20"
								><path
									clip-rule="evenodd"
									d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
									fill-rule="evenodd"
								></path></svg
							>
						</button>
					</div>
					<div class="flex aspect-[1/1.414] h-auto w-full gap-2 overflow-x-hidden">
						<div bind:this={scroll_body} class="flex rounded-lg">
							{#each files_array as { mime, url }, i (url ?? String(i))}
								{@const name = getSignedFileName(url)}
								<div class="flex w-full flex-col">
									{#if mime === 'application/pdf' && !isMobile}
										<iframe class="h-full w-full" frameborder="0" src={url ?? ''} title={name}
										></iframe>
									{:else if mime === 'application/pdf' && isMobile}
										<iframe
											class="h-full w-full"
											src={`https://docs.google.com/viewer?url=${encodeURIComponent(url ?? '')}&embedded=true`}
											title={name}
										></iframe>
									{:else if mime.startsWith('image/')}
										<img class="w-full max-w-full" alt={name} src={url ?? ''} />
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<dl>
				{#each values.body as item (item.id ?? item.label)}
					{@const detail = structuredValue(item.value)}
					<dt class="mb-2 leading-none font-semibold text-white">{item.label}</dt>
					{#if detail}
						{#if detail.type === 'updates'}
							<dd class="mt-8 ml-4">
								<ol class="relative ml-2 border-l border-gray-700">
									{#each detail.list as value (`${value.type}-${value.date ?? ''}`)}
										{@const isPositive = [
											'review-treso-approved',
											'order-pending-delivery',
											'order-completed'
										].includes(value.type)}
										{@const isNegative = [
											'order-canceled-user',
											'order-canceled-ops',
											'review-cdp-refused',
											'review-treso-refused'
										].includes(value.type)}
										{@const dotBg = isPositive
											? 'primary-600'
											: isNegative
												? 'red-600'
												: 'gray-600'}

										<li class="mb-10 ml-6">
											<span
												class={'absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full ring-8 ring-gray-700 ' +
													dotBg}
											>
												<span
													class="flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-{dotBg} bg-{dotBg}"
												>
													<Icon
														name={isPositive ? 'done' : isNegative ? 'cancel' : 'processing'}
														fill="gray-100"
														size="6"
													/>
												</span>
											</span>
											{#if value.date}
												<span
													class={'inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium text-gray-100 ' +
														(isPositive
															? 'bg-primary-800'
															: isNegative
																? '  bg-red-900'
																: '  bg-gray-800')}
												>
													<svg
														class="mr-1 h-3 w-3"
														aria-hidden="true"
														fill="none"
														height="24"
														viewBox="0 0 24 24"
														width="24"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
															stroke="currentColor"
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
														/>
													</svg>
													{value.date}
												</span>
											{/if}
											<h3 class="mt-2 mb-0.5 text-base font-semibold text-gray-300">
												{value.message ?? updateText[value.type] ?? value.type}
											</h3>
											{#if value.user}
												<p class="text-sm font-normal text-gray-400">
													Par {value.user}
												</p>
											{/if}
										</li>
									{/each}
								</ol>
							</dd>
						{:else if detail.type === 'badges'}
							<dd class="mb-4">
								<div class="mt-1 flex flex-wrap gap-1">
									{#each detail.list as badge (badge.text)}
										<span
											class="rounded-md px-2 py-1 text-xs font-medium shadow-sm {badge.color ??
												'border border-gray-600 bg-gray-700 text-gray-200'}"
										>
											{badge.text}
										</span>
									{/each}
								</div>
							</dd>
						{:else if detail.type === 'items'}
							<dd class="mb-4 ml-2 font-light text-gray-400">
								<table class="w-full border-separate">
									<thead class="font-bold">
										<tr>
											<td>Nom</td>
											<td>Quantité</td>
											<td>Prix</td>
											{#if isPendingCdp()}
												<td class="w-2.5"></td>
											{/if}
										</tr>
									</thead>
									<tbody>
										{#each detail.list as listItem (listItem.id)}
											<tr data-utils={String(listItem.id)}>
												<td class="fill-gray-400 p-2 hover:fill-gray-200"
													><button
														class="text-left"
														onclick={() => {
															if (listItem.link) {
																window.open(listItem.link, '_blank', 'noopener,noreferrer');
															}
														}}
														type="button"
													>
														{#if listItem.link}
															<svg
																	id="Capa_1"
																	style="enable-background:new 0 0 511.904 511.904;"
																	class="ml-1 inline h-4 w-4 transition-all"
																	height="16"
																	viewBox="0 0 511.904 511.904"
																	width="16"
																	x="0px"
																	xmlns="http://www.w3.org/2000/svg"
																	y="0px"
																	xml:space="preserve"
															>
																<g>
																	<path
																		d="M222.025,417.764c-33.872,35.124-89.034,38.364-126.784,7.445c-22.482-19.465-33.966-48.733-30.72-78.293   c2.811-21.794,12.997-41.97,28.864-57.173l61.355-61.397c12.492-12.496,12.492-32.752,0-45.248l0,0   c-12.496-12.492-32.752-12.492-45.248,0l-60.053,60.075C22.065,269.57,4.802,304.721,0.649,342.521   c-7.757,85.138,54.972,160.445,140.11,168.202c45.721,4.166,90.933-12.179,123.42-44.618l64.171-64.149   c12.492-12.496,12.492-32.752,0-45.248l0,0c-12.496-12.492-32.752-12.492-45.248,0L222.025,417.764z"
																	/>
																	<path
																		d="M451.358,31.289C387.651-15.517,299.186-8.179,244.062,48.484L183.667,108.9c-12.492,12.496-12.492,32.752,0,45.248l0,0   c12.496,12.492,32.752,12.492,45.248,0l61.355-61.291c33.132-34.267,86.738-38.127,124.437-8.96   c38.803,31.818,44.466,89.067,12.648,127.87c-1.862,2.271-3.833,4.45-5.907,6.53l-64.171,64.171   c-12.492,12.496-12.492,32.752,0,45.248l0,0c12.496,12.492,32.752,12.492,45.248,0l64.171-64.171   c60.413-60.606,60.257-158.711-0.349-219.124C461.638,39.727,456.631,35.341,451.358,31.289z"
																	/>
																	<path
																		d="M183.667,282.525l99.425-99.425c12.497-12.497,32.758-12.497,45.255,0l0,0c12.497,12.497,12.497,32.758,0,45.255   l-99.425,99.425c-12.497,12.497-32.758,12.497-45.255,0l0,0C171.17,315.283,171.17,295.022,183.667,282.525z"
																	/>
																</g>
															</svg>
														{/if}{listItem.name}</button
													></td
												>
												<td>{listItem.quantity}</td>
												<td>{listItem.price}</td>
												{#if isPendingCdp()}
													<td class="flex justify-end gap-2 p-2">
														{#if detail.onEdit}
															<button
																class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-800 inline-flex items-center rounded-lg p-2 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
																aria-label="Edit item"
																onclick={() => {
																	detail.onEdit?.(listItem);
																}}
																type="button"
															>
																<svg
																	class="h-4 w-4"
																	aria-hidden="true"
																	fill="currentColor"
																	viewBox="0 0 20 20"
																	xmlns="http://www.w3.org/2000/svg"
																>
																	<path
																		d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
																	></path>
																</svg>
															</button>
														{/if}
														<button
															class="inline-flex items-center rounded-lg bg-red-600 p-2 text-center text-sm font-medium text-white hover:bg-red-700 focus:ring-4 focus:ring-red-300 focus:outline-none"
															aria-label="Delete item"
															onclick={async () => {
																if (detail.onDelete) {
																	await detail.onDelete(listItem);
																	return;
																}
																const { error } = await getSupabase()
																	.from('items')
																	.delete()
																	.match({ id: listItem.id })
																	.select()
																	.single();
																if (error) {
																	return;
																}
																const tr = document.querySelector(
																	`tr[data-utils="${String(listItem.id)}"]`
																);
																tr?.remove();
															}}
															type="button"
														>
															<svg
																class="h-4 w-4"
																aria-hidden="true"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	clip-rule="evenodd"
																	d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
																	fill-rule="evenodd"
																></path>
															</svg>
														</button>
													</td>
												{/if}
											</tr>
										{/each}
									</tbody>
								</table>
							</dd>
						{/if}
					{:else}
						<dd class="mb-4 font-light text-gray-400 transition-colors hover:text-gray-300">
							{stringValue(item.value)}
						</dd>
					{/if}
				{/each}
			</dl>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex items-center justify-between space-x-2 border-t border-gray-700 p-4">
		<!-- toggle edit mode if fields provided -->
		{#if !isEditing && fields.length > 0}
			<button
				class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-800 inline-flex items-center rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
				onclick={() => {
					isEditing = true;
					parseValuesToFields();
				}}
				type="button"
			>
				<svg
					class="mr-1 -ml-1 h-5 w-5"
					aria-hidden="true"
					fill="currentColor"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
					><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"
					></path><path
						clip-rule="evenodd"
						d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
						fill-rule="evenodd"
					></path></svg
				>
				Modifier
			</button>
		{/if}
		{#each actions as action (actionKey(action))}
			{#if action.type === 'selector'}
				<select
					class=" focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
					onchange={action.handler}
				>
					<option disabled selected value="">Choisir une option</option>
					{#each action.title as { name, value } (value)}
						<option {value}>{name}</option>
					{/each}
				</select>
			{/if}
			{#if action.type === 'validate'}
				<button
					class="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 inline-flex items-center rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
					onclick={action.handler}
					type="button"
				>
					<svg
						class="mr-1.5 -ml-1 h-5 w-5"
						aria-hidden="true"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							clip-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							fill-rule="evenodd"
						></path>
					</svg>
					{action.title}
				</button>
			{/if}
			{#if action.type === 'delete'}
				<button
					class="inline-flex items-center rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-red-700 focus:ring-4 focus:ring-red-300 focus:outline-none"
					onclick={action.handler}
					type="button"
				>
					<svg
						class="mr-1.5 -ml-1 h-5 w-5"
						aria-hidden="true"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							clip-rule="evenodd"
							d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
							fill-rule="evenodd"
						></path>
					</svg>
					{action.title}
				</button>
			{/if}
		{/each}
	</div>
</div>
