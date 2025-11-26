<script lang="ts">
	import { page } from '$app/stores';

	$: date = $page.params['date'] || '2025-11-26_03-40-22';
	$: imageUrl = `https://jzxajbetkioeihoihpkn.supabase.co/storage/v1/object/public/hdd/${date}`;
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center w-screen h-screen bg-black">
	<img src={imageUrl} alt="Full screen" class="object-contain w-full h-full" />
</div>
