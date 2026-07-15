import type { EffectivePermission } from '$lib/permissions';

export interface UserProject {
	id: number;
	name: string;
	debut: string;
	role: string;
}

export interface UserProfile {
	email: string;
	name: string;
	avatar: string;
	id: string;
	projects: UserProject[];
	permissions: EffectivePermission[];
	allProjects: { value: number; name: string; debut: string }[] | null;
}
