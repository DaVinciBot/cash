import type { Permission } from '$lib/permissions';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

interface UserProject {
	id: number;
	name: string;
	debut: string;
}

interface UserProfile {
	email: string;
	name: string;
	avatar: string;
	id: string;
	projects: UserProject[];
	permissions: Permission[];
	allProjects: { value: number; name: string; debut: string }[] | null;
}

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
			permissions: Permission[];
			safeGetSession: () => Promise<{ session: ServerSession | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			cookies: cookies.getAll();
			userProfile: UserProfile | null;
			permissions: Permission[];
			canCreateOrder: boolean;
			menu: {
				title: string;
				uri: string;
				icon: string;
				requiredPermissions: Permission[];
			}[]
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
