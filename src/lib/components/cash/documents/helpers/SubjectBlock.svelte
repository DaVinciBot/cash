<script lang="ts">
	interface Props {
		title: string;
		text: string;
	}

	let { title, text }: Props = $props();
</script>

<section class="avoid-break mt-8 text-sm">
	<p class="text-dvb font-bold">{title}</p>
	<p class="mt-1 whitespace-pre-line">{text}</p>
</section>
