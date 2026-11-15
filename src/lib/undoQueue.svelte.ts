// Actions différées que l'on peut rattraper.
//
// Pour une action réversible au moment du geste (retirer un composant de sa
// demande, par exemple), une modale de confirmation casse le rythme pour rien.
// L'action est plutôt mise en attente quelques secondes : l'élément disparaît
// tout de suite de l'écran, un toast propose « Annuler », et la requête ne part
// qu'à l'expiration du délai. Annuler revient donc à ne jamais l'avoir envoyée.
//
// Quitter la page pendant le délai ne doit pas perdre le geste : `flush()`
// exécute immédiatement ce qui attend (navigation interne), `flushOnUnload()`
// passe par `sendBeacon`, seul envoi qui survit à la fermeture de l'onglet.

export interface PendingUndo {
	key: string;
	label: string;
}

interface Entry {
	timer: ReturnType<typeof setTimeout>;
	commit: () => Promise<void>;
	beacon?: () => void;
}

export const UNDO_DELAY_MS = 6000;

export class UndoQueue {
	pending = $state<PendingUndo[]>([]);
	readonly delayMs: number;
	// Comptabilité interne des minuteurs, jamais lue par un rendu : la partie
	// visible est `pending`. Une SvelteMap n'apporterait que du suivi inutile.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	readonly #entries = new Map<string, Entry>();

	constructor(delayMs = UNDO_DELAY_MS) {
		this.delayMs = delayMs;
	}

	/** Vrai tant que l'action sur `key` attend : l'élément doit rester masqué. */
	has(key: string): boolean {
		return this.pending.some((entry) => entry.key === key);
	}

	/**
	 * Met une action en attente. `commit` l'exécute pour de bon ; `beacon`, s'il
	 * est fourni, l'envoie sans attendre de réponse quand l'onglet se ferme.
	 */
	schedule(key: string, label: string, commit: () => Promise<void>, beacon?: () => void): void {
		if (this.#entries.has(key)) {
			return;
		}
		const timer = setTimeout(() => {
			void this.#run(key);
		}, this.delayMs);
		this.#entries.set(key, { timer, commit, beacon });
		this.pending = [...this.pending, { key, label }];
	}

	/** Renonce à l'action : rien n'est envoyé. */
	undo(key: string): void {
		const entry = this.#entries.get(key);
		if (!entry) {
			return;
		}
		clearTimeout(entry.timer);
		this.#entries.delete(key);
		this.#drop(key);
	}

	/** Exécute tout de suite les actions en attente, par exemple avant de quitter la page. */
	flush(): void {
		for (const key of [...this.#entries.keys()]) {
			void this.#run(key);
		}
	}

	/** Fermeture de l'onglet : un `fetch` serait coupé, le beacon part quand même. */
	flushOnUnload(): void {
		for (const entry of this.#entries.values()) {
			clearTimeout(entry.timer);
			if (entry.beacon) {
				entry.beacon();
			} else {
				void entry.commit();
			}
		}
		this.#entries.clear();
		this.pending = [];
	}

	async #run(key: string): Promise<void> {
		const entry = this.#entries.get(key);
		if (!entry) {
			return;
		}
		clearTimeout(entry.timer);
		this.#entries.delete(key);
		try {
			await entry.commit();
		} finally {
			// Retiré seulement une fois la requête finie : l'élément ne réapparaît
			// pas entre l'envoi et le rechargement des données.
			this.#drop(key);
		}
	}

	#drop(key: string): void {
		this.pending = this.pending.filter((entry) => entry.key !== key);
	}
}
