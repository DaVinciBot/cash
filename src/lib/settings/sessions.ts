import { resolve } from '$app/paths';
import { redirectToLoginIfUnauthorized } from '$lib/settings/authGuard';

export interface SessionInfo {
	id: string;
	created_at: string;
	last_seen_at: string | null;
	absolute_expires_at: string | null;
	trusted_device: boolean;
	device_label: string | null;
	is_current: boolean;
}

export interface ConnectionInfo {
	client_id: string;
	name: string;
	scopes: string | null;
	active: boolean;
	latest_expires_at: string | null;
}

async function throwResponseError(response: Response, fallback: string): Promise<never> {
	redirectToLoginIfUnauthorized(response);
	const result = (await response.json().catch(() => ({}))) as { error?: string };
	throw new Error(result.error ?? fallback);
}

export async function fetchSessions(): Promise<SessionInfo[]> {
	const response = await fetch(resolve('/api/account/sessions'));
	if (!response.ok) {
		return throwResponseError(
			response,
			'Une erreur est survenue lors de la récupération des appareils connectés'
		);
	}
	const result = (await response.json()) as { sessions?: SessionInfo[] };
	return result.sessions ?? [];
}

export async function revokeSession(sessionId: string): Promise<void> {
	const response = await fetch(resolve('/api/account/sessions/revoke'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ session_id: sessionId })
	});
	if (!response.ok) {
		return throwResponseError(
			response,
			"Une erreur est survenue lors de la déconnexion de l'appareil"
		);
	}
}

export async function revokeAllSessions(): Promise<void> {
	const response = await fetch(resolve('/api/account/sessions/revoke-all'), { method: 'POST' });
	if (!response.ok) {
		return throwResponseError(
			response,
			'Une erreur est survenue lors de la déconnexion des appareils'
		);
	}
}

export async function fetchConnections(): Promise<ConnectionInfo[]> {
	const response = await fetch(resolve('/api/account/connections'));
	if (!response.ok) {
		return throwResponseError(
			response,
			'Une erreur est survenue lors de la récupération des applications connectées'
		);
	}
	const result = (await response.json()) as { connections?: ConnectionInfo[] };
	return result.connections ?? [];
}

export async function revokeConnection(clientId: string): Promise<void> {
	const response = await fetch(resolve('/api/account/connections/revoke'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ client_id: clientId })
	});
	if (!response.ok) {
		return throwResponseError(
			response,
			"Une erreur est survenue lors de la révocation de l'application"
		);
	}
}
