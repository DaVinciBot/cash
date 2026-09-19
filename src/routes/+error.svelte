<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '@davincibot/components';
</script>

<section>
	<div class="flex h-screen flex-col items-center justify-center">
		<div class="flex flex-col items-center justify-center">
			<img class="w-1/2" alt="404" src="/404.webp" />
			<!-- `text-grey-900` s'écrivait à l'anglaise : la classe n'existe pas et ce
				 paragraphe n'a jamais été stylé. -->
			<h1 class="text-light-blue m-0 text-2xl font-bold">Désolé, il n'y a rien ici</h1>
			<p class="text-dark-light-blue m-0 mt-1 text-sm">La page que vous demandez n'existe pas.</p>
			<Button class="mt-4" href={resolve('/')} size="md" variant="primary">
				Revenir à l'accueil
			</Button>
		</div>
	</div>
</section>
