import type { PageServerLoad } from './$types';

// J'ai ajouté le type au cas où vous voudriez l'exporter plus tard
export type Health = 'operational' | 'unavailable' | 'unknown';

const serviceDefinitions = [
    {
        name: 'DocuSeal',
        description: 'Signez et faites signer vos documents électroniquement.',
        href: 'https://sign.davincibot.fr/'
    },
    {
        name: 'Rallly',
        description: 'Préparez des sondages pour organiser vos réunions et événements.',
        href: 'https://rallly.davincibot.fr/'
    },
    {
        name: 'Overleaf',
        description: 'Rédigez et collaborez sur vos documents LaTeX.',
        href: 'https://tex.davincibot.fr/'
    },
    {
        name: 'Pangolin',
        description: 'Accédez aux statistiques de vos services et applications hébergés sur le serveur.',
        href: 'https://pangolin.davincibot.fr/'
    },
    {
        name: 'Vaultwarden',
        description: 'Gérez vos mots de passe et vos secrets en toute sécurité.',
        href: 'https://vault.davincibot.fr/'
    }
] as const;

// On passe le fetch spécial de SvelteKit en paramètre
async function serviceHealth(href: string, svelteFetch: typeof fetch): Promise<Health> {
    try {
        const response = await svelteFetch(href, {
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok || response.status === 401 || response.status === 403) {
            return 'operational';
        }
        
        return 'unavailable';
    } catch {
        return 'unknown';
    }
}

export const load: PageServerLoad = ({ fetch }) => {

    return {
        services: serviceDefinitions.map((service) => ({
            ...service,
            healthPromise: serviceHealth(service.href, fetch)
        }))
    };
};