<script>
	import { base } from '$app/paths';
	import AuthForm from '$lib/components/utils/AuthForm.svelte';
</script>

<section class="min-h-screen min-w-screen">
	<AuthForm redirect_uri={`${base}/`} />
</section>
