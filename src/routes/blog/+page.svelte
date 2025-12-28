<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { Carta, CartaEditor } from 'carta-md';
	import 'carta-md/default.css';

	import { supabase, supabaseUrl, supabaseKey } from '$lib/supabaseClient';

	// Listing state
	let articles = [];
	let search = '';
	let loadingList = false;

	let title = '';
	let slug = '';
	let body = '';
	let state = 'draft';
	let meta = {
		excerpt: '',
		heroImage: '',
		heroAlt: '',
		author: { name: '', role: '' },
		tag: '' // space/comma/hashtag separated string
	};

	let saving = false;
	let message = '';
	let canAccess = false;
	let selectedSlug = '';

	function toSlug(t = '') {
		return (t || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}+/gu, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 120);
	}

	async function ensureFolder(slug) {
		// For public bucket 'articles', create a zero-byte .keep if empty
		try {
			const path = `${slug}/.keep`;
			const { data, error } = await supabase.storage.from('articles').upload(path, new Blob([]), {
				upsert: false,
				contentType: 'application/octet-stream'
			});
			if (error && !String(error.message || '').includes('The resource already exists')) {
				// ignore if already exists
				console.warn('ensureFolder:', error.message);
			}
		} catch (e) {
			console.warn('ensureFolder exception', e);
		}
	}

	const carta = new Carta({});

	async function handleUpload(ev) {
		const file = ev?.target?.files?.[0];
		if (!file) return;
		try {
			if (!slug) slug = toSlug(title) || crypto.randomUUID().slice(0, 8);
			await ensureFolder(slug);
			const fileName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
			const filePath = `tmp/${fileName}`;
			const { error } = await supabase.storage
				.from('articles')
				.upload(filePath, file, { upsert: false });
			if (error && !String(error.message || '').includes('The resource already exists')) {
				console.error(error);
				message = 'Erreur upload: ' + error.message;
				return;
			}
			const { data: pub } = supabase.storage.from('articles').getPublicUrl(filePath);
			const url = pub?.publicUrl;
			if (url) {
				// Append markdown reference at end
				const isImage = /^image\//.test(file.type);
				const snippet = isImage ? `\n\n![](${url})\n` : `\n\n[${file.name}](${url})\n`;
				body = (body || '') + snippet;
				message = 'Fichier téléversé';
			}
		} catch (e) {
			console.error(e);
			message = 'Erreur upload';
		} finally {
			// reset input value to allow re-uploading same file name
			ev.target.value = '';
		}
	}

	async function transcodeHero() {
		if (!meta.heroImage) return;
		// Skip if already transcoded (heuristic: contains 'hero-large' and ends in .webp)
		if (meta.heroImage.includes('hero-large') && meta.heroImage.endsWith('.webp')) return;

		try {
			const res = await fetch(`${supabaseUrl}functions/v1/transcode/blog-post-hero`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${supabaseKey}`
				},
				body: JSON.stringify({
					image: meta.heroImage,
					title: title,
					bucketName: 'articles',
					folder: slug,
					quality: 40
				})
			});
			const data = await res.json();
			if (data.success && data.images) {
				const oldUrl = meta.heroImage;
				meta.heroImage = data.images.large;
				meta.heroImageSmall = data.images.small;
				meta.heroImageSocial = data.images.social;

				if (oldUrl.includes('/articles/tmp/')) {
					const path = oldUrl.split('/articles/')[1];
					if (path) await supabase.storage.from('articles').remove([path]);
				}
			} else {
				console.warn('Transcode hero failed:', data);
			}
		} catch (e) {
			console.error('Transcode hero error:', e);
		}
	}

	async function transcodeBodyImages() {
		if (!body) return;

		// Find all images: ![alt](url)
		const regex = /!\[.*?\]\((.*?)\)/g;
		let match;
		const imagesToTranscode = [];

		while ((match = regex.exec(body)) !== null) {
			const url = match[1];
			// Check if it's a supabase storage URL and not already transcoded
			// Heuristic for already transcoded: ends with .webp and contains 'image-' and digits
			const isTranscoded = /\/image-\d+-\d+\.webp$/.test(url);
			if (url.includes(supabaseUrl) && !isTranscoded) {
				imagesToTranscode.push(url);
			}
		}

		if (imagesToTranscode.length === 0) return;

		// Remove duplicates
		const uniqueImages = [...new Set(imagesToTranscode)];

		try {
			const res = await fetch(`${supabaseUrl}functions/v1/transcode/blog-post-image`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${supabaseKey}`
				},
				body: JSON.stringify({
					images: uniqueImages,
					bucketName: 'articles',
					folder: slug,
					maxWidth: 1200,
					quality: 60
				})
			});
			const data = await res.json();

			if (data.success && data.images) {
				// Replace URLs in body
				let newBody = body;
				// data.images is array of { index, success, url }
				// The index corresponds to the input array `uniqueImages`

				const toDelete = [];
				for (const result of data.images) {
					if (result.success) {
						const originalUrl = uniqueImages[result.index];
						const newUrl = result.url;
						// Global replace of this URL
						newBody = newBody.split(originalUrl).join(newUrl);

						if (originalUrl.includes('/articles/tmp/')) {
							const path = originalUrl.split('/articles/')[1];
							if (path) toDelete.push(path);
						}
					}
				}
				body = newBody;
				if (toDelete.length) {
					await supabase.storage.from('articles').remove(toDelete);
				}
			} else {
				console.warn('Transcode body images failed:', data);
			}
		} catch (e) {
			console.error('Transcode body images error:', e);
		}
	}

	async function save() {
		message = '';
		if (!title.trim()) {
			message = 'Le titre est requis';
			return;
		}
		slug = toSlug(slug || title);
		if (!slug) {
			message = 'Slug invalide';
			return;
		}
		saving = true;
		try {
			await ensureFolder(slug);

			// Transcode images
			message = 'Optimisation des images...';
			await transcodeHero();
			await transcodeBodyImages();

			const row = {
				title,
				slug,
				body,
				state,
				data: meta
			};
			// upsert by primary key (slug)
			const { error } = await supabase.from('blog').upsert(row).select('slug').single();
			if (error) {
				console.error(error);
				message = 'Erreur enregistrement: ' + error.message;
			} else {
				message = 'Article enregistré';
				selectedSlug = slug;
				await loadArticles();
			}
		} catch (e) {
			console.error(e);
			message = 'Erreur système';
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		// Access control: allow roles admin/bureau, or members of project id 4 ("pole com")
		const { data: sessionData } = await supabase.auth.getUser();
		const user = sessionData?.user;
		if (!user) {
			window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
			return;
		}
		// get role and memberships
		const { data: profile, error: pErr } = await supabase
			.from('profiles')
			.select('role, member_of(project(id))')
			.eq('id', user.id)
			.single();
		if (pErr) {
			console.error(pErr);
			return;
		}
		const role = profile?.role;
		const isPrivileged = role === 'admin' || role === 'bureau';
		const inPoleCom = Array.isArray(profile?.member_of)
			? profile.member_of.some((m) => m?.project?.id === 4)
			: false;
		canAccess = isPrivileged || inPoleCom;
		if (!canAccess) {
			window.location.href = '/';
		}
		await loadArticles();
	});

	async function loadArticles() {
		try {
			loadingList = true;
			const { data, error } = await supabase
				.from('blog')
				.select('title,slug,last_update,publish_date,data,state')
				.order('publish_date', { ascending: false, nullsFirst: false });
			if (error) {
				console.error(error);
				return;
			}
			// normalize and sort fallback by last_update
			const list = (data || []).map((row) => {
				const date = row.publish_date || row.last_update || null;
				return {
					title: row.title,
					slug: row.slug,
					date,
					state: row.state || 'draft',
					cover: row.data?.heroImage || null
				};
			});
			list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
			articles = list;
		} finally {
			loadingList = false;
		}
	}

	async function loadArticle(s) {
		try {
			const { data, error } = await supabase.from('blog').select('*').eq('slug', s).single();
			if (error) {
				console.error(error);
				message = 'Erreur chargement: ' + error.message;
				return;
			}
			title = data.title || '';
			slug = data.slug || '';
			body = data.body || '';
			state = data.state || 'draft';
			meta = data.data || {
				excerpt: '',
				heroImage: '',
				heroAlt: '',
				author: { name: '', role: '' },
				tag: ''
			};
			selectedSlug = slug;
			message = '';
		} catch (e) {
			console.error(e);
			message = 'Erreur chargement';
		}
	}

	function newArticle() {
		title = '';
		slug = '';
		body = '';
		state = 'draft';
		meta = { excerpt: '', heroImage: '', heroAlt: '', author: { name: '', role: '' }, tag: '' };
		selectedSlug = '';
		message = '';
	}

	async function handleCoverUpload(ev) {
		const file = ev?.target?.files?.[0];
		if (!file) return;
		try {
			if (!slug) slug = toSlug(title) || crypto.randomUUID().slice(0, 8);
			await ensureFolder(slug);
			const fileName = `cover-${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
			const filePath = `tmp/${fileName}`;
			const { error } = await supabase.storage
				.from('articles')
				.upload(filePath, file, { upsert: false });
			if (error && !String(error.message || '').includes('The resource already exists')) {
				console.error(error);
				message = 'Erreur upload cover: ' + error.message;
				return;
			}
			const { data: pub } = supabase.storage.from('articles').getPublicUrl(filePath);
			const url = pub?.publicUrl;
			if (url) {
				meta = { ...meta, heroImage: url };
				message = 'Image de couverture téléversée';
			}
		} catch (e) {
			console.error(e);
			message = 'Erreur upload cover';
		} finally {
			ev.target.value = '';
		}
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-bold">Articles</h1>
		<button
			class="px-3 py-1.5 text-sm text-white rounded bg-primary-600 hover:bg-primary-700"
			on:click={newArticle}>Nouvel article</button
		>
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- Editor -->
		<div class="p-3 border border-gray-700 rounded-lg md:col-span-2 bg-gray-800/40">
			<div class="flex items-center justify-between mb-2">
				<div class="text-sm">Contenu</div>
				<label class="flex items-center gap-2 text-xs">
					<span class="opacity-80">Ajouter un fichier</span>
					<input
						type="file"
						class="text-xs file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-600"
						on:change={handleUpload}
					/>
				</label>
			</div>
			<CartaEditor {carta} bind:value={body} />
		</div>
		<!-- Sidebar -->
		<div class="flex flex-col gap-4 p-3 border border-gray-700 rounded-lg bg-gray-800/40">
			<div>
				<label for="search" class="block mb-1 text-sm">Rechercher par titre</label>
				<input
					id="search"
					placeholder="Rechercher..."
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={search}
				/>
			</div>
			<div class="overflow-auto border border-gray-700 rounded max-h-64">
				{#if loadingList}
					<div class="p-3 text-sm text-gray-400">Chargement…</div>
				{:else if !articles.length}
					<div class="p-3 text-sm text-gray-400">Aucun article</div>
				{:else}
					<ul class="divide-y divide-gray-700">
						{#each articles.filter((a) => a.title
								?.toLowerCase()
								.includes(search.toLowerCase())) as a}
							<li>
								<button
									type="button"
									class={`w-full text-left p-2 hover:bg-gray-700/40 cursor-pointer rounded ${a.slug === selectedSlug ? 'bg-gray-700/30' : ''}`}
									on:click={() => loadArticle(a.slug)}
								>
									<div class="text-sm font-medium">{a.title}</div>
									<div class="flex items-center justify-between gap-2">
										<div class="text-xs text-gray-400 truncate">{a.slug}</div>
										<span
											class="text-[10px] px-1.5 py-0.5 rounded-full {a.state === 'published'
												? 'bg-green-900/50 text-green-300 border border-green-800'
												: a.state === 'deleted'
													? 'bg-red-900/50 text-red-300 border border-red-800'
													: 'bg-gray-700 text-gray-300 border border-gray-600'}"
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
				<label class="block mb-1 text-sm" for="title">Titre</label>
				<input
					id="title"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={title}
					on:input={() => (slug = toSlug(title))}
				/>
			</div>
			<div>
				<label class="block mb-1 text-sm" for="slug">Slug</label>
				<input
					id="slug"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={slug}
				/>
			</div>
			<div>
				<label class="block mb-1 text-sm" for="state">État</label>
				<select
					id="state"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={state}
				>
					<option value="draft">Brouillon</option>
					<option value="published">Publié</option>
					<option value="deleted">Supprimé</option>
				</select>
			</div>
			<div>
				<label class="block mb-1 text-sm" for="excerpt">Extrait</label>
				<textarea
					id="excerpt"
					rows="3"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={meta.excerpt}
				/>
			</div>
			<div>
				<label class="block mb-1 text-sm" for="tags"
					>Tags (séparés par espaces, virgules ou #)</label
				>
				<input
					id="tags"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={meta.tag}
				/>
			</div>
			<div>
				<label class="block mb-1 text-sm" for="heroImage">Image de couverture (URL)</label>
				<input
					id="heroImage"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={meta.heroImage}
				/>
				<div class="flex items-center gap-2 mt-2">
					<input
						type="file"
						accept="image/*"
						on:change={handleCoverUpload}
						class="text-xs file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-600"
					/>
					{#if meta.heroImage}
						<img
							src={meta.heroImage}
							alt="couverture"
							class="object-cover w-10 h-10 border border-gray-700 rounded"
						/>
					{/if}
				</div>
			</div>
			<div>
				<label class="block mb-1 text-sm" for="heroAlt">Texte alternatif</label>
				<input
					id="heroAlt"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
					bind:value={meta.heroAlt}
				/>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<div>
					<label class="block mb-1 text-sm" for="authorName">Auteur</label>
					<input
						id="authorName"
						class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
						bind:value={meta.author.name}
					/>
				</div>
				<div>
					<label class="block mb-1 text-sm" for="authorRole">Rôle</label>
					<input
						id="authorRole"
						class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
						bind:value={meta.author.role}
					/>
				</div>
			</div>

			<button
				class="px-4 py-2 text-white rounded bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
				on:click|preventDefault={save}
				disabled={saving}
			>
				{saving ? 'Enregistrement…' : 'Enregistrer'}
			</button>
		</div>
	</div>
</div>

{#if saving || message}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full">
			<div class="mb-4 text-lg font-semibold text-white">
				{saving ? 'Enregistrement en cours...' : 'Information'}
			</div>
			<div class="text-gray-300 mb-4">{message}</div>
			{#if !saving}
				<div class="flex justify-end">
					<button
						class="px-4 py-2 text-white rounded bg-primary-600 hover:bg-primary-700"
						on:click={() => (message = '')}>Fermer</button
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
