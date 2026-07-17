<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userdata } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

	import { InfoModal } from '@davincibot/components';
	import { mountClosable } from '@davincibot/lib';

	interface ItemEntry {
		nom: string;
		lien: string;
		price: string;
		quantity: string;
	}

	let items = $state<ItemEntry[]>([{ nom: '', lien: '', price: '', quantity: '' }]);
	let projectId = $state<number[]>([]);
	const projectTitle = $state<Record<number, string>>({});

	let selectedTags = $state<string[]>([]);
	const TAG_OPTIONS = ['méca', 'info', 'élek'];

	interface ProjectRow {
		id: number;
		name: string;
	}

	async function updateProjectTitle() {
		const supabase = getSupabaseBrowserClient();
		const { data: projects, error } = (await supabase
			.from('projects')
			.select('id, name')
			.in('id', projectId)) as { data: ProjectRow[] | null; error: unknown };
		if (error) {
			return;
		}
		for (const project of projects ?? []) {
			projectTitle[project.id] = project.name;
		}
	}

	userdata.subscribe((value) => {
		projectId = value?.projects.map((p) => p.id) ?? [];
		if (projectId.length > 0) {
			void updateProjectTitle();
		}
	});

	async function onSubmit(e: MouseEvent) {
		e.preventDefault();

		if (projectId.length === 0) {
			alert('Vous devez être connecté à un projet pour pouvoir passer une commande.');
			return;
		}

		const button = e.currentTarget as HTMLButtonElement;
		const form = button.closest('form');
		if (!form) {
			return;
		}
		const data = new FormData(form);
		const commentVal = data.get('comment');
		const comment = typeof commentVal === 'string' ? commentVal : '';
		const projectVal = data.get('project');
		const project = typeof projectVal === 'string' ? projectVal : null;

		if (items.length < 1) {
			alert('Vous devez ajouter au moins un objet.');
			return;
		}
		// check if one of the items is empty
		const hasEmptyItem = items.some(
			(item) => item.nom === '' || item.lien === '' || item.price === '' || item.quantity === ''
		);
		if (hasEmptyItem) {
			alert('Vous devez remplir tous les champs de chaque objet.');
			return;
		}

		const itemNames = items.map((item) => item.nom);
		const orderName = itemNames.join(', ');

		const order = {
			comment,
			projectId: projectId.length > 1 ? (project ? parseInt(project) : projectId[0]) : projectId[0],
			name: orderName,
			tags: Array.isArray(selectedTags) ? selectedTags : []
		};

		const supabase = getSupabaseBrowserClient();
		const { data: orders, error } = await supabase.from('orders').insert([order]).select();
		if (error) {
			return;
		}

		// insert items
		const ordersTyped = orders as { id: number }[];
		const items_ = items.map((i) => {
			return {
				name: i.nom,
				link: i.lien,
				price: parseFloat(i.price),
				order_id: ordersTyped.at(0)?.id ?? 0,
				quantity: parseInt(i.quantity)
			};
		});
		{
			const supabase2 = getSupabaseBrowserClient();
			const { error: itemErr } = await supabase2.from('items').insert(items_);
			if (itemErr) {
				return;
			}
		}
		mountClosable(InfoModal, {
			target: document.body,
			props: {
				message: 'La commande a été proposé avec succès.',
				type: 'success',
				onClose: () => {
					void goto(resolve('/'));
				}
			}
		});
	}
</script>

<h2 class="mb-4 ml-4 text-4xl font-bold tracking-tight text-white">Nouvelle Commande</h2>
<div class="sm:ml-10">
	<h3 class="text-2xl font-bold tracking-tight text-white sm:mb-2">Objets</h3>
	<form>
		<div class="sm:pl-5">
			{#each items as item, i (i)}
				<div class="flex flex-col items-end sm:flex-row">
					<div class="w-20 sm:mr-5">
						<button
							class="hover:bg-primary-600 focus:ring-primary-800 w-full justify-center rounded-lg border-2 border-dashed px-4 py-2 align-middle text-sm font-medium text-white transition-all hover:border-transparent focus:ring-4 focus:outline-none"
							onclick={(e: MouseEvent) => {
								e.preventDefault();
								if (items.length > 1) {
									items = items.filter((_item, index) => index !== i);
								}
							}}
						>
							-
						</button>
					</div>
					<div class="objects grid w-full grid-flow-row gap-5 md:grid-flow-col">
						<div>
							<label for={`name-${String(i)}`}>Nom</label>
							<input
								type="text"
								name={`name-${String(i)}`}
								id={`name-${String(i)}`}
								class=" focus:ring-primary-500 focus:border-primary-500 w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
								placeholder="Vis"
								required
								bind:value={item.nom}
							/>
						</div>
						<div>
							<label for={`lien-${String(i)}`}>Lien</label>
							<input
								type="text"
								name={`lien-${String(i)}`}
								id={`lien-${String(i)}`}
								class=" focus:ring-primary-500 focus:border-primary-500 w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
								placeholder="https://fr.rs-online.com/web/"
								required
								bind:value={item.lien}
							/>
						</div>
						<div>
							<label for={`price-${String(i)}`}>Prix</label>
							<div class="flex">
								<input
									type="number"
									name={`price-${String(i)}`}
									id={`price-${String(i)}`}
									class=" focus:ring-primary-500 focus:border-primary-500 w-full rounded-s-lg border-y border-s border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
									placeholder="15.5"
									required
									bind:value={item.price}
									step="0.01"
									min="0"
								/>
								<div
									class=" focus:ring-primary-500 focus:border-primary-500 block w-7 rounded-e-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-gray-400 placeholder-gray-400"
								>
									€
								</div>
							</div>
						</div>
						<div>
							<label for={`quantity-${String(i)}`}>Quantité</label>
							<input
								type="number"
								name={`quantity-${String(i)}`}
								id={`quantity-${String(i)}`}
								class=" focus:ring-primary-500 focus:border-primary-500 w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
								placeholder="5"
								required
								bind:value={item.quantity}
								step="1"
								min="1"
							/>
						</div>
					</div>
				</div>
			{/each}

			<div class="my-5">
				<button
					type="button"
					class="hover:bg-primary-600 focus:ring-primary-800 w-full rounded-lg border-2 border-dashed border-gray-100 px-4 align-middle text-xl text-white transition-all hover:border-transparent focus:ring-4 focus:outline-none"
					onclick={(e: MouseEvent) => {
						e.preventDefault();
						items = [...items, { nom: '', lien: '', price: '', quantity: '' }];
					}}
				>
					+
				</button>
			</div>
		</div>
		<h3 class="mb-2 text-2xl font-bold tracking-tight text-white">Détails</h3>
		<div class="details ml-5 grid gap-5">
			<div class="col-span-2">
				<label for="comment">Commentaire</label>
				<textarea
					name="comment"
					id="comment"
					class=" focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
					placeholder="Commentaire"
				></textarea>
			</div>
			<div class="col-span-2">
				<label for="tags">Tags</label>
				<select
					id="tags"
					multiple
					size="3"
					class=" focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
					bind:value={selectedTags}
				>
					{#each TAG_OPTIONS as t (t)}
						<option value={t}>{t}</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-400">
					Maintenir Ctrl (Cmd sur Mac) pour sélectionner plusieurs tags.
				</p>
			</div>
			{#if projectId.length > 1}
				<div class="col-span-2">
					<label for="project">Sélection du projet</label>
					<select
						name="project"
						id="project"
						class=" focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400"
					>
						{#each Object.entries(projectTitle) as [key, value] (key)}
							<option {value}>{value}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="col-span-2">
				<button
					type="submit"
					class="bg-primary-600 hover:bg-primary-800 focus:ring-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:border-transparent focus:ring-4 focus:outline-none"
					onclick={onSubmit}>Envoyer</button
				>
			</div>
		</div>
	</form>
</div>

<style>
	.objects {
		grid-template-columns: 1fr 2fr 90px 90px;
	}
	@media (max-width: 640px) {
		.objects {
			grid-template-columns: 1fr;
		}
	}
	.details {
		grid-template-columns: 1fr 1fr;
	}
</style>
