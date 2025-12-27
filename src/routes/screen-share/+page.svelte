<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { hideOnClickOutside, loadUserdata } from '$lib/utils';
	import { userdata } from '$lib/store';

	let user;
	let ws: WebSocket | null = null;
	let pc: RTCPeerConnection | null = null;
	let stream: MediaStream | null = null;
	let is_busy = true;
	let connected = false;
	let sharing = false;
	let wsUrl = 'wss://cast.davincibot.fr'; // Change if needed
	let showToolbox = false; // Add this variable

	userdata.subscribe((value) => {
		if (value) {
			user = value;
		}
	});

	onMount(async () => {
		if (!user) {
			await loadUserdata();
		}
		hideOnClickOutside(
			document.querySelector('#infoToolbox'),
			() => {
				showToolbox = false;
			},
			true
		);
		setupWebSocket();
	});

	onDestroy(() => {
		if (ws) ws.close();
		if (pc) pc.close();
		if (stream) stream.getTracks().forEach((track) => track.stop());
	});

	function setupWebSocket() {
		ws = new WebSocket(wsUrl);
		ws.onopen = () => {
			connected = true;
			ws!.send(JSON.stringify({ type: 'is_busy' }));
		};
		ws.onmessage = async (event) => {
			const messageText = event.data instanceof Blob ? await event.data.text() : event.data;
			const data = JSON.parse(messageText);
			if (data.type === 'answer') {
				console.log('Received answer:', data);
				await pc?.setRemoteDescription(new RTCSessionDescription(data));
			} else if (data.candidate) {
				console.log('Received ICE candidate:', data);
				await pc?.addIceCandidate(new RTCIceCandidate(data));
			} else if (data.type === 'busy_update') {
				is_busy = data.message;
			}
		};
	}

	async function startShare() {
		// Clean up previous connection if any
		if (pc) {
			pc.close();
			pc = null;
		}
		if (stream) {
			stream.getTracks().forEach((track) => {
				track.stop();
				console.log('Stopped track:', track);
			});
			stream = null;
		}

		// Create new RTCPeerConnection and set up handlers
		pc = new RTCPeerConnection();
		pc.onicecandidate = (event) => {
			if (event.candidate && ws) {
				console.log('Sending ICE candidate:', event.candidate);
				ws.send(JSON.stringify(event.candidate));
			}
		};
		stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
		stream.getTracks().forEach((track) => {
			pc?.addTrack(track, stream!);

			track.onended = () => {
				console.log('Screen sharing stopped');
				ws?.send(JSON.stringify({ type: 'disconnect' }));
				pc?.close();
				pc = null;
				sharing = false;
				is_busy = false;
			};
		});
		const offer = await pc!.createOffer();
		await pc!.setLocalDescription(offer);
		ws!.send(JSON.stringify(offer));
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
	class="fixed z-20 p-2 rounded-full top-20 right-4 hover:bg-gray-600 focus:outline-none"
	on:click={(e) => {
		e.stopPropagation();
		showToolbox = !showToolbox;
	}}
	aria-label="Afficher les instructions"
>
	<svg
		class="w-6 h-6 text-blue-500"
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
	class="fixed top-16 w-[400px] right-4 md:w-[500px] max-w-full z-20 flex items-start p-4 mb-6 text-blue-900 bg-blue-100 border-l-4 border-blue-500 rounded shadow-lg transition-transform {showToolbox
		? ''
		: 'translate-x-[120%]'}"
>
	<svg
		class="flex-shrink-0 w-6 h-6 mr-3 text-blue-500"
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
		<ul class="text-sm list-disc list-inside">
			<li>
				Vous devez être connecté au réseau <span class="font-semibold">Wi-Fi DVB</span>
			</li>
			<li>Assurez-vous que le SmartScreen est allumé et connecté au réseau.</li>
			<li>
				Cliquez sur <span class="font-semibold">Caster</span> pour démarrer le partage d'écran.
			</li>
			<li>Pour arrêter le partage, arrêtez la diffusion ou fermez l'onglet.</li>
			<li>
				Si besoin, utilisez le <span class="font-semibold">Kill switch</span> pour forcer l'arrêt du
				partage. C'est une commande résérvée aux admins et au bureau.
			</li>
		</ul>
	</div>
</div>

<div class="flex flex-col items-center justify-center px-4 h-page">
	<div class="w-full max-w-md p-8 bg-gray-800 shadow-lg rounded-xl">
		<div class="flex items-center mb-6">
			<svg
				class="w-8 h-8 mr-3 text-white"
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
		<div class="flex items-center mb-4">
			<svg
				class="w-5 h-5 mr-2 {connected ? 'text-green-600' : 'text-red-600'}"
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
					class="{connected ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'} pl-5"
				>
					{connected ? 'Connecté' : 'Déconnecté'}
				</span>
			</p>
		</div>
		<div class="flex items-center mb-6">
			<svg
				class="w-5 h-5 mr-2 {sharing ? 'text-primary-600' : 'text-gray-400'}"
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
					class="{sharing ? 'text-primary-600 font-semibold' : 'text-gray-400 font-semibold'} pl-5"
				>
					{sharing ? 'En cours' : 'Non démarré'}
				</span>
			</p>
		</div>
		<div class="flex">
			<button
				on:click={startShare}
				disabled={is_busy || sharing}
				class="flex-1 px-4 py-2 font-semibold text-white transition rounded bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg
					class="inline w-5 h-5 mr-2 -mt-1"
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
			{#if user?.role === 'admin' || user?.role === 'bureau'}
				<button
					on:click={sendKill}
					class="flex-1 px-4 py-2 ml-4 font-semibold text-white transition bg-red-500 rounded hover:bg-red-600"
				>
					<svg
						class="inline w-5 h-5 mr-2 -mt-1"
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
