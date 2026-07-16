import { resolve } from '$app/paths';
import { redirectToLoginIfUnauthorized } from '$lib/settings/authGuard';
import { ElevationRequiredError, isElevationRequired } from '$lib/settings/stepUp';

export interface MfaMethodInfo {
	id: string;
	method_type: string;
	created_at: string;
	last_used_at: string | null;
}

export interface MfaState {
	methods: MfaMethodInfo[];
	recovery_codes_remaining: number;
	has_mfa: boolean;
	elevated: boolean;
}

export type StepUpMethod = 'email' | 'password';

export interface StepUpProof {
	code?: string;
	recovery_code?: string;
	password?: string;
}

async function throwResponseError(
	response: Response,
	fallback: string,
	{ redirectOn401 = true } = {}
): Promise<never> {
	if (redirectOn401) {
		redirectToLoginIfUnauthorized(response);
	}
	const result = (await response.json().catch(() => ({}))) as { error?: string };
	if (isElevationRequired(response.status, result)) {
		throw new ElevationRequiredError();
	}
	throw new Error(result.error ?? fallback);
}

export async function fetchMfaState(): Promise<MfaState> {
	const response = await fetch(resolve('/api/account/mfa'));
	if (!response.ok) {
		return throwResponseError(
			response,
			'Une erreur est survenue lors de la lecture de la vérification en deux étapes'
		);
	}
	return (await response.json()) as MfaState;
}

export async function startEmailEnrollment(): Promise<void> {
	const response = await fetch(resolve('/api/account/mfa/email/start'), { method: 'POST' });
	if (!response.ok) {
		return throwResponseError(response, "Une erreur est survenue lors de l'envoi du code");
	}
}

// Renvoie les codes de récupération quand c'est la première méthode activée
// (seule occasion de les voir), null sinon. Un 401 signifie « code faux »,
// pas « session expirée » : pas de redirection.
export async function verifyEmailEnrollment(code: string): Promise<string[] | null> {
	const response = await fetch(resolve('/api/account/mfa/email/verify'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code })
	});
	if (!response.ok) {
		return throwResponseError(response, 'Code invalide', { redirectOn401: false });
	}
	const result = (await response.json()) as { recovery_codes?: string[] };
	return result.recovery_codes ?? null;
}

export async function disableMfaMethod(methodId: string): Promise<void> {
	const response = await fetch(resolve('/api/account/mfa/disable'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ method_id: methodId })
	});
	if (!response.ok) {
		return throwResponseError(response, 'Une erreur est survenue lors de la désactivation');
	}
}

export async function regenerateRecoveryCodes(): Promise<string[]> {
	const response = await fetch(resolve('/api/account/mfa/recovery-codes'), { method: 'POST' });
	if (!response.ok) {
		return throwResponseError(response, 'Une erreur est survenue lors de la génération des codes');
	}
	const result = (await response.json()) as { recovery_codes?: string[] };
	return result.recovery_codes ?? [];
}

export async function stepUpChallenge(): Promise<StepUpMethod> {
	const response = await fetch(resolve('/api/account/step-up/challenge'), { method: 'POST' });
	if (!response.ok) {
		return throwResponseError(response, "Une erreur est survenue lors de l'envoi du code");
	}
	const result = (await response.json()) as { method?: StepUpMethod };
	return result.method === 'password' ? 'password' : 'email';
}

// 401 = preuve refusée (code ou mot de passe faux) : pas de redirection.
export async function stepUpVerify(proof: StepUpProof): Promise<void> {
	const response = await fetch(resolve('/api/account/step-up/verify'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(proof)
	});
	if (!response.ok) {
		return throwResponseError(response, 'Vérification échouée.', { redirectOn401: false });
	}
}
