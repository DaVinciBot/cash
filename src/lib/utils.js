import { userdata } from '$lib/store';

/**
 * Loads the current user's profile into the `userdata` store from server data.
 * @param {Record<string, unknown> | null} userFromServer
 */
export async function loadUserdata(userFromServer = null) {
	if (!userFromServer) {
		userdata.set(null);
		return;
	}
	userdata.set(userFromServer);
}

export const statusText = {
	pendingCDP: 'En attente de validation par le chef de projet',
	pendingTreso: 'En attente de validation par le trésorier',
	approvedCDP: 'Validé par le chef de projet',
	approvedTreso: 'Validé par le trésorier',
	refusedCDP: 'Refusé par le chef de projet',
	refusedTreso: 'Refusé par le trésorier',
	processingOrder: 'Commande en cours de traitement',
	ordered: 'Commande passée',
	received: 'Commande reçue',
	canceled: 'Commande annulée',
	completed: 'Commande complétée'
};

export const updateText = {
	'order-creation': 'Création de la commande',
	comment: 'Commentaire ajouté',
	update: 'Mise à jour de la commande',
	'review-cdp-requested': 'Validation par le chef de projet demandée',
	'review-cdp-approved': 'Validation par le chef de projet effectuée',
	'review-cdp-refused': 'Validation par le chef de projet refusée',
	'review-treso-requested': 'Validation par le trésorier demandée',
	'review-treso-approved': 'Validation par le trésorier effectuée',
	'review-treso-refused': 'Validation par le trésorier refusée',
	'order-processed': 'Commande en cours de traitement',
	'order-received': 'Commande reçue',
	'order-canceled': 'Commande annulée',
	'order-completed': 'Commande complétée'
};

export function loadSettings(key) {
	let settings_;
	try {
		settings_ = JSON.parse(window.localStorage.getItem(`settings_${key}`)) || [];
	} catch (e) {
		console.error(
			'echec lors de la récupération des données, la fonction est problement executé depuis le serveur'
		);
		return;
	}
	return settings_;
}

export function saveSettings(key, settings) {
	try {
		localStorage.setItem(`settings_${key}`, JSON.stringify(settings));
	} catch (e) {
		console.error(
			"echec lors de l'enregistrement, la fonction est problement executé depuis le serveur"
		);
		return;
	}
}

export function hashCode(obj) {
	let str = JSON.stringify(obj);
	let hash = 0;
	for (let i = 0, len = str.length; i < len; i++) {
		let chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

export function hideOnClickOutside(
	element,
	destroyHandler = (el) => {
		el.classList.toggle('hidden');
	},
	permanent = false
) {
	const outsideClickListener = (event) => {
		if (!element.contains(event.target) && isVisible(element)) {
			// or use: event.target.closest(selector) === null
			destroyHandler(element);
			if (!permanent) removeClickListener();
		}
	};

	const removeClickListener = () => {
		document.removeEventListener('click', outsideClickListener);
	};

	document.addEventListener('click', outsideClickListener);
}
const isVisible = (elem) =>
	!!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length); // source (2018-03-11): https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js
