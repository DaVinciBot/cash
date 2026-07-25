import { resolve } from '$app/paths';
import { redirectToLoginIfUnauthorized } from '$lib/settings/authGuard';
import { ElevationRequiredError, isElevationRequired } from '$lib/settings/stepUp';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';

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

export type StepUpMethod = 'email' | 'totp' | 'password' | 'webauthn';

export interface StepUpProof {
	code?: string;
	method?: 'email' | 'totp';
	recovery_code?: string;
	password?: string;
}

export async function throwResponseError(
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

// Renvoie l'adresse à laquelle le code a été envoyé.
export async function startEmailEnrollment(): Promise<string | null> {
	const response = await fetch(resolve('/api/account/mfa/email/start'), { method: 'POST' });
	if (!response.ok) {
		return throwResponseError(response, "Une erreur est survenue lors de l'envoi du code");
	}
	const result = (await response.json()) as { email?: string };
	return result.email ?? null;
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

export interface TotpEnrollmentInfo {
	secret: string;
	otpauth_url: string;
}

export async function startTotpEnrollment(): Promise<TotpEnrollmentInfo> {
	const response = await fetch(resolve('/api/account/mfa/totp/start'), { method: 'POST' });
	if (!response.ok) {
		return throwResponseError(response, "Une erreur est survenue lors de l'activation");
	}
	const result = (await response.json()) as { secret?: string; otpauth_url?: string };
	return { secret: result.secret ?? '', otpauth_url: result.otpauth_url ?? '' };
}

// Renvoie les codes de récupération quand c'est la première méthode activée,
// null sinon. Un 401 signifie « code faux », pas « session expirée ».
export async function verifyTotpEnrollment(code: string): Promise<string[] | null> {
	const response = await fetch(resolve('/api/account/mfa/totp/verify'), {
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

export interface StepUpChallengeInfo {
	method: StepUpMethod;
	methods: string[];
	email: string | null;
}

export async function stepUpChallenge(method?: 'email' | 'totp'): Promise<StepUpChallengeInfo> {
	const response = await fetch(resolve('/api/account/step-up/challenge'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(method ? { method } : {})
	});
	if (!response.ok) {
		return throwResponseError(response, "Une erreur est survenue lors de l'envoi du code");
	}
	const result = (await response.json()) as {
		method?: StepUpMethod;
		methods?: string[];
		email?: string;
	};
	return {
		method:
			result.method === 'password' || result.method === 'totp' || result.method === 'webauthn'
				? result.method
				: 'email',
		methods: result.methods ?? [],
		email: result.email ?? null
	};
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

// Step-up complet par passkey : challenge webauthn → navigator.credentials.get()
// → vérification de l'assertion. La cérémonie vit ici (app hôte), pas dans le
// composant partagé.
export async function stepUpVerifyWebauthn(): Promise<void> {
	const challengeResponse = await fetch(resolve('/api/account/step-up/challenge'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ method: 'webauthn' })
	});
	if (!challengeResponse.ok) {
		return throwResponseError(challengeResponse, 'La vérification a échoué.');
	}
	const challenge = (await challengeResponse.json()) as {
		method?: string;
		options?: PublicKeyCredentialRequestOptionsJSON;
	};
	if (challenge.method !== 'webauthn' || !challenge.options) {
		throw new Error('La vérification par passkey est indisponible.');
	}

	const { startAuthentication } = await import('@simplewebauthn/browser');
	const credential = await startAuthentication({ optionsJSON: challenge.options });

	const verifyResponse = await fetch(resolve('/api/account/step-up/verify'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ method: 'webauthn', webauthn_response: credential })
	});
	if (!verifyResponse.ok) {
		return throwResponseError(verifyResponse, 'Vérification échouée.', { redirectOn401: false });
	}
}
