import { hasAnyPermission } from '$lib/permissions';
import { userdata } from '$lib/store';
import { supabase } from '$lib/supabaseClient';
import md5 from 'crypto-js/md5';

let loadUserdataInFlight = null;

export async function loadUserdata() {
	if (loadUserdataInFlight) {
		return loadUserdataInFlight;
	}

	loadUserdataInFlight = (async () => {
		let user = {};
		const CACHE_KEY = 'userdata_cache';
		const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

		// Try to load from cache
		try {
			const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
			if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
				userdata.set(cached.user);
				return;
			}
		} catch (e) {
			// Ignore cache errors
		}

		const {
			data: { session },
			error
		} = await supabase.auth.getSession();
		if (error) {
			console.error(error);
			return;
		}
		if (session) {
			// fetch user data
			const { data, error } = await supabase
				.from('profiles')
				.select('username,avatar_url,permissions, member_of(project(id, name, debut))')
				.eq('id', session.user.id)
				.single();
			if (error) {
				console.error(error);
				return;
			}
			if (data.avatar_url == '') {
				data.avatar_url = 'https://gravatar.com/avatar/' + md5(session.user.email) + '?d=identicon';
			}
			user.email = session.user.email || user.email;
			user.name = data.username || user.email.split('@')[0];
			user.avatar = data.avatar_url || user.avatar;
			user.id = session.user.id;
			user.projects = [];
			data.member_of.forEach((p) => {
				user.projects.push({
					id: p.project.id,
					name: p.project.name,
					debut: p.project.debut || '0000-00-00'
				});
			});
			user.permissions = data.permissions || [];
			if (
				hasAnyPermission(user.permissions, [
					'view_all_orders',
					'view_treso',
					'view_members',
					'edit_treso',
					'edit_members'
				])
			) {
				user.projects.push({
					id: 0,
					name: 'Association',
					debut: '2014-09-01'
				});
				const { data: projects, error: projectsError } = await supabase
					.from('projects')
					.select('id, name, debut');
				if (projectsError) {
					console.error(projectsError);
				} else {
					user.allProjects = projects.map((p) => ({ value: p.id, name: p.name, debut: p.debut }));
				}
			}
			userdata.set(user);
			// Save to cache
			try {
				localStorage.setItem(CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }));
			} catch (e) {
				// Ignore cache errors
			}
		}
	})();

	try {
		await loadUserdataInFlight;
	} finally {
		loadUserdataInFlight = null;
	}
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
