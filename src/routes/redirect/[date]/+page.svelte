<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	onMount(() => {
		const date = $page.params?.date || '2025-11-26_03-40-22';
		window.location.href = `https://jzxajbetkioeihoihpkn.supabase.co/storage/v1/object/public/hdd/${date}`;
	});
</script>

<p>Redirecting...</p>
