<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { CtaButton } from '@davincibot/components';
	import { Copy, Download, TriangleAlert } from '@lucide/svelte';

	interface Props {
		codes: string[];
		onClose: () => void;
	}

	let { codes, onClose }: Props = $props();

	let copied = $state<boolean>(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(codes.join('\n'));
			copied = true;
		} catch {
			alert('La copie a échoué. Note les codes à la main.');
		}
	}

	function handleDownload() {
		const blob = new Blob([`Codes de récupération DaVinciBot\n\n${codes.join('\n')}\n`], {
			type: 'text/plain'
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'codes-recuperation-davincibot.txt';
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<div
	id="recovery-codes-modal"
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	aria-label="Codes de récupération"
	aria-modal="true"
	role="dialog"
>
	<OverlayBackdrop />
	<div
		class="border-light-blue/20 relative w-full max-w-md rounded-2xl border bg-[#060a2c] p-5 sm:p-6"
	>
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
			Codes de récupération
		</p>
		<p class="text-light-blue m-0 mb-3 flex items-start gap-2 text-sm">
			<TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-400" />
			<span>
				Ces codes ne seront <strong>plus jamais affichés</strong>. Garde-les en lieu sûr : chacun ne
				fonctionne qu'une seule fois et remplace un code e-mail si tu n'as plus accès à ta boîte.
			</span>
		</p>
		<ul
			class="border-light-blue/10 bg-dark-blue/40 m-0 mb-4 grid list-none grid-cols-2 gap-x-4 gap-y-1 rounded-xl border p-3 font-mono text-sm"
		>
			{#each codes as recoveryCode (recoveryCode)}
				<li class="text-light-blue">{recoveryCode}</li>
			{/each}
		</ul>
		<div class="flex flex-wrap items-center justify-end gap-2">
			<button
				class="text-dark-light-blue flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1 text-sm hover:underline"
				onclick={() => void handleCopy()}
				type="button"
			>
				<Copy class="size-4" />
				{copied ? 'Copiés !' : 'Copier'}
			</button>
			<button
				class="text-dark-light-blue flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1 text-sm hover:underline"
				onclick={handleDownload}
				type="button"
			>
				<Download class="size-4" />
				Télécharger (.txt)
			</button>
			<CtaButton fullWidth={false} onclick={onClose} size="sm" variant="secondary">
				J'ai enregistré mes codes
			</CtaButton>
		</div>
	</div>
</div>
