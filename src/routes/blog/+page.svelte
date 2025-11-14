<script>
	import Topbar from '$lib/components/share/Topbar.svelte';
	import Footer from '$lib/components/share/Footer.svelte';
	export let data;

	const pageSize = data?.pageSize ?? 20;
	let posts = data?.posts ? [...data.posts] : [];
	let totalCount = data?.totalCount ?? posts.length;
	let filterTotalCount = null;
	let filterSignature = '';
	let loadingMore = false;
	let loadError = '';
	let searchQuery = '';
	let selectedTag = 'all';

	function fmt(dateStr) {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('fr-FR', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function matchesSearch(post, searchTerm) {
		if (!post) return false;
		if (!searchTerm) return true;
		const haystack =
			`${post.title || ''} ${post.excerpt || ''} ${post.plainBody || post.body || ''}`.toLowerCase();
		return haystack.includes(searchTerm);
	}

	function matchesTag(post, tag) {
		if (!tag) return true;
		return (post.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase());
	}

	function buildFilterSignature(search, tag) {
		return `${search || ''}::${tag || 'all'}`;
	}

	const dedupePosts = (existing, incoming) => {
		const seen = new Set(existing.map((post) => post.slug));
		const merged = [...existing];
		incoming.forEach((post) => {
			if (!seen.has(post.slug)) {
				seen.add(post.slug);
				merged.push(post);
			}
		});
		return merged;
	};

	async function loadMorePosts() {
		if (loadingMore || !hasMoreForFilter) return;
		loadingMore = true;
		loadError = '';
		const offset = posts.filter(
			(post) => matchesSearch(post, trimmedSearch) && matchesTag(post, activeTag)
		).length;
		const params = new URLSearchParams({
			offset: String(offset),
			limit: String(pageSize)
		});
		if (trimmedSearch) params.set('search', trimmedSearch);
		if (activeTag) params.set('tag', activeTag);

		try {
			const res = await fetch(`/api/blog?${params.toString()}`);
			if (!res.ok) {
				throw new Error('Failed to load more posts');
			}
			const payload = await res.json();
			const incoming = payload?.posts ?? [];
			const count = payload?.count ?? null;
			if (count !== null) {
				filterTotalCount = count;
				if (!trimmedSearch && !activeTag) {
					totalCount = count;
				}
			}
			if (incoming.length) {
				posts = dedupePosts(posts, incoming);
			} else if (count === null) {
				filterTotalCount = offset;
			}
		} catch (error) {
			console.error('loadMorePosts error', error);
			loadError = "Impossible de charger plus d'articles pour le moment.";
		} finally {
			loadingMore = false;
		}
	}

	$: derivedTags = Array.from(new Set(posts.flatMap((post) => post.tags || [])));
	$: tagOptions = ['all', ...derivedTags];
	$: trimmedSearch = searchQuery.trim().toLowerCase();
	$: activeTag = selectedTag === 'all' ? null : selectedTag;
	$: latest = posts.slice(0, Math.min(4, posts.length));
	$: archiveSource = posts.length > latest.length ? posts.slice(latest.length) : posts;
	$: filteredLatest = latest.filter((post) => matchesSearch(post, trimmedSearch));
	$: filteredArchive = archiveSource.filter((post) => matchesTag(post, activeTag));
	$: matchesForFilter = posts.filter(
		(post) => matchesSearch(post, trimmedSearch) && matchesTag(post, activeTag)
	).length;
	$: hasMoreBase = posts.length < totalCount;
	$: hasMoreForFilter =
		filterTotalCount === null ? hasMoreBase : matchesForFilter < filterTotalCount;
	$: disableLoadMore = !hasMoreForFilter || loadingMore;
	$: currentSignature = buildFilterSignature(trimmedSearch, activeTag);
	$: if (currentSignature !== filterSignature) {
		filterSignature = currentSignature;
		filterTotalCount = null;
		loadError = '';
	}
	$: noResults = !filteredLatest.length && !filteredArchive.length;
</script>

<svelte:head>
	<title>Actus — DaVinciBot</title>
	<link rel="canonical" href="https://davincibot.fr/blog/" />
	<meta name="description" content="Dernières nouvelles, projets et coulisses de DaVinciBot." />
	<meta name="robots" content="index,follow" />
	<meta property="og:title" content="Actus — DaVinciBot" />
	<meta
		property="og:description"
		content="Dernières nouvelles, projets et coulisses de DaVinciBot."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://davincibot.fr/blog/" />
	<meta property="og:image" content="https://davincibot.fr/dvb_og_img.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Actus — DaVinciBot" />
	<meta
		name="twitter:description"
		content="Dernières nouvelles, projets et coulisses de DaVinciBot."
	/>
	<meta name="twitter:image" content="https://davincibot.fr/dvb_og_img.png" />
</svelte:head>

<Topbar />

<section class="pt-24 md:pt-28">
	<div class="px-6 md:px-16 lg:px-32">
		<header class="flex flex-col gap-2">
			<h1 class="text-3xl font-extrabold tracking-wide md:text-5xl">Actus</h1>
			<p class="text-dark-blue-gray md:text-lg">
				Dernières nouvelles, projets et coulisses de l'association.
			</p>
		</header>

		<section class="mt-3 space-y-8">
			<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<h2 class="text-2xl font-semibold md:text-3xl">Derniers articles</h2>
				<!-- <span class="text-sm text-gray-500">
					{filteredLatest.length}/{latest.length} sélectionnés
				</span> -->
				<div class="flex flex-col gap-4 md:min-w-96">
					<div class="relative">
						<input
							bind:value={searchQuery}
							type="search"
							placeholder="Rechercher un article..."
							class="w-full px-4 py-3 pl-12 text-sm text-white placeholder-gray-500 transition border border-gray-700 bg-gray-900/60 rounded-2xl focus:outline-none focus:border-dark-light-blue focus:ring-1 focus:ring-dark-light-blue"
						/>
						<svg
							class="absolute w-5 h-5 text-gray-500 left-4 top-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
					</div>
				</div>
			</div>
			{#if noResults}
				<div class="p-6 mt-10 text-center text-gray-400 border border-gray-700 rounded-2xl">
					Aucun article ne correspond à vos critères de recherche.
				</div>
			{/if}
			{#if filteredLatest.length}
				{#if filteredLatest[0]}
					<a
						href={`/blog/${filteredLatest[0].slug}`}
						class="grid items-stretch grid-cols-1 gap-6 overflow-hidden transition-colors border border-gray-700 group md:grid-cols-12 rounded-2xl hover:border-dark-light-blue"
					>
						<div class="relative md:col-span-7 bg-gray-800/40">
							<img
								alt={filteredLatest[0].title}
								src={filteredLatest[0].cover}
								class="object-cover w-full transition-opacity h-72 md:h-full opacity-90 group-hover:opacity-100"
							/>
						</div>
						<div class="flex flex-col self-center gap-3 p-6 md:col-span-5">
							<div class="text-sm text-gray-400">
								{fmt(filteredLatest[0].date)}
							</div>
							<h3 class="text-2xl font-bold leading-tight md:text-3xl group-hover:text-white">
								{filteredLatest[0].title}
							</h3>
							{#if filteredLatest[0].tags?.length}
								<ul class="flex flex-wrap gap-2 mt-1">
									{#each filteredLatest[0].tags.slice(0, 6) as tag}
										<li
											class="px-2 py-1 text-xs border rounded-md border-dark-light-blue/40 text-dark-light-blue bg-dark-light-blue/10"
										>
											#{tag}
										</li>
									{/each}
								</ul>
							{/if}
							<p class="text-dark-blue-gray line-clamp-4">{filteredLatest[0].excerpt}</p>
							<div class="mt-2 text-dark-light-blue">Lire l'article →</div>
						</div>
					</a>
				{/if}
				{#if filteredLatest.length > 1}
					<div class="grid grid-cols-1 gap-6 mt-10 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredLatest.slice(1) as post}
							<a
								href={`/blog/${post.slug}`}
								class="flex flex-col overflow-hidden transition-colors border border-gray-700 rounded-2xl hover:border-dark-light-blue group"
							>
								<img src={post.cover} alt={post.title} class="object-cover w-full h-48" />
								<div class="flex flex-col gap-2 p-4">
									<div class="text-xs text-gray-400">{fmt(post.date)}</div>
									<h4 class="text-lg font-semibold leading-snug group-hover:text-white">
										{post.title}
									</h4>
									{#if post.tags?.length}
										<ul class="flex flex-wrap gap-1.5 text-[11px] text-dark-light-blue">
											{#each post.tags.slice(0, 5) as tag}
												<li
													class="px-2 py-0.5 border border-dark-light-blue/40 rounded-full bg-dark-light-blue/10"
												>
													#{tag}
												</li>
											{/each}
										</ul>
									{/if}
									<p class="text-sm text-dark-blue-gray line-clamp-3">{post.excerpt}</p>
									<span class="mt-1 text-sm font-semibold text-dark-light-blue">Lire →</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			{/if}
			<section class="mt-16">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div class="flex flex-col gap-3">
						<h2 class="text-2xl font-semibold md:text-3xl">Articles par tag</h2>
						{#if derivedTags.length}
							<div class="flex flex-wrap gap-2">
								{#each tagOptions as tag}
									<button
										type="button"
										on:click={() => (selectedTag = tag)}
										class={`px-4 py-1.5 text-sm rounded-full border transition ${
											tag === selectedTag
												? 'border-dark-light-blue bg-dark-light-blue/10 text-dark-light-blue'
												: 'border-gray-700 text-gray-400 hover:text-white'
										}`}
									>
										{tag === 'all' ? 'Tous les tags' : `#${tag}`}
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<p class="text-sm text-gray-500 lg:max-w-md lg:text-right">
						Faites défiler horizontalement les archives filtrées par tag ou mot-clé.
					</p>
				</div>
				{#if filteredArchive.length}
					<div class="relative mt-8">
						<div
							class="flex gap-5 pb-4 overflow-x-auto scroll-rail snap-x snap-mandatory"
							aria-label="Articles filtrés"
						>
							{#each filteredArchive as post}
								<a
									href={`/blog/${post.slug}`}
									class="flex flex-col flex-shrink-0 w-72 min-w-[18rem] rounded-2xl border border-gray-800 bg-gray-900/40 hover:border-dark-light-blue transition snap-start"
								>
									<img
										src={post.cover}
										alt={post.title}
										class="object-cover w-full h-44 rounded-t-2xl"
									/>
									<div class="flex flex-col gap-3 p-4">
										<div class="text-xs text-gray-500">{fmt(post.date)}</div>
										<h4 class="text-lg font-semibold leading-snug line-clamp-2">{post.title}</h4>
										<p class="text-sm text-dark-blue-gray line-clamp-3">{post.excerpt}</p>
										{#if post.tags?.length}
											<ul class="flex flex-wrap gap-1.5 text-[11px] text-dark-light-blue">
												{#each post.tags.slice(0, 4) as tag}
													<li
														class="px-2 py-0.5 border border-dark-light-blue/40 rounded-full bg-dark-light-blue/10"
													>
														#{tag}
													</li>
												{/each}
											</ul>
										{/if}
										<span class="text-sm font-semibold text-dark-light-blue">Lire →</span>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{:else}
					<p class="mt-8 text-sm text-gray-400">Aucun article ne correspond à ce filtre.</p>
				{/if}
				{#if loadError}
					<p class="mt-4 text-sm text-red-400">{loadError}</p>
				{/if}
				{#if hasMoreForFilter}
					<button
						type="button"
						on:click={loadMorePosts}
						disabled={disableLoadMore}
						class="px-6 py-2 mt-4 text-sm font-semibold border rounded-full border-dark-light-blue text-dark-light-blue hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{loadingMore ? 'Chargement…' : 'Charger plus d’articles'}
					</button>
				{:else}
					<p class="mt-4 text-xs text-gray-500">
						Tous les articles correspondant à ce filtre ont été chargés.
					</p>
				{/if}
			</section>
		</section>
	</div>
</section>

<Footer />

<style>
	.scroll-rail::-webkit-scrollbar-track {
		background: transparent;
	}
	.scroll-rail::-webkit-scrollbar-thumb {
		background: rgba(71, 85, 105, 0.6);
		border-radius: 9999px;
	}
</style>
