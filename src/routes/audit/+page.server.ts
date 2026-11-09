import type { AuditTab } from '#lib/auditTable.js';
import type { PageServerLoad } from './$types';

// Écran d'audit (TRANS-NF-51/52).
//
// Les journaux, un seul écran, un onglet chacun. L'onglet est dans l'URL et
// non dans un état local : un journal se partage — « regarde ce qui a été refusé
// mardi » est un lien, pas une suite de clics.
//
// Aucun contrôle de permission ici, et aucune lecture non plus : les tables lisent
// leur journal elles-mêmes depuis le navigateur. `audit.logs.read` est exigée par
// la garde de route ET par les policies des tables : un lecteur non autorisé
// n'arriverait pas jusqu'ici, et s'il y arrivait, il verrait des tableaux vides —
// hormis, dans `notification_log`, les notifications qui lui étaient adressées.
// Redoubler la règle en TypeScript créerait un troisième endroit à tenir aligné.

const TABS: AuditTab[] = ['socle', 'cash', 'formation', 'rejets', 'notifications'];

export const load: PageServerLoad = ({ url }) => {
	const asked = url.searchParams.get('tab');
	const tab = TABS.find((candidate) => candidate === asked) ?? 'socle';
	return { tab };
};
