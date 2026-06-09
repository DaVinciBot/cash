<script lang="ts">
	import { hasAnyPermission, type Permission } from '$lib/permissions';
	import { userdata } from '$lib/store';
	import { hideOnClickOutside, loadUserdata } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';

	interface ScreenShareUser {
		permissions?: Permission[];
	}

	let user: ScreenShareUser | null = null;
	let ws: WebSocket | null = null;
	let pc: RTCPeerConnection | null = null;
	let stream: MediaStream | null = null;
	let is_busy = $state<boolean>(true);
	let connected = $state<boolean>(false);
	let sharing = $state<boolean>(false);
	let canCastSmartShare = $state<boolean>(false);
	let canManageTraining = $state<boolean>(false);
	const wsUrl = 'wss://cast.davincibot.fr'; // Change if needed
	let showToolbox = $state<boolean>(false);

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			const permissions = Array.isArray(value.permissions) ? value.permissions : [];
			canCastSmartShare = hasAnyPermission(permissions, ['integration.smartshare.cast']);
			canManageTraining = hasAnyPermission(permissions, ['training.slot.cu']);
		}
	});

	onMount(() => {
		if (!user) {
			loadUserdata();
		}
		const infoToolbox = document.querySelector<HTMLElement>('#infoToolbox');
		if (infoToolbox) {
			hideOnClickOutside(
				infoToolbox,
				() => {
					showToolbox = false;
				},
				true
			);
		}
		setupWebSocket();
	});

	onDestroy(() => {
		if (ws) {
			ws.close();
		}
		if (pc) {
			pc.close();
		}
		if (stream) {
			stream.getTracks().forEach((track) => {
				track.stop();
			});
		}
	});

	function setupWebSocket() {
		ws = new WebSocket(wsUrl);
		ws.onopen = () => {
			connected = true;
			ws?.send(JSON.stringify({ type: 'is_busy' }));
		};
		ws.onmessage = async (event) => {
			const messageText =
				event.data instanceof Blob ? await event.data.text() : (event.data as string);
			const data = JSON.parse(messageText) as {
				type?: string;
				candidate?: unknown;
				message?: boolean;
			};
			if (data.type === 'answer') {
				await pc?.setRemoteDescription(
					new RTCSessionDescription(data as RTCSessionDescriptionInit)
				);
			} else if (data.candidate) {
				await pc?.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit));
			} else if (data.type === 'busy_update') {
				is_busy = data.message ?? false;
			}
		};
	}

	async function startShare() {
		if (!canCastSmartShare) {
			return;
		}

		// Clean up previous connection if any
		if (pc) {
			pc.close();
			pc = null;
		}
		if (stream) {
			stream.getTracks().forEach((track) => {
				track.stop();
			});
			stream = null;
		}

		// Create new RTCPeerConnection and set up handlers
		pc = new RTCPeerConnection();
		pc.onicecandidate = (event) => {
			if (event.candidate && ws) {
				ws.send(JSON.stringify(event.candidate));
			}
		};
		stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
		const localStream = stream;
		stream.getTracks().forEach((track) => {
			pc?.addTrack(track, localStream);

			track.onended = () => {
				ws?.send(JSON.stringify({ type: 'disconnect' }));
				pc?.close();
				pc = null;
				sharing = false;
				is_busy = false;
			};
		});
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		ws?.send(JSON.stringify(offer));
		sharing = true;
	}

	function sendKill() {
		if (ws) {
			ws.send(JSON.stringify({ type: 'op' }));
		}
	}
</script>

<svelte:head>
	<title>Partage d'écran - Admin</title>
</svelte:head>

<!-- Info Button (top right, outside layout) -->
<button
	class="fixed top-20 right-4 z-20 rounded-full p-2 hover:bg-gray-600 focus:outline-none"
	onclick={(e: MouseEvent) => {
		e.stopPropagation();
		showToolbox = !showToolbox;
	}}
	aria-label="Afficher les instructions"
>
	<svg
		class="h-6 w-6 text-blue-500"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		viewBox="0 0 24 24"
	>
		<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
		<path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		<circle cx="12" cy="8" r="1" fill="currentColor" />
	</svg>
</button>

<!-- Info Toolbox (top right, outside layout) -->
<div
	id="infoToolbox"
	class="fixed top-16 right-4 z-20 mb-6 flex w-[400px] max-w-full items-start rounded border-l-4 border-blue-500 bg-blue-100 p-4 text-blue-900 shadow-lg transition-transform md:w-[500px] {showToolbox
		? ''
		: 'translate-x-[120%]'}"
>
	<svg
		class="mr-3 h-6 w-6 flex-shrink-0 text-blue-500"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		viewBox="0 0 24 24"
	>
		<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
		<path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		<circle cx="12" cy="8" r="1" fill="currentColor" />
	</svg>
	<div>
		<p class="mb-1 font-semibold">Comment se connecter&nbsp;?</p>
		<ul class="list-inside list-disc text-sm">
			<li>
				Vous devez être connecté au réseau <span class="font-semibold">Wi-Fi DVB</span>
			</li>
			<li>Assurez-vous que le SmartScreen est allumé et connecté au réseau.</li>
			<li>
				Cliquez sur <span class="font-semibold">Caster</span> pour démarrer le partage d'écran.
			</li>
			<li>Pour arrêter le partage, arrêtez la diffusion ou fermez l'onglet.</li>
			<li>
				Si besoin, utilisez le <span class="font-semibold">Kill switch</span> pour forcer l'arrêt du partage.
				C'est une commande résérvée aux admins et au bureau.
			</li>
		</ul>
	</div>
</div>

<div class="h-page flex flex-col items-center justify-center px-4">
	<div class="w-full max-w-md rounded-xl bg-gray-800 p-8 shadow-lg">
		<div class="mb-6 flex items-center">
			<svg
				class="mr-3 h-8 w-8 text-white"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<rect
					x="3"
					y="4"
					width="18"
					height="12"
					rx="2"
					stroke="currentColor"
					stroke-width="2"
					fill="none"
				/>
				<path d="M8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				<path d="M12 16v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			<h1 class="text-2xl font-bold text-gray-200">SmartShare</h1>
		</div>
		<div class="mb-4 flex items-center">
			<svg
				class="mr-2 h-5 w-5 {connected ? 'text-green-600' : 'text-red-600'}"
				fill="none"
				stroke={connected ? 'green' : 'red'}
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<circle cx="12" cy="12" r="10" stroke="white" fill="currentColor" stroke-width="2" />
			</svg>
			<p class="text-gray-300">
				Statut WebSocket
				<span
					class="{connected ? 'font-semibold text-green-600' : 'font-semibold text-red-600'} pl-5"
				>
					{connected ? 'Connecté' : 'Déconnecté'}
				</span>
			</p>
		</div>
		<div class="mb-6 flex items-center">
			<svg
				class="mr-2 h-5 w-5 {sharing ? 'text-primary-600' : 'text-gray-400'}"
				fill="none"
				stroke={sharing ? 'blue' : 'gray'}
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<rect
					x="4"
					y="7"
					width="16"
					height="10"
					rx="2"
					stroke="white"
					stroke-width="2"
					fill="currentColor"
				/>
			</svg>
			<p class="text-gray-300">
				Statut partage
				<span
					class="{sharing ? 'text-primary-600 font-semibold' : 'font-semibold text-gray-400'} pl-5"
				>
					{sharing ? 'En cours' : 'Non démarré'}
				</span>
			</p>
		</div>
		<div class="flex">
			<button
				onclick={startShare}
				disabled={!canCastSmartShare || is_busy || sharing}
				class="bg-primary-600 hover:bg-primary-700 flex-1 rounded px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
			>
				<svg
					class="-mt-1 mr-2 inline h-5 w-5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
				>
					<rect
						x="3"
						y="4"
						width="18"
						height="12"
						rx="2"
						stroke="currentColor"
						stroke-width="2"
						fill="none"
					/>
					<path d="M8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					<path d="M12 16v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				Caster
			</button>
			{#if canManageTraining}
				<button
					onclick={sendKill}
					class="ml-4 flex-1 rounded bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
				>
					<svg
						class="-mt-1 mr-2 inline h-5 w-5"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							d="M6 18L18 6M6 6l12 12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					Kill switch
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.h-page {
		height: calc(100vh - 6rem);
	}
</style>
