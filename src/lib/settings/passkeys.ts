import { resolve } from '$app/paths';
import { throwResponseError } from '$lib/settings/mfa';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';

export interface PasskeyInfo {
	id: string;
	friendly_name: string;
	device_type: string;
	backed_up: boolean;
	created_at: string;
	last_used_at: string | null;
}

export async function fetchPasskeys(): Promise<PasskeyInfo[]> {
	const response = await fetch(resolve('/api/account/passkeys'));
	if (!response.ok) {
		return throwResponseError(response, 'Une erreur est survenue lors du chargement des passkeys');
	}
	const result = (await response.json()) as { passkeys?: PasskeyInfo[] };
	return result.passkeys ?? [];
}

// Cérémonie complète : options serveur → navigator.credentials.create() →
// vérification serveur. Renvoie les codes de récupération quand c'est la
// première méthode MFA activée (seule occasion de les voir), null sinon.
export async function registerPasskey(
	name: string
): Promise<{ id: string; recovery_codes: string[] | null }> {
	const startResponse = await fetch(resolve('/api/account/passkeys/register/start'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{}'
	});
	if (!startResponse.ok) {
		return throwResponseError(startResponse, "Une erreur est survenue lors de l'activation");
	}
	const startResult = (await startResponse.json()) as {
		options?: PublicKeyCredentialCreationOptionsJSON;
	};
	if (!startResult.options) {
		throw new Error("Une erreur est survenue lors de l'activation");
	}

	const { startRegistration } = await import('@simplewebauthn/browser');
	const credential = await startRegistration({ optionsJSON: startResult.options });

	const verifyResponse = await fetch(resolve('/api/account/passkeys/register/verify'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ response: credential, name })
	});
	if (!verifyResponse.ok) {
		return throwResponseError(verifyResponse, "L'activation a échoué", { redirectOn401: false });
	}
	const result = (await verifyResponse.json()) as { id?: string; recovery_codes?: string[] };
	return { id: result.id ?? '', recovery_codes: result.recovery_codes ?? null };
}

export async function renamePasskey(id: string, name: string): Promise<void> {
	const response = await fetch(resolve('/api/account/passkeys/rename'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id, name })
	});
	if (!response.ok) {
		return throwResponseError(response, 'Le renommage a échoué');
	}
}

export async function deletePasskey(id: string): Promise<void> {
	const response = await fetch(resolve('/api/account/passkeys/delete'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id })
	});
	if (!response.ok) {
		return throwResponseError(response, 'La suppression a échoué');
	}
}
