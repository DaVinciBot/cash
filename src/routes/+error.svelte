<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section>
	<div class="flex h-screen flex-col items-center justify-center">
		<div class="flex flex-col items-center justify-center">
			<img class="w-1/2" alt="404" src="/404.webp" />
			<h1 class="text-4xl font-bold text-gray-100">Désolé, il n'y a rien ici</h1>
			<p class="text-grey-900">La page que vous demandez n'existe pas.</p>
			<a class="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white" href={resolve('/')}
				>Revenir à l'accueil</a
			>
		</div>
	</div>
</section>
