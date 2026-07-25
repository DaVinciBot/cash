import { buildLoginUrl } from '@davincibot/lib';

// Session SSO expirée ou révoquée alors que la page est déjà ouverte : même
// issue que la garde serveur du layout, on renvoie vers la page de connexion
// avec retour sur la page courante.
export function redirectToLoginIfUnauthorized(response: Response): void {
	if (response.status === 401) {
		window.location.href = buildLoginUrl(window.location.href);
		throw new Error('Session expirée, redirection vers la page de connexion…');
	}
}
