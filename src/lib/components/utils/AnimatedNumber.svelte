<script>
	import { onMount, onDestroy } from 'svelte';
	export let target = 0; // final value to count to
	export let duration = 2000; // ms
	export let prefix = '';
	export let suffix = '';
	export let locale = 'fr-FR';
	export let decimals = 0;
	// If true, animation will run only the first time it becomes visible
	export let once = true;

	let display = '';
	let raf;
	let el;
	let visible = false;
	let observer;

	const fmt = (v) => {
		// If decimals > 0 keep decimal places, otherwise round
		const opts = { maximumFractionDigits: decimals };
		return new Intl.NumberFormat(locale, opts).format(decimals > 0 ? v : Math.round(v));
	};

	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	function animate(to = target, ms = duration) {
		cancel();
		const start = performance.now();
		const from = 0;

		function step(now) {
			const elapsed = now - start;
			const t = Math.min(1, elapsed / ms);
			const eased = easeOutCubic(t);
			const current = from + (to - from) * eased;
			display = fmt(current);
			if (t < 1) raf = requestAnimationFrame(step);
			else display = fmt(to);
		}

		raf = requestAnimationFrame(step);
	}

	function cancel() {
		if (raf) cancelAnimationFrame(raf);
		raf = null;
	}

	// start on mount: set initial display and attach observer to trigger animation when visible
	onMount(() => {
		display = fmt(0);

		// If IntersectionObserver isn't available, fallback to immediate animation
		if (typeof IntersectionObserver === 'undefined') {
			visible = true;
			animate(target, duration);
			return;
		}

		observer = new IntersectionObserver(
			(entries) => {
				const e = entries[0];
				if (e && e.isIntersecting) {
					visible = true;
					animate(target, duration);
					if (once && observer) {
						observer.disconnect();
						observer = null;
					}
				}
			},
			{ threshold: 0.1 }
		);

		if (el) observer.observe(el);
	});

	onDestroy(() => {
		cancel();
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	});

	// restart when target or duration changes, but only if visible
	$: if (typeof target === 'number') {
		if (visible) {
			animate(target, duration);
		} else {
			// ensure it shows the initial state until visible
			display = fmt(0);
		}
	}
</script>

<div bind:this={el} class="animated-number" aria-live="polite">
	{#if prefix}<span class="prefix">{prefix}</span>{/if}
	<span class="number">{display}</span>
	{#if suffix}<span class="suffix">{suffix}</span>{/if}
</div>

<style>
	.animated-number {
		display: inline-flex;
		align-items: baseline;
		gap: 0.375rem;
	}

	.animated-number .prefix,
	.animated-number .suffix {
		font-weight: 600;
		transform-origin: center;
	}

	.animated-number .number {
		font-variant-numeric: tabular-nums;
		font-weight: 800;
	}
</style>
