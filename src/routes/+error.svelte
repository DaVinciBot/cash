<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section>
	<div class="flex h-screen flex-col items-center justify-center">
		<div class="flex flex-col items-center justify-center">
			<img class="w-1/2" alt="404" src="/404.webp" />
			<!-- `text-grey-900` s'écrivait à l'anglaise : la classe n'existe pas et ce
				 paragraphe n'a jamais été stylé. -->
			<h1 class="text-light-blue m-0 text-2xl font-bold">Désolé, il n'y a rien ici</h1>
			<p class="text-dark-light-blue m-0 mt-1 text-sm">La page que vous demandez n'existe pas.</p>
			<!-- Classes du bouton primaire écrites à la main : la primitive Button
				 vit dans @davincibot/components mais n'est pas encore publiée. À la
				 prochaine release de la lib, ce bloc redevient un <Button>. -->
			<a
				class="bg-light-blue text-dark-blue focus-visible:ring-light-blue/60 mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white focus-visible:ring-2 focus-visible:outline-none"
				href={resolve('/')}>Revenir à l'accueil</a
			>
		</div>
	</div>
</section>
