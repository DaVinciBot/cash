<script>
	import Topbar from '$lib/components/share/Topbar.svelte';
	import Footer from '$lib/components/share/Footer.svelte';

	export let title = '';
	export let intro = '';
	export let updatedAt = '';
	export let badge = 'Légal';
	export let sections = [];
	export let redirectToLegalHome = false;

	const formatDate = (value) => {
		if (!value) return null;
		try {
			return new Intl.DateTimeFormat('fr-FR', {
				day: '2-digit',
				month: 'long',
				year: 'numeric'
			}).format(new Date(value));
		} catch (error) {
			console.warn('Invalid date provided to ArticleFrame', error);
			return null;
		}
	};

	$: formattedDate = formatDate(updatedAt);
	$: isoDate = updatedAt ? new Date(updatedAt).toISOString() : null;
</script>

<Topbar />

<section class="relative text-white bg-dark-blue">
	<div class="absolute inset-0 pointer-events-none opacity-30">
		<div
			class="w-full h-full bg-[radial-gradient(circle_at_top,_rgba(7,31,84,0.8),_rgba(1,1,40,0.95))]"
		></div>
	</div>

	<div class="relative pb-12 pt-28 md:pb-16">
		<div class="px-6 md:px-96">
			<div class="max-w-3xl space-y-5">
				<a
					href="/legal"
					class="flex items-center gap-3 text-xs font-semibold tracking-[0.35em] uppercase text-dark-light-blue/80"
				>
					{#if redirectToLegalHome}
						<svg
							class="flex-none w-4 h-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M15 18l-6-6 6-6"></path>
						</svg>
					{/if}
					<span>{badge}</span>
				</a>
				<h1 class="text-3xl font-extrabold md:text-5xl">{title}</h1>
				{#if intro}
					<p class="text-base leading-relaxed text-dark-blue-gray md:text-lg">{intro}</p>
				{/if}
				{#if formattedDate}
					<p class="text-sm text-gray-400">
						Dernière mise à jour : <time datetime={isoDate}>{formattedDate}</time>
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="relative pb-16">
		<div class="px-6 md:pl-96 md:pr-16">
			<div class="flex flex-col items-start justify-between w-full mx-auto md:flex-row flex-nowrap">
				<article class="flex-shrink-0 w-full max-w-3xl prose legal-article prose-invert md-article">
					<slot />
				</article>
				{#if (sections ?? []).length}
					<aside
						class="order-first w-full p-5 mb-6 space-y-4 text-white border md:mt-12 md:order-last legal-summary rounded-2xl border-white/10 bg-white/5 lg:sticky lg:top-32 lg:mt-0 lg:w-80 lg:flex-none"
						aria-label="Sommaire de la page"
					>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Sommaire</p>
						<ol class="space-y-2 text-sm text-white/80" role="list">
							{#each sections as section}
								<li>
									<a
										href={`#${section.id}`}
										class="flex gap-2 px-3 py-2 transition rounded-xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
									>
										<span class="font-semibold text-white">{section.label}</span>
									</a>
								</li>
							{/each}
						</ol>
					</aside>
				{/if}
			</div>
		</div>
	</div>
</section>

<Footer />

<style>
	:global(.legal-article section) {
		margin-bottom: 2.75rem;
	}
	:global(.legal-article h2) {
		margin-top: 0;
		margin-bottom: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		font-size: clamp(1.25rem, 1.05rem + 0.8vw, 1.8rem);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #fff;
	}
	:global(.legal-article h3) {
		font-size: clamp(1.05rem, 0.95rem + 0.4vw, 1.4rem);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #cbd5ff;
		margin-top: 2rem;
	}
	:global(.legal-article p),
	:global(.legal-article ul),
	:global(.legal-article ol) {
		max-width: 90ch;
	}
	:global(.legal-article ul) {
		margin-left: 1rem;
		list-style: disc;
	}
	:global(.legal-article ol) {
		margin-left: 1rem;
		list-style: decimal;
	}

	:global(html) {
		/* enable smooth scrolling for in-page anchors */
		scroll-behavior: smooth;
	}

	/* Respect users who prefer reduced motion */
	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
	}

	@media (min-width: 1024px) {
		.legal-summary {
			max-width: 18rem;
		}
		.legal-article {
			padding-right: 1.5rem;
		}
	}

	:global(.legal-article a) {
		text-decoration: underline;
	}
	:global(.legal-article a[href^='/legal']) {
		text-decoration: none;
	}
</style>
