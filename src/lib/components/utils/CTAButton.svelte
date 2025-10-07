<script>
	export let secondary = false;
	export let href = '';
	export let size = 'md';

	let classes = secondary
		? 'bg-transparent text-dark-light-blue'
		: ' bg-dark-light-blue text-dark-blue ';

	let sizeClasses = {
		sm: 'text-sm py-1.5 px-3',
		md: 'text-lg py-2 px-6',
		lg: 'text-xl py-3 px-8'
	}[size];
</script>

{#if href}
	<a {href} class="w-full">
		<button
			class="w-full {sizeClasses} font-bold rounded-xl {classes} border-[3.25px] border-dark-light-blue"
			type="button"
		>
			<slot></slot>
		</button>
	</a>
{:else}
	<button
		class="w-full {sizeClasses} font-bold rounded-xl {classes} border-[3.25px] border-dark-light-blue"
		type="button"
	>
		<slot></slot>
	</button>
{/if}
