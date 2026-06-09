import type { Permission } from '$lib/permissions';

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
	permissions: Permission[];
	allProjects: { value: number; name: string; debut: string }[] | null;
}
