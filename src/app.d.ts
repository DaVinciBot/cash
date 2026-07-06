import type { EffectivePermission, GlobalPermission } from '$lib/permissions';
import type { UserProfile } from '$lib/types/profile';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';

interface ServerSession {
	id: string;
	access_token: string;
	refresh_token: string;
	expires_at: number;
	user_id: string;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			session: ServerSession | null;
			user: User | null;
			permissions: EffectivePermission[];
			safeGetSession: () => Promise<{ session: ServerSession | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			cookies: ReturnType<Cookies['getAll']>;
			userProfile: UserProfile | null;
			permissions: EffectivePermission[];
			canCreateOrder: boolean;
			supabase?: SupabaseClient;
			menu: {
				title: string;
				uri: string;
				icon: string;
				requiredPermissions: GlobalPermission[];
			}[];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
