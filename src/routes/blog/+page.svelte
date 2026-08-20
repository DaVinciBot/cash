<script lang="ts">
	import { Stepper } from '@davincibot/components';
	import type { Enums, Json } from '@davincibot/database-types';
	import { getSupabaseBrowserClient, supabaseKey, supabaseUrl } from '@davincibot/lib/supabase';
	import { Carta, CartaEditor } from 'carta-md';
	import 'carta-md/default.css';
	import { onMount } from 'svelte';

	interface TranscodeImageResult {
		success: boolean;
		index: number;
		url: string;
	}

	interface TranscodeHeroResult {
		success: boolean;
		images?: { large: string; small: string };
	}

	interface TranscodeOgResult {
		success: boolean;
		image?: string;
	}

	interface TranscodeBodyResult {
		success: boolean;
		images?: TranscodeImageResult[];
	}

	interface MetaData {
		excerpt: string;
		heroImage: string;
		heroAlt: string;
		heroImageSmall?: string;
		heroImageSocial?: string;
		author: { name: string; role: string };
		tag: string;
	}

	interface ArticleRow {
		title: string | null;
		slug: string | null;
		last_update: string | null;
		publish_date: string | null;
		data: MetaData | null;
		state: string | null;
	}

	interface ArticleDetail {
		title: string | null;
		slug: string | null;
		body: string | null;
		state: Enums<'blog_state'> | null;
		data: MetaData | null;
	}

	interface StepItem {
		done: boolean;
		icon: string;
	}

	// Listing state
	let articles = $state<
		{
			title: string | null;
			slug: string | null;
			date: string | null;
			state: string;
			cover: string | null;
		}[]
	>([]);
	let search = $state('');
	let loadingList = $state(false);

	let title = $state('');
	let slug = $state('');
	let body = $state('');
	let articleState: Enums<'blog_state'> = $state('draft');
	let meta = $state<MetaData>({
		excerpt: '',
		heroImage: '',
		heroAlt: '',
		author: { name: '', role: '' },
		tag: ''
	});

	let saving = $state<boolean>(false);
	let message = $state('');
	let selectedSlug = $state('');
	let saveSteps = $state<StepItem[]>([]);

	function toSlug(t = '') {
		return t
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}+/gu, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 120);
	}

	async function ensureFolder(folderSlug: string): Promise<boolean> {
		const supabase = getSupabaseBrowserClient();
		// For public bucket 'articles', create a zero-byte .keep if empty
		try {
			const path = `${folderSlug}/.keep`;
			const { error } = await supabase.storage.from('articles').upload(path, new Blob([]), {
				upsert: false,
				contentType: 'application/octet-stream'
			});
			if (error && !error.message.includes('The resource already exists')) {
				// ignore if already exists
				return false;
			}
			return true;
		} catch {
			return false;
		}
	}

	const carta = new Carta({ sanitizer: (html) => html });

	async function handleUpload(ev: Event) {
		const supabase = getSupabaseBrowserClient();
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			return;
		}
		try {
			if (!slug) {
				slug = toSlug(title);
			}
			await ensureFolder(slug);
			const fileName = `${String(Date.now())}-${file.name}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
			const filePath = `tmp/${fileName}`;
			const { error } = await supabase.storage
				.from('articles')
				.upload(filePath, file, { upsert: false });
			if (error && !error.message.includes('The resource already exists')) {
				message = `Erreur upload: ${error.message}`;
				return;
			}
			const { data: pub } = supabase.storage.from('articles').getPublicUrl(filePath);
			const url = pub.publicUrl;
			if (url) {
				// Append markdown reference at end
				const isImage = file.type.startsWith('image/');
				const snippet = isImage ? `\n\n![](${url})\n` : `\n\n[${file.name}](${url})\n`;
				body = body + snippet;
				message = 'Fichier téléversé';
			}
		} catch {
			message = 'Erreur upload';
		} finally {
			// reset input value to allow re-uploading same file name
			input.value = '';
		}
	}

	// `transcode` exige la permission `blog.draft.write`, qu'elle lit dans le jeton
	// de l'appelant : c'est donc le JWT de session qui doit voyager sur
	// `Authorization`, jamais la clé publiable. Cette clé n'étant pas un JWT, la
	// passerelle rejetait la requête en `Invalid JWT`. Elle part désormais sur
	// `apikey`, seul en-tête qui l'accepte.
	async function transcodeHeaders(): Promise<Record<string, string>> {
		const {
			data: { session }
		} = await getSupabaseBrowserClient().auth.getSession();
		return {
			'Content-Type': 'application/json',
			apikey: supabaseKey,
			Authorization: `Bearer ${session?.access_token ?? ''}`
		};
	}

	async function transcodeHero(): Promise<boolean> {
		const supabase = getSupabaseBrowserClient();
		if (!meta.heroImage) {
			return true;
		}
		// Skip if already transcoded (heuristic: contains 'hero-large' and ends in .webp)
		if (meta.heroImage.includes('hero-large') && meta.heroImage.endsWith('.webp')) {
			return true;
		}

		try {
			const res = await fetch(`${supabaseUrl}functions/v1/transcode/blog-post-hero`, {
				method: 'POST',
				headers: await transcodeHeaders(),
				body: JSON.stringify({
					image: meta.heroImage,
					title,
					bucketName: 'articles',
					folder: slug,
					quality: 40
				})
			});
			const data = (await res.json()) as TranscodeHeroResult;
			if (data.success && data.images) {
				const oldUrl = meta.heroImage;
				meta.heroImage = data.images.large;
				meta.heroImageSmall = data.images.small;

				if (oldUrl.includes('/articles/tmp/')) {
					const path = oldUrl.split('/articles/')[1];
					if (path) {
						await supabase.storage.from('articles').remove([path]);
					}
				}
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	async function transcodeOg(): Promise<boolean> {
		if (!meta.heroImage) {
			return true;
		}

		try {
			const res = await fetch(`${supabaseUrl}functions/v1/transcode/blog-post-og`, {
				method: 'POST',
				headers: await transcodeHeaders(),
				body: JSON.stringify({
					image: meta.heroImage,
					title,
					bucketName: 'articles',
					folder: slug
				})
			});
			const data = (await res.json()) as TranscodeOgResult;
			if (data.success && data.image) {
				meta.heroImageSocial = data.image;
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	async function transcodeBodyImages(): Promise<boolean> {
		const supabase = getSupabaseBrowserClient();
		if (!body) {
			return true;
		}

		// Find all images: ![alt](url)
		const regex = /!\[.*?\]\((.*?)\)/g;
		let match;
		const imagesToTranscode: string[] = [];

		while ((match = regex.exec(body)) !== null) {
			const url = match[1] ?? '';
			// Check if it's a supabase storage URL and not already transcoded
			// Heuristic for already transcoded: ends with .webp and contains 'image-' and digits
			const isTranscoded = /\/image-\d+-\d+\.webp$/.test(url);
			if (url.includes(supabaseUrl) && !isTranscoded) {
				imagesToTranscode.push(url);
			}
		}

		if (imagesToTranscode.length === 0) {
			return true;
		}

		// Remove duplicates
		const uniqueImages = [...new Set(imagesToTranscode)];

		try {
			const res = await fetch(`${supabaseUrl}functions/v1/transcode/blog-post-image`, {
				method: 'POST',
				headers: await transcodeHeaders(),
				body: JSON.stringify({
					images: uniqueImages,
					bucketName: 'articles',
					folder: slug,
					maxWidth: 1200,
					quality: 60
				})
			});
			const data = (await res.json()) as TranscodeBodyResult;

			if (data.success && data.images) {
				// Replace URLs in body
				let newBody = body;
				// data.images is array of { index, success, url }
				// The index corresponds to the input array `uniqueImages`

				const toDelete: string[] = [];
				for (const result of data.images) {
					if (result.success) {
						const originalUrl = uniqueImages[result.index];
						if (!originalUrl) {
							continue;
						}
						const newUrl = result.url;
						// Global replace of this URL
						newBody = newBody.split(originalUrl).join(newUrl);

						if (originalUrl.includes('/articles/tmp/')) {
							const path = originalUrl.split('/articles/')[1];
							if (path) {
								toDelete.push(path);
							}
						}
					}
				}
				body = newBody;
				if (toDelete.length) {
					await supabase.storage.from('articles').remove(toDelete);
				}
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	async function save() {
		const supabase = getSupabaseBrowserClient();
		message = '';
		if (!title.trim()) {
			message = 'Le titre est requis';
			return;
		}
		slug = toSlug(slug);
		if (!slug) {
			message = 'Slug invalide';
			return;
		}
		saving = true;
		const steps: [StepItem, StepItem, StepItem, StepItem, StepItem] = [
			{ done: false, icon: 'processing' },
			{ done: false, icon: 'link' },
			{ done: false, icon: 'shipping' },
			{ done: false, icon: 'shipping' },
			{ done: false, icon: 'checked-document' }
		];
		saveSteps = [...steps];

		try {
			// 1. Ensure folder
			if (await ensureFolder(slug)) {
				steps[0].done = true;
			} else {
				steps[0].icon = 'cancel';
			}
			saveSteps = [...steps];

			// 2. Transcode OG
			message = 'Génération OG...';
			if (await transcodeOg()) {
				steps[1].done = true;
			} else {
				steps[1].icon = 'cancel';
			}
			saveSteps = [...steps];

			// 3. Transcode Hero
			message = 'Optimisation couverture...';
			if (await transcodeHero()) {
				steps[2].done = true;
			} else {
				steps[2].icon = 'cancel';
			}
			saveSteps = [...steps];

			// 4. Transcode Body
			message = 'Optimisation contenu...';
			if (await transcodeBodyImages()) {
				steps[3].done = true;
			} else {
				steps[3].icon = 'cancel';
			}
			saveSteps = [...steps];

			const row = {
				title,
				slug,
				body,
				state: articleState,
				data: meta as unknown as Json
			};
			// upsert by primary key (slug)
			const { error } = await supabase.from('blog').upsert(row).select('slug').single();
			if (error) {
				message = `Erreur enregistrement: ${error.message}`;
				steps[4].icon = 'cancel';
			} else {
				message = 'Article enregistré';
				steps[4].done = true;
				selectedSlug = slug;
				await loadArticles();
			}
			saveSteps = [...steps];
		} catch {
			message = 'Erreur système';
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		await loadArticles();
	});

	async function loadArticles() {
		const supabase = getSupabaseBrowserClient();
		try {
			loadingList = true;
			const { data, error } = (await supabase
				.from('blog')
				.select('title,slug,last_update,publish_date,data,state')
				.order('publish_date', { ascending: false, nullsFirst: false })) as {
				data: ArticleRow[] | null;
				error: unknown;
			};
			if (error) {
				return;
			}
			// normalize and sort fallback by last_update
			const list = (data ?? []).map((row) => {
				const date = row.publish_date ?? row.last_update ?? null;
				return {
					title: row.title,
					slug: row.slug,
					date,
					state: row.state ?? 'draft',
					cover: row.data?.heroImage ?? null
				};
			});
			list.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
			articles = list;
		} finally {
			loadingList = false;
		}
	}

	async function loadArticle(s: string) {
		const supabase = getSupabaseBrowserClient();
		try {
			const { data, error } = (await supabase.from('blog').select('*').eq('slug', s).single()) as {
				data: ArticleDetail | null;
				error: unknown;
			};
			if (error) {
				message = `Erreur chargement: ${(error as { message?: string }).message ?? ''}`;
				return;
			}
			if (!data) {
				return;
			}
			title = data.title ?? '';
			slug = data.slug ?? '';
			body = data.body ?? '';
			articleState = data.state ?? 'draft';
			meta = data.data ?? {
				excerpt: '',
				heroImage: '',
				heroAlt: '',
				author: { name: '', role: '' },
				tag: ''
			};
			selectedSlug = slug;
			message = '';
		} catch {
			message = 'Erreur chargement';
		}
	}

	function newArticle() {
		title = '';
		slug = '';
		body = '';
		articleState = 'draft';
		meta = { excerpt: '', heroImage: '', heroAlt: '', author: { name: '', role: '' }, tag: '' };
		selectedSlug = '';
		message = '';
	}

	async function handleCoverUpload(ev: Event) {
		const supabase = getSupabaseBrowserClient();
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			return;
		}
		try {
			if (!slug) {
				slug = toSlug(title);
			}
			await ensureFolder(slug);
			const fileName = `cover-${String(Date.now())}-${file.name}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
			const filePath = `tmp/${fileName}`;
			const { error } = await supabase.storage
				.from('articles')
				.upload(filePath, file, { upsert: false });
			if (error && !error.message.includes('The resource already exists')) {
				message = `Erreur upload cover: ${error.message}`;
				return;
			}
			const { data: pub } = supabase.storage.from('articles').getPublicUrl(filePath);
			const url = pub.publicUrl;
			if (url) {
				meta = { ...meta, heroImage: url };
				message = 'Image de couverture téléversée';
			}
		} catch {
			message = 'Erreur upload cover';
		} finally {
			input.value = '';
		}
	}

	async function handleSave() {
		await save();
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-6xl">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Articles</h1>
		<button
			class="bg-primary-600 hover:bg-primary-700 rounded px-3 py-1.5 text-sm text-white"
			onclick={newArticle}>Nouvel article</button
		>
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- Editor -->
		<div class="rounded-lg border border-gray-700 bg-gray-800/40 p-3 md:col-span-2">
			<div class="mb-2 flex items-center justify-between">
				<div class="text-sm">Contenu</div>
				<label class="flex items-center gap-2 text-xs">
					<span class="opacity-80">Ajouter un fichier</span>
					<input
						class="text-xs file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:text-white hover:file:bg-gray-600"
						onchange={handleUpload}
						type="file"
					/>
				</label>
			</div>
			<CartaEditor {carta} bind:value={body} />
		</div>
		<!-- Sidebar -->
		<div class="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800/40 p-3">
			<div>
				<label class="mb-1 block text-sm" for="search">Rechercher par titre</label>
				<input
					id="search"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					placeholder="Rechercher..."
					bind:value={search}
				/>
			</div>
			<div class="max-h-64 overflow-auto rounded border border-gray-700">
				{#if loadingList}
					<div class="p-3 text-sm text-gray-400">Chargement…</div>
				{:else if !articles.length}
					<div class="p-3 text-sm text-gray-400">Aucun article</div>
				{:else}
					<ul class="divide-y divide-gray-700">
						{#each articles.filter((a) => (a.title ?? '')
								.toLowerCase()
								.includes(search.toLowerCase())) as a (a.slug)}
							<li>
								<button
									class={`w-full cursor-pointer rounded p-2 text-left hover:bg-gray-700/40 ${a.slug === selectedSlug ? 'bg-gray-700/30' : ''}`}
									onclick={() => {
										if (a.slug) {
											void loadArticle(a.slug);
										}
									}}
									type="button"
								>
									<div class="text-sm font-medium">{a.title}</div>
									<div class="flex items-center justify-between gap-2">
										<div class="truncate text-xs text-gray-400">{a.slug}</div>
										<span
											class="rounded-full px-1.5 py-0.5 text-[10px] {a.state === 'published'
												? 'border border-green-800 bg-green-900/50 text-green-300'
												: a.state === 'deleted'
													? 'border border-red-800 bg-red-900/50 text-red-300'
													: 'border border-gray-600 bg-gray-700 text-gray-300'}"
										>
											{a.state === 'published'
												? 'Publié'
												: a.state === 'deleted'
													? 'Supprimé'
													: 'Brouillon'}
										</span>
									</div>
									{#if a.date}
										<div class="text-[10px] text-gray-500">
											{new Date(a.date).toLocaleDateString('fr-FR')}
										</div>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<div>
				<label class="mb-1 block text-sm" for="title">Titre</label>
				<input
					id="title"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					oninput={() => (slug = toSlug(title))}
					bind:value={title}
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="slug">Slug</label>
				<input
					id="slug"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					bind:value={slug}
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="state">État</label>
				<select
					id="state"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					bind:value={articleState}
				>
					<option value="draft">Brouillon</option>
					<option value="published">Publié</option>
					<option value="deleted">Supprimé</option>
				</select>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="excerpt">Extrait</label>
				<textarea
					id="excerpt"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					rows="3"
					bind:value={meta.excerpt}></textarea>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="tags"
					>Tags (séparés par espaces, virgules ou #)</label
				>
				<input
					id="tags"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					bind:value={meta.tag}
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="heroImage">Image de couverture (URL)</label>
				<input
					id="heroImage"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					bind:value={meta.heroImage}
				/>
				<div class="mt-2 flex items-center gap-2">
					<input
						class="text-xs file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:text-white hover:file:bg-gray-600"
						accept="image/*"
						onchange={handleCoverUpload}
						type="file"
					/>
					{#if meta.heroImage}
						<img
							class="h-10 w-10 rounded border border-gray-700 object-cover"
							alt="couverture"
							src={meta.heroImage}
						/>
					{/if}
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="heroAlt">Texte alternatif</label>
				<input
					id="heroAlt"
					class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
					bind:value={meta.heroAlt}
				/>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<div>
					<label class="mb-1 block text-sm" for="authorName">Auteur</label>
					<input
						id="authorName"
						class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
						bind:value={meta.author.name}
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm" for="authorRole">Rôle</label>
					<input
						id="authorRole"
						class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
						bind:value={meta.author.role}
					/>
				</div>
			</div>

			<button
				class="bg-primary-600 hover:bg-primary-700 rounded px-4 py-2 text-white disabled:opacity-50"
				disabled={saving}
				onclick={handleSave}
			>
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</div>
</div>

{#if saving || message}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-xl">
			{#if saveSteps.length > 0}
				<div class="mb-4">
					<Stepper steps={saveSteps} />
				</div>
			{/if}
			<div class="mb-4 text-lg font-semibold text-white">
				{saving ? 'Enregistrement en cours...' : 'Information'}
			</div>
			<div class="mb-4 text-gray-300">{message}</div>
			{#if !saving}
				<div class="flex justify-end">
					<button
						class="bg-primary-600 hover:bg-primary-700 rounded px-4 py-2 text-white"
						onclick={() => (message = '')}>Fermer</button
					>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	:global(.carta-font-code) {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.95rem;
		line-height: 1.2rem;
		letter-spacing: normal;
	}
</style>
