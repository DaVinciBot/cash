import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

import {
	ElevationRequiredError,
	StepUpCancelledError,
	requestStepUp,
	stepUpRequest,
	withStepUp
} from '$lib/settings';

describe('withStepUp', () => {
	it("passe l'action telle quelle quand aucune élévation n'est requise", async () => {
		const action = vi.fn().mockResolvedValue('ok');
		await expect(withStepUp(action)).resolves.toBe('ok');
		expect(action).toHaveBeenCalledTimes(1);
		expect(get(stepUpRequest)).toBe(null);
	});

	it('relaie les autres erreurs sans ouvrir le dialogue', async () => {
		const action = vi.fn().mockRejectedValue(new Error('boom'));
		await expect(withStepUp(action)).rejects.toThrow('boom');
		expect(get(stepUpRequest)).toBe(null);
	});

	it('ouvre le dialogue sur ElevationRequiredError puis rejoue une seule fois', async () => {
		const action = vi
			.fn()
			.mockRejectedValueOnce(new ElevationRequiredError())
			.mockResolvedValueOnce('après step-up');

		const pending = withStepUp(action);
		await vi.waitFor(() => {
			expect(get(stepUpRequest)).not.toBe(null);
		});
		get(stepUpRequest)?.resolve(true);

		await expect(pending).resolves.toBe('après step-up');
		expect(action).toHaveBeenCalledTimes(2);
		expect(get(stepUpRequest)).toBe(null);
	});

	it("l'annulation du dialogue lève une StepUpCancelledError silencieuse", async () => {
		const action = vi.fn().mockRejectedValue(new ElevationRequiredError());

		const pending = withStepUp(action);
		await vi.waitFor(() => {
			expect(get(stepUpRequest)).not.toBe(null);
		});
		get(stepUpRequest)?.resolve(false);

		await expect(pending).rejects.toThrow(StepUpCancelledError);
		expect(action).toHaveBeenCalledTimes(1);
		expect(get(stepUpRequest)).toBe(null);
	});

	it('ne rejoue pas en boucle si la seconde tentative exige encore une élévation', async () => {
		const action = vi.fn().mockRejectedValue(new ElevationRequiredError());

		const pending = withStepUp(action);
		await vi.waitFor(() => {
			expect(get(stepUpRequest)).not.toBe(null);
		});
		get(stepUpRequest)?.resolve(true);

		await expect(pending).rejects.toThrow(ElevationRequiredError);
		expect(action).toHaveBeenCalledTimes(2);
	});
});

describe('requestStepUp', () => {
	it('expose la demande dans le store et se nettoie après résolution', async () => {
		const pending = requestStepUp();
		const request = get(stepUpRequest);
		expect(request).not.toBe(null);
		request?.resolve(true);
		await expect(pending).resolves.toBe(true);
		expect(get(stepUpRequest)).toBe(null);
	});
});
