<script>
	export let title = '';
	export let description = '';
	export let image = '';
	export let link = '';
</script>

<div
	class="rounded-xl border-[3.5px] border-dark-light-blue p-4 w-[450px] flex flex-col gap-2 min-w-96"
>
	<div class="flex justify-between">
		<h1 class="text-2xl font-bold title-2lines">{title}</h1>
	</div>
	<div class="flex items-start gap-5">
		<div class="flex flex-col justify-between max-w-[50%] h-28 overflow-hidden">
			<p class="mb-2 text-sm text-justify text-dark-blue-gray line-clamp-4">{description}</p>
			<a href={link} class=" text-dark-light-blue">Lire la suite...</a>
		</div>
		<div id="img-mask" class="h-28">
			<img src={image} alt={title} class="h-28 aspect-auto" />
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
			linear-gradient(rgb(2, 50, 255, 0.15), rgba(2, 50, 255, 0.15)),
			url('') no-repeat center center;
		background-size: cover;
	}
	#img-mask img {
		object-fit: cover;
	}
</style>
