// Catalogue d'affichage du RBAC pour le panneau d'administration.
//
// La source d'autorité reste `GLOBAL_PERMISSIONS` / `GLOBAL_ROLES` de
// `@davincibot/lib` (miroirs des enums Postgres). Ce module ne fait que les
// habiller : un libellé français par permission, et un regroupement par domaine
// pour que le tiroir présente des sections repliables plutôt qu'une liste de
// trente-sept cases à cocher.
//
// `GLOBAL_PERMISSION_LABELS` est un `Record<GlobalPermission, string>` : si
// une permission est ajoutée à l'enum côté base, la compilation échoue ici tant
// qu'elle n'a pas reçu son libellé. Le regroupement, lui, se rattrape à
// l'exécution — toute permission oubliée retombe dans « Autres », jamais dans
// le vide.

import {
	GLOBAL_PERMISSIONS,
	GLOBAL_ROLE_LABELS,
	type GlobalPermission,
	type GlobalRole
} from '@davincibot/lib';

export interface CatalogEntry<T extends string> {
	value: T;
	label: string;
}

export type CatalogCategories<T extends string> = Record<string, CatalogEntry<T>[]>;

export const GLOBAL_PERMISSION_LABELS: Record<GlobalPermission, string> = {
	// members.*
	'members.profile.read.all': 'Voir les membres',
	'members.profile.update.all': 'Éditer les membres',
	'members.invite.send': 'Inviter un membre',
	'members.profile.status.update': 'Activer / désactiver un profil',
	'members.projects.update.all': 'Éditer les rattachements aux projets',
	// projects.*
	'projects.manage.all': 'Gérer les projets (nom, campus, budget)',
	// iam.*
	'iam.roles.manage': 'Attribuer les rôles globaux',
	'iam.overrides.manage': 'Attribuer les permissions supplémentaires',
	// training.*
	'training.catalog.read': 'Voir le catalogue',
	'training.slot.read': 'Voir les sessions',
	'training.slot.manage': 'Créer et éditer les sessions',
	'training.registration.manage.self': "S'inscrire aux formations",
	'training.registration.read.all': 'Voir les inscriptions',
	'training.registration.manage.all': 'Gérer les inscriptions',
	'training.request.manage.self': 'Demander des formations',
	'training.request.manage.all': 'Gérer les demandes de formation',
	'training.presence.update': 'Éditer les présences',
	'training.summary_email.receive': 'Recevoir le récapitulatif par email',
	'training.summary.discord.send': "Envoyer l'annonce sur Discord",
	'training.story.discord.send': 'Envoyer la story sur Discord',
	// orders.*
	'orders.items.manage.self': 'Demander des items',
	'orders.read.all': 'Voir toutes les commandes',
	'orders.create.all': 'Créer une commande',
	'orders.bundle.manage': 'Regrouper des items en commande',
	'orders.items.refuse': 'Refuser un item (tréso)',
	'orders.items.receive': 'Marquer un item comme reçu',
	// finance.* / stats.*
	'finance.read': 'Voir la trésorerie',
	'finance.write': 'Éditer la trésorerie',
	'finance.periods.close': 'Clore une période comptable',
	'finance.documents.generate': 'Générer des documents',
	'stats.read.all': 'Voir les statistiques globales',
	// blog.* / integration.*
	'blog.draft.write': 'Éditer les brouillons du blog',
	'blog.publish': 'Publier sur le blog',
	'integration.smartshare.cast': 'Diffuser sur SmartShare',
	// audit.* / infra.*
	'audit.logs.read': 'Consulter les journaux',
	'audit.events.export': 'Exporter les journaux',
	'infra.environments.access': 'Accéder aux environnements de pré-production'
};

/**
 * Regroupement par domaine métier. Chaque section reste courte (six entrées au
 * plus) : c'est ce qui rend le repli utile — une section ouverte tient à
 * l'écran sans faire défiler le reste du formulaire hors de vue.
 */
const PERMISSION_GROUPS: { title: string; permissions: GlobalPermission[] }[] = [
	{
		title: 'Membres et projets',
		permissions: [
			'members.profile.read.all',
			'members.profile.update.all',
			'members.invite.send',
			'members.profile.status.update',
			'members.projects.update.all',
			'projects.manage.all'
		]
	},
	{
		title: 'Rôles et permissions (IAM)',
		permissions: ['iam.roles.manage', 'iam.overrides.manage']
	},
	{
		title: 'Formation — catalogue et sessions',
		permissions: ['training.catalog.read', 'training.slot.read', 'training.slot.manage']
	},
	{
		title: 'Formation — inscriptions et présences',
		permissions: [
			'training.registration.manage.self',
			'training.registration.read.all',
			'training.registration.manage.all',
			'training.request.manage.self',
			'training.request.manage.all',
			'training.presence.update'
		]
	},
	{
		title: 'Formation — diffusion',
		permissions: [
			'training.summary_email.receive',
			'training.summary.discord.send',
			'training.story.discord.send'
		]
	},
	{
		title: 'Commandes',
		permissions: [
			'orders.items.manage.self',
			'orders.read.all',
			'orders.create.all',
			'orders.bundle.manage',
			'orders.items.refuse',
			'orders.items.receive'
		]
	},
	{
		title: 'Trésorerie et statistiques',
		permissions: [
			'finance.read',
			'finance.write',
			'finance.periods.close',
			'finance.documents.generate',
			'stats.read.all'
		]
	},
	{
		title: 'Communication',
		permissions: ['blog.draft.write', 'blog.publish', 'integration.smartshare.cast']
	},
	{
		title: 'Audit et infrastructure',
		permissions: ['audit.logs.read', 'audit.events.export', 'infra.environments.access']
	}
];

function permissionEntry(value: GlobalPermission): CatalogEntry<GlobalPermission> {
	return { value, label: GLOBAL_PERMISSION_LABELS[value] };
}

export function buildPermissionCategories(): CatalogCategories<GlobalPermission> {
	const categories: CatalogCategories<GlobalPermission> = {};
	const grouped = new Set<GlobalPermission>();

	for (const group of PERMISSION_GROUPS) {
		const entries = group.permissions.filter((permission) => {
			if (grouped.has(permission)) {
				return false;
			}
			grouped.add(permission);
			return true;
		});
		if (entries.length > 0) {
			categories[group.title] = entries.map(permissionEntry);
		}
	}

	// Filet de sécurité : une permission ajoutée à l'enum mais pas encore
	// classée reste attribuable, au lieu de disparaître du formulaire.
	const ungrouped = GLOBAL_PERMISSIONS.filter((permission) => !grouped.has(permission));
	if (ungrouped.length > 0) {
		categories.Autres = ungrouped.map(permissionEntry);
	}

	return categories;
}

export const OVERRIDE_PERMISSION_CATEGORIES = buildPermissionCategories();

/**
 * Rôles globaux regroupés par nature de mandat. L'ordre suit celui de l'enum
 * `public.global_role`, du rang le plus élevé au plus bas.
 */
const ROLE_GROUPS: { title: string; roles: GlobalRole[] }[] = [
	{
		title: 'Direction',
		roles: ['super_admin', 'president', 'secretary', 'treasurer']
	},
	{
		title: 'Responsables de pôle',
		roles: ['directorate', 'project_director', 'training_director', 'communication_director']
	},
	{
		title: 'Membres',
		roles: ['content_writer', 'digital_department', 'member', 'guest']
	}
];

export const GLOBAL_ROLE_CATEGORIES: CatalogCategories<GlobalRole> = Object.fromEntries(
	ROLE_GROUPS.map((group) => [
		group.title,
		group.roles.map((role) => ({ value: role, label: GLOBAL_ROLE_LABELS[role] }))
	])
);
