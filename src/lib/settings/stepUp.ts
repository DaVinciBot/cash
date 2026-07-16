import { writable } from 'svelte/store';

// Levée quand le service auth répond 403 elevation_required : l'action exige
// une confirmation step-up (code MFA ou mot de passe) avant d'être rejouée.
export class ElevationRequiredError extends Error {
	constructor() {
		super('Confirmation requise.');
		this.name = 'ElevationRequiredError';
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

export async function withStepUp<T>(action: () => Promise<T>): Promise<T> {
	try {
		return await action();
	} catch (error) {
		if (!(error instanceof ElevationRequiredError)) {
			throw error;
		}
		const confirmed = await requestStepUp();
		if (!confirmed) {
			throw new Error('Action annulée.', { cause: error });
		}
		return await action();
	}
}
