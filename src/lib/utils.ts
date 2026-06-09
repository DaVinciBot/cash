import { userdata, type UserData } from '$lib/store';
import { mount, unmount, type Component } from 'svelte';

export type CloseEvent = Event | Element | null;
export type CloseHandler = (event: CloseEvent) => void;
type ClosableProps = Record<string, unknown> & {
	onClose?: CloseHandler;
};

interface MountClosableOptions {
	target: Element | Document | ShadowRoot;
	anchor?: Node;
	props?: ClosableProps;
	context?: Map<unknown, unknown>;
	intro?: boolean;
	recover?: boolean;
	sync?: boolean;
	idPrefix?: string;
}

export function loadUserdata(userFromServer: UserData = null) {
	userdata.set(userFromServer);
}

export function mountClosable(component: Component<ClosableProps>, options: MountClosableOptions) {
	const props = options.props ?? {};
	let instance: ReturnType<typeof mount> | null = null;

	const close: CloseHandler = (event) => {
		try {
			props.onClose?.(event);
		} finally {
			if (instance) {
				void unmount(instance);
			}
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

export function loadSettings(key: string): unknown {
	try {
		return JSON.parse(window.localStorage.getItem(`settings_${key}`) ?? '[]');
	} catch {
		return undefined;
	}
}

export function saveSettings(key: string, settings: unknown) {
	try {
		localStorage.setItem(`settings_${key}`, JSON.stringify(settings));
	} catch {
		return undefined;
	}
}

export function hashCode(obj: unknown) {
	const str = JSON.stringify(obj);
	let hash = 0;
	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0;
	}
	return hash;
}

export function hideOnClickOutside(
	element: HTMLElement,
	destroyHandler: (element: HTMLElement) => void = (el) => {
		el.classList.toggle('hidden');
	},
	permanent = false
) {
	const outsideClickListener = (event: MouseEvent) => {
		if (!(event.target instanceof Node)) {
			return;
		}
		if (!element.contains(event.target) && isVisible(element)) {
			destroyHandler(element);
			if (!permanent) {
				removeClickListener();
			}
		}
	};

	const removeClickListener = () => {
		document.removeEventListener('click', outsideClickListener);
	};

	document.addEventListener('click', outsideClickListener);
}

function isVisible(elem: HTMLElement) {
	return Boolean(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}
