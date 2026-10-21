import { orderList } from '#lib/server/orders.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:orders');

	return { orders: await orderList(locals.supabase) };
};
