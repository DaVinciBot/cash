<script>
	import { supabase } from '$lib/supabaseClient';
	import { userdata } from '$lib/store';
	import { goto } from '$app/navigation';

	import InfoModal from '$lib/components/modals/InfoModal.svelte';

	let items = [{ nom: '', lien: '', price: '', quantity: '' }];
	let projectId = -1;
	let projectTitle = {};

	let name = '';
	let selectedTags = [];
	const TAG_OPTIONS = ['méca', 'info', 'élek'];

	async function updateProjectTitle() {
		const { data: projects, error } = await supabase.from('projects').select().in('id', projectId);
		if (error) {
			console.error(error);
			return;
		}
		projects.forEach((project) => {
			projectTitle[project.id] = project.name;
		});
	}

	userdata.subscribe((value) => {
		projectId = value?.projects?.map((p) => p.id) || [];
		if (projectId?.length > 0) {
			updateProjectTitle();
		}
		name = value?.name;
	});

	async function onSubmit(e) {
		e.preventDefault();

		if (projectId === -1) {
			alert('Vous devez être connecté à un projet pour pouvoir passer une commande.');
			return;
		}

		const form = e.target.form;
		const data = new FormData(form);
		const object = {};
		data.forEach((value, key) => {
			object[key] = value;
		});

		if (items.length === 0) {
			alert('Vous devez ajouter au moins un objet.');
			return;
		}
		// check if one of the items is empty
		let empty = false;
		items.forEach((item) => {
			if (
				(item.name === '' || item.lien === '' || item.price === '' || item.quantity === '') &&
				!empty
			) {
				empty = true;
			}
		});
		if (empty) {
			alert('Vous devez remplir tous les champs de chaque objet.');
			return;
		}

		const order = {
			comment: object.comment,
			projectId: projectId.length > 1 ? object.project : projectId[0],
			name: items.reduce((acc, item) => (acc || '') + item.nom + ', ', 0).slice(0, -2),
			tags: Array.isArray(selectedTags) ? selectedTags : []
		};

		const { data: orders, error } = await supabase.from('orders').insert([order]).select();
		if (error) {
			console.error(error);
			return;
		}

		// insert items
		const items_ = items.map((i) => {
			return {
				name: i.nom,
				link: i.lien,
				price: i.price,
				order_id: orders[0].id,
				quantity: i.quantity
			};
		});
		{
			const { error } = await supabase.from('items').insert(items_);
			if (error) {
				console.error(error);
				return;
			}
		}
		new InfoModal({
			target: document.body,
			props: {
				message: 'La commande a été proposé avec succès.',
				type: 'success',
				onClose: () => {
					goto('/admin/');
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
			{#each items as item, i}
				<div class="flex flex-col items-end sm:flex-row">
					<div class="w-20 sm:mr-5">
						<button
							class="justify-center w-full px-4 py-2 text-sm font-medium text-white align-middle transition-all border-2 border-dashed rounded-lg focus:ring-4 hover:bg-primary-600 hover:border-transparent focus:outline-none focus:ring-primary-800"
							on:click={(e) => {
								e.preventDefault();
								if (items.length > 1) {
									items = items.filter((item, index) => index !== i);
								}
							}}
						>
							-
						</button>
					</div>
					<form class="grid w-full grid-flow-row gap-5 objects md:grid-flow-col">
						<div>
							<label for="name">Nom</label>
							<input
								type="text"
								name={`name-${i}`}
								id={`name-${i}`}
								class=" border text-sm rounded-lg w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
								placeholder="Vis"
								required
								bind:value={item.nom}
							/>
						</div>
						<div>
							<label for="lien">Lien</label>
							<input
								type="text"
								name={`lien-${i}`}
								id={`lien-${i}`}
								class=" border text-sm rounded-lg w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
								placeholder="https://fr.rs-online.com/web/"
								required
								bind:value={item.lien}
							/>
						</div>
						<div>
							<label for="price">Prix</label>
							<div class="flex">
								<input
									type="number"
									name={`price-${i}`}
									id={`price-${i}`}
									class=" border-s border-y text-sm rounded-s-lg w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
									placeholder="15.5"
									required
									bind:value={item.price}
									step="0.01"
									min="0"
								/>
								<div
									class=" border text-sm rounded-e-lg block w-7 p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-gray-400 focus:ring-primary-500 focus:border-primary-500"
								>
									€
								</div>
							</div>
						</div>
						<div>
							<label for="quantity">Quantité</label>
							<input
								type="number"
								name={`quantity-${i}`}
								id={`quantity-${i}`}
								class=" border text-sm rounded-lg w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
								placeholder="5"
								required
								bind:value={item.quantity}
								step="1"
								min="1"
							/>
						</div>
					</form>
				</div>
			{/each}

			<div class="my-5">
				<button
					type="button"
					class="w-full px-4 text-xl text-white align-middle transition-all border-2 border-gray-100 border-dashed rounded-lg focus:ring-4 hover:bg-primary-600 hover:border-transparent focus:outline-none focus:ring-primary-800"
					on:click={(e) => {
						e.preventDefault();
						items = [...items, { nom: '', lien: '', price: '', quantity: '' }];
					}}
				>
					+
				</button>
			</div>
		</div>
		<h3 class="mb-2 text-2xl font-bold tracking-tight text-white">Détails</h3>
		<div class="grid gap-5 ml-5 details">
			<div class="col-span-2">
				<label for="comment">Commentaire</label>
				<textarea
					name="comment"
					id="comment"
					class=" border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
					placeholder="Commentaire"
				></textarea>
			</div>
			<div class="col-span-2">
				<label for="tags">Tags</label>
				<select
					id="tags"
					multiple
					size="3"
					class=" border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
					bind:value={selectedTags}
				>
					{#each TAG_OPTIONS as t}
						<option value={t}>{t}</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-400">
					Maintenir Ctrl (Cmd sur Mac) pour sélectionner plusieurs tags.
				</p>
			</div>
			{#if projectId?.length > 1}
				<div class="col-span-2">
					<label for="project">Sélection du projet</label>
					<select
						name="project"
						id="project"
						class=" border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-primary-500 focus:border-primary-500"
					>
						{#each Object.entries(projectTitle) as [key, value]}
							<option value={key}>{value}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="col-span-2">
				<button
					type="submit"
					class="px-4 py-2 text-sm font-medium text-white transition-all rounded-lg bg-primary-600 focus:ring-4 hover:bg-primary-800 hover:border-transparent focus:outline-none focus:ring-primary-800"
					on:click={onSubmit}>Envoyer</button
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
