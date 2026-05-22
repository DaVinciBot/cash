import { userdata } from '$lib/store';
import { mount, unmount } from 'svelte';

/**
 * Loads the current user's profile into the `userdata` store from server data.
 * @param {Record<string, unknown> | null} userFromServer
 */
export async function loadUserdata(userFromServer = null) {
	if (!userFromServer) {
		return;
	}
	userdata.set(userFromServer);
}

export function mountClosable(component, options = {}) {
	const props = options.props || {};
	let instance;

	const close = (event) => {
		try {
			if (typeof props.onClose === 'function') props.onClose(event);
		} finally {
			if (instance) unmount(instance);
		}
	};

	instance = mount(component, {
		...options,
		props: {
			...props,
			onClose: close
		}
	});

	return instance;
}

export const statusText = {
	pending_cdp: 'En revue par le chef de projet',
	pending_treso: 'En revue par le trésorier',
	pending_delivery: 'En attente de livraison',
	refused_cdp: 'Refusée par le chef de projet',
	refused_treso: 'Refusée par le trésorier',
	canceled_user: 'Annulée par le demandeur',
	canceled_ops: 'Annulée côté opérationnel',
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
	'order-pending-delivery': 'Commande validée, en attente de livraison',
	'order-canceled-user': 'Commande annulée par le demandeur',
	'order-canceled-ops': 'Commande annulée côté opérationnel',
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
