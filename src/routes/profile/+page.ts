import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';

// L'ancienne page profil est remplacée par le modal Paramètres, ouvert via ?settings=<cat>
export function load(): never {
	redirect(307, `${resolve('/')}?settings=profil`);
}
