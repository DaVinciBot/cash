<script>
	export let title = '';
	export let rank_and_points = '';
	export let image = '';
	export let logo;
	export let marginLeft = '';
	export let marginBottom = '';
</script>

<div
	class="rounded-xl border-[3.5px] border-dark-light-blue p-4 w-[420px] flex flex-col gap-2 min-w-96"
>
	<div class="flex flex-col">
		<h1 class="text-xl font-bold">{title}</h1>
		<h1 class="text-xl font-bold">{rank_and_points}</h1>
	</div>
	<div id="" class="flex flex-row h-28 items-center">
		<img src={image} alt={title} class="h-28 aspect-auto" />
		<div class="flex items-center" style="transform: translate({marginLeft}px, {-marginBottom}px)">
			<svelte:component this={logo} class="h-28" sizeW="163px" sizeH="185px" />
		</div>
	</div>
</div>

<style>
	/* Fix the title to exactly two lines for consistent height */
	.title-2lines {
		line-height: 1.2;
		max-height: calc(2 * 1.2em);
		min-height: calc(2 * 1.2em);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.line-clamp-4 {
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	#img-mask::after {
		content: '';
		width: 100%;
		height: 100%;
		transform: translateY(-100%);
		position: relative;
		display: block;
		/* add blue transparent filter  */
		background:
			linear-gradient(rgb(2, 50, 255, 0.3), rgba(2, 50, 255, 0.3)),
			url('') no-repeat center center;
		background-size: cover;
	}
	#img-mask img {
		object-fit: cover;
	}
</style>
