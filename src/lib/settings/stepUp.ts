import { writable } from 'svelte/store';

// Levée quand le service auth répond 403 elevation_required : l'action exige
// une confirmation step-up (code MFA ou mot de passe) avant d'être rejouée.
export class ElevationRequiredError extends Error {
	constructor() {
		super('Confirmation requise.');
		this.name = 'ElevationRequiredError';
	}
}

// L'utilisateur a fermé le dialogue de confirmation : abandon silencieux,
// à ne pas afficher comme une erreur.
export class StepUpCancelledError extends Error {
	constructor() {
		super('Action annulée.');
		this.name = 'StepUpCancelledError';
	}
}

export const isElevationRequired = (status: number, result: { error?: string }): boolean =>
	status === 403 && result.error === 'elevation_required';

export interface StepUpRequest {
	resolve: (confirmed: boolean) => void;
}

// Pont entre les actions et le StepUpDialog monté dans le panneau Sécurité.
export const stepUpRequest = writable<StepUpRequest | null>(null);

export function requestStepUp(): Promise<boolean> {
	return new Promise((resolve) => {
		stepUpRequest.set({
			resolve: (confirmed) => {
				stepUpRequest.set(null);
				resolve(confirmed);
			}
		});
	});
}

// Pour les catch des actions sensibles : une annulation du dialogue se tait,
// tout le reste s'affiche.
export function alertUnlessCancelled(error: unknown): void {
	if (error instanceof StepUpCancelledError) {
		return;
	}
	alert(error instanceof Error ? error.message : 'Une erreur est survenue');
}

export async function withStepUp<T>(action: () => Promise<T>): Promise<T> {
	try {
		return await action();
	} catch (error) {
		if (!(error instanceof ElevationRequiredError)) {
			throw error;
		}
		const confirmed = await requestStepUp();
		if (!confirmed) {
			throw new StepUpCancelledError();
		}
		return await action();
	}
}
