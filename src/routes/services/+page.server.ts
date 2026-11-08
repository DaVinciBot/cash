import type { PageServerLoad } from './$types';

export type Health = 'operational' | 'unavailable' | 'unknown' | 'pending' | 'none';

const serviceDefinitions = [
    {
        name: 'DocuSeal',
        description: 'Signez et faites signer vos documents électroniquement.',
        href: 'https://sign.davincibot.fr/',
        kumaId: 3 
    },
    {
        name: 'Rallly',
        description: 'Préparez des sondages pour organiser vos réunions et événements.',
        href: 'https://rallly.davincibot.fr/',
        kumaId: 1 
    },
    {
        name: 'Overleaf',
        description: 'Rédigez et collaborez sur vos documents LaTeX avec Overleaf.',
        href: 'https://tex.davincibot.fr/',
        kumaId: 183
    },
    {
        name: 'Pangolin',
        description: 'Accédez à Pangolin',
        href: 'https://pangolin.davincibot.fr/',
        kumaId: 16
    },
    {
        name: 'Vaultwarden',
        description: 'Gérez vos mots de passe et vos secrets en toute sécurité.',
        href: 'https://vault.davincibot.fr/',
        kumaId: 7
    },
    {
        name: 'Documentation DVB',
        description: 'Accédez à la documentation de vos services et applications.',
        href: 'https://docs.davincibot.fr/',
        kumaId: null
    },
    {
        name: 'Notion',
        description: 'Accédez au documents et organisation de vos projets dans Notion.',
        href: 'https://app.notion.com/p/davincibot',
        kumaId: null
    },
    {
        name: 'GitHub',
        description: 'Accédez à nos dépôts et projets sur GitHub.',
        href: 'https://github.com/DaVinciBot',
        kumaId: null
    },
    {
        name: 'Plane',
        description: 'Accédez à l\'organisation de vos projets et tâches dans Plane.',
        href: 'https://plane.davincibot.fr/',
        kumaId: null
    }
];

async function checkKumaBadge(kumaId: number | null, svelteFetch: typeof fetch): Promise<Health> {
    if (kumaId === null) return 'none';

    try {
        const response = await svelteFetch(`https://uptime.davincibot.fr/api/badge/${kumaId}/status`, {
            signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) return 'unknown';

        const svgText = await response.text();
        const lowerSvg = svgText.toLowerCase();


        if (lowerSvg.includes('>up<')) {
            return 'operational';
        } else if (lowerSvg.includes('>down<') || lowerSvg.includes('>maintenance<')) {
            return 'unavailable';
        } else if(lowerSvg.includes('>pending<')) {
            return 'pending';
        }
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

export const load: PageServerLoad = ({ fetch }) => {
    return {
        services: serviceDefinitions.map((service) => ({
            name: service.name,
            description: service.description,
            href: service.href,
            healthPromise: checkKumaBadge(service.kumaId, fetch)
        }))
    };
};