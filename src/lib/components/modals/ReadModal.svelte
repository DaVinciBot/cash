<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { hideOnClickOutside } from '@davincibot/lib';
	import { onMount } from 'svelte';

	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

	import { Stepper } from '@davincibot/components';

	interface ReadHeader {
		title: string;
		sub?: string;
		stepper?: unknown[] | boolean;
	}

	interface ReadItem {
		id?: string | number;
		name: string;
		quantity?: string | number;
		price?: string | number;
		link?: string;
	}

	type ReadBodyValue = string | number | boolean | null | undefined | ReadItem[];

	interface ReadBodyEntry {
		label: string;
		value: ReadBodyValue;
		type?: string;
	}

	interface ReadValues {
		header: ReadHeader;
		body: ReadBodyEntry[];
	}

	interface SelectorOption {
		name: string;
		value: string;
	}

	interface SelectorAction {
		type: 'selector';
		title: SelectorOption[];
		handler: (event: Event) => void;
	}

	interface ButtonAction {
		type: 'edit' | 'validate' | 'delete';
		title: string;
		handler: (event: Event) => void;
	}

	type ReadAction = SelectorAction | ButtonAction;

	interface ReadModalProps {
		values?: ReadValues;
		files?: string[] | null;
		actions?: ReadAction[];
		id?: string;
		onClose?: (e: Event | Element | null) => void;
	}

	interface ReadFile {
		mime: string;
		url: string;
		name: string;
	}

	const noop = () => undefined;

	const {
		values = {
			header: {
				title: 'Pas de détails',
				sub: '-',
				stepper: []
			},
			body: [
				{
					label: 'Objets',
					value: [
						{
							name: 'Vis',
							quantity: 10,
							price: 10
						},
						{
							name: 'Ecrou',
							quantity: 10,
							price: 10
						}
					]
				},
				{
					label: 'Date',
					value: '2024-05-17'
				},
				{
					label: 'Prédictions',
					value: 'Victoire de SKT, 2-1' // ou bien 'Match non joué'
				},
				{
					label: 'Utilisateur',
					value: 'Mascode'
				}
			]
		},
		files = [],
		actions = [],
		id = 'readModal',
		onClose = noop
	}: ReadModalProps = $props();

	let current_file = $state('');
	let current_file_index = $state(0);
	let scroll_body: HTMLDivElement | null = $state(null);

	let isMobile = $state(false);
	const files_array = $state<ReadFile[]>([]);

	const __onClose = (e: Event | Element | null) => {
		onClose(e);
	};

	function attachmentPaths() {
		return Array.isArray(files) ? files : [];
	}

	function isPendingCdp() {
		return values.body.find((el) => el.label === 'Status')?.type === 'pending_cdp';
	}

	function actionKey(action: ReadAction, index: number) {
		const title =
			typeof action.title === 'string'
				? action.title
				: action.title.map((option) => option.value).join('-');
		return `${action.type}-${String(index)}-${title}`;
	}

	function itemKey(item: ReadItem, index: number) {
		return item.id === undefined ? `${item.name}-${String(index)}` : String(item.id);
	}

	function formatItemData(item: ReadItem) {
		return item.id === undefined ? '' : String(item.id);
	}

	async function removeItem(item: ReadItem) {
		if (item.id === undefined) {
			return;
		}
		const { error } = await getSupabaseBrowserClient()
			.from('items')
			.delete()
			.match({ id: item.id })
			.select()
			.single();

		if (error) {
			return;
		}

		const tr = document.querySelector(`tr[data-utils="${String(item.id)}"]`);
		tr?.remove();
	}

	function getNameFromUrl(url: string) {
		try {
			const pathname = new URL(url).pathname;
			return decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? 'Fichier');
		} catch {
			const urlWithoutQuery = url.split('?')[0] ?? url;
			return decodeURI(urlWithoutQuery.split('/').at(-1) ?? 'Fichier');
		}
	}

	function moveFile(direction: -1 | 1) {
		const paths = attachmentPaths();
		const nextIndex = current_file_index + direction;
		const nextFile = files_array[nextIndex];
		if (nextIndex < 0 || nextIndex >= paths.length || !nextFile || !scroll_body) {
			return;
		}

		current_file_index = nextIndex;
		current_file = nextFile.name;
		const offset = (scroll_body.scrollWidth / paths.length) * current_file_index;
		scroll_body.style.transform = `translateX(-${String(offset)}px)`;
	}

	onMount(async () => {
		const popup = document.querySelector<HTMLElement>(`#popup-${id}`);
		if (popup) {
			hideOnClickOutside(popup, __onClose);
		}
		// check if mobile
		if (window.innerWidth < 768) {
			isMobile = true;
		} else {
			isMobile = false;
		}
		const paths = attachmentPaths();
		if (paths.length > 0) {
			// get the all signed url from supabase
			const { data: urls } = await getSupabaseBrowserClient()
				.storage.from('proof')
				.createSignedUrls(paths, 600);
			if (!urls) {
				return;
			}

			for (let i = 0; i < urls.length; i++) {
				const signedUrl = urls[i];
				if (!signedUrl || signedUrl.error) {
					continue;
				}
				const fileUrl = signedUrl.signedUrl;
				if (!fileUrl) {
					continue;
				}
				// get the blob from the url
				const r = await fetch(fileUrl);
				if (!r.ok) {
					continue;
				}
				const b = await r.blob();
				files_array[i] = {
					mime: b.type,
					url: fileUrl,
					name: getNameFromUrl(fileUrl)
				};
			}
			current_file = files_array[0]?.name ?? '';
		}
	});
</script>

<div
	{id}
	class="fixed top-0 right-0 left-0 z-50 h-full w-full items-center justify-center overflow-x-hidden overflow-y-auto md:inset-0"
	aria-hidden="true"
	data-toggle="true"
	tabindex="-1"
>
	<OverlayBackdrop />
	<div class="relative m-auto flex h-full w-full p-4">
		<!-- Modal content -->
		<div
			id="popup-{id}"
			class="modal relative m-auto max-w-[80%] min-w-96 rounded-lg bg-gray-800 p-4 sm:p-5 md:max-w-[75%] lg:max-w-[70%] xl:max-w-[65%] 2xl:max-w-[55%]"
		>
			<!-- Modal header -->
			<div class="mb-4 flex justify-between rounded-t sm:mb-5">
				<div class="flex w-full text-lg text-white md:text-xl">
					<h3 class="mr-2 font-semibold">{values.header.title}</h3>
					{#if values.header.sub}
						<p class="font-semibold text-gray-400">- {values.header.sub}</p>
					{/if}
					{#if values.header.stepper}
						<Stepper></Stepper>
					{/if}
				</div>
				<div>
					<button
						class="inline-flex rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
						data-modal-toggle={id}
						data-toggle="true"
						onclick={__onClose}
						type="button"
					>
						<svg
							class="h-5 w-5"
							aria-hidden="true"
							data-toggle="true"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
							><path
								clip-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								fill-rule="evenodd"
							></path></svg
						>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
			</div>
			<div class="grid space-x-4 {attachmentPaths().length > 0 ? 'md:grid-cols-2' : 'grid-cols-1'}">
				{#if attachmentPaths().length > 0}
					<!-- Make a carousel -->
					<div class="mb-2">
						<div class="header">
							<h3 class="text-lg font-semibold text-white">Pièces jointes</h3>
							<div class="mt-2 mb-2 flex w-full justify-between">
								<button
									class="
									inline-flex rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
									aria-label="Pièce jointe précédente"
									onclick={() => {
										moveFile(-1);
									}}
									type="button"
								>
									<svg
										class="h-5 w-5"
										aria-hidden="true"
										fill="white"
										viewBox="0 0 20 20"
										xmlns="http://www.w3.org/2000/svg"
										><path
											clip-rule="evenodd"
											d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
											fill-rule="evenodd"
										></path></svg
									>
								</button>
								<p class="items-center self-center text-center text-sm text-gray-400">
									{current_file || 'Chargement'} - {current_file_index + 1}/{attachmentPaths()
										.length}
								</p>
								<button
									class="
								inline-flex rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
									aria-label="Pièce jointe suivante"
									onclick={() => {
										moveFile(1);
									}}
									type="button"
								>
									<svg
										class="h-5 w-5 rotate-180"
										aria-hidden="true"
										fill="white"
										viewBox="0 0 20 20"
										xmlns="http://www.w3.org/2000/svg"
										><path
											clip-rule="evenodd"
											d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
											fill-rule="evenodd"
										></path></svg
									>
								</button>
							</div>
						</div>
						<div class="flex aspect-[1/1.414] h-auto w-88 gap-2 overflow-x-hidden md:w-96">
							<div bind:this={scroll_body} class="flex rounded-lg">
								{#each files_array as { mime, url, name } (url)}
									<div class="flex w-88 flex-col md:w-96">
										<!-- <p class="text-white">{url?.split('/')[10].split('?')[0]}</p> -->
										{#if mime === 'application/pdf' && !isMobile}
											<iframe class="h-full" frameborder="0" src={url} title={name}></iframe>
										{:else if mime === 'application/pdf' && isMobile}
											<iframe
												class="h-full"
												frameborder="0"
												src="https://docs.google.com/viewer?url={url}&embedded=true"
												title={name}
											></iframe>
										{:else if mime.startsWith('image/')}
											<img class="w-full max-w-96" alt={name} src={url} />
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<dl>
					{#each values.body as { label, value } (label)}
						<dt class="mb-2 leading-none font-semibold text-white">{label}</dt>
						{#if Array.isArray(value)}
							<dd class="mb-4 ml-2 font-light text-gray-400 sm:mb-5">
								<table class="w-full border-separate">
									<thead class="font-bold">
										<tr>
											<th scope="col">Nom</th>
											<th scope="col">Quantité</th>
											<th scope="col">Prix</th>
											{#if isPendingCdp()}
												<th class="w-2.5" scope="col"></th>
											{/if}
										</tr>
									</thead>
									<tbody>
										{#each value as item, index (itemKey(item, index))}
											<tr data-utils={formatItemData(item)}>
												<td class="p-2">
													<!-- eslint-disable svelte/no-navigation-without-resolve -->
													<a href={item.link ?? ''} rel="noopener noreferrer" target="_blank"
														>{item.name}</a
													>
													<!-- eslint-enable svelte/no-navigation-without-resolve -->
												</td>
												<td>{item.quantity}</td>
												<td>{item.price}</td>
												{#if isPendingCdp()}
													<td>
														<button
															class="inline-flex items-center rounded-lg bg-red-500 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-red-600 focus:ring-4 focus:ring-red-900 focus:outline-none"
															aria-label="Supprimer {item.name}"
															onclick={() => {
																void removeItem(item);
															}}
															type="button"
														>
															<svg
																class="-mx-2.5 h-5 w-5"
																aria-hidden="true"
																fill="currentColor"
																viewBox="0 0 20 20"
																xmlns="http://www.w3.org/2000/svg"
																><path
																	clip-rule="evenodd"
																	d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
																	fill-rule="evenodd"
																></path></svg
															>
														</button>
													</td>
												{/if}
											</tr>
										{/each}
									</tbody>
								</table>
							</dd>
						{:else}
							<dd
								class="mb-4 font-light text-gray-400 transition-colors hover:text-gray-300 sm:mb-5"
							>
								{value}
							</dd>
						{/if}
					{/each}
				</dl>
			</div>
			<div class="flex items-center justify-between">
				{#each actions as action, index (actionKey(action, index))}
					{#if action.type === 'selector'}
						<select
							class="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
							onchange={action.handler}
						>
							<option disabled selected value="">Choisir une option</option>
							{#each action.title as { name, value } (value)}
								<option {value}>{name}</option>
							{/each}
						</select>
					{/if}
					{#if action.type === 'edit'}
						<button
							class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-800 inline-flex items-center rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
							onclick={action.handler}
							type="button"
						>
							<svg
								class="mr-1 -ml-1 h-5 w-5"
								aria-hidden="true"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
								><path
									d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"
								></path><path
									clip-rule="evenodd"
									d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
									fill-rule="evenodd"
								></path></svg
							>
							{action.title}
						</button>
					{/if}
					{#if action.type === 'validate'}
						<button
							class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-800 inline-flex items-center rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:ring-4 focus:outline-none"
							onclick={action.handler}
							type="button"
						>
							<svg
								class="mr-1.5 -ml-1 h-5 w-5"
								aria-hidden="true"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
								><path
									clip-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									fill-rule="evenodd"
								></path></svg
							>
							{action.title}
						</button>
					{/if}
					{#if action.type === 'delete'}
						<button
							class="inline-flex items-center rounded-lg bg-red-500 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-red-600 focus:ring-4 focus:ring-red-900 focus:outline-none"
							onclick={action.handler}
							type="button"
						>
							<svg
								class="mr-1.5 -ml-1 h-5 w-5"
								aria-hidden="true"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
								><path
									clip-rule="evenodd"
									d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
									fill-rule="evenodd"
								></path></svg
							>
							{action.title}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>
