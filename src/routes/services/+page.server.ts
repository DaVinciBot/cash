import type { PageServerLoad } from './$types';

export type Health = 'operational' | 'unavailable' | 'unknown' | 'pending';

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
        description: 'Rédigez et collaborez sur vos documents LaTeX.',
        href: 'https://tex.davincibot.fr/',
        kumaId: 183
    },
    {
        name: 'Pangolin',
        description: 'Accédez aux statistiques de vos services et applications hébergés sur le serveur.',
        href: 'https://pangolin.davincibot.fr/',
        kumaId: 16
    },
    {
        name: 'Vaultwarden',
        description: 'Gérez vos mots de passe et vos secrets en toute sécurité.',
        href: 'https://vault.davincibot.fr/',
        kumaId: 7
    }
];

async function checkKumaBadge(kumaId: number | null, svelteFetch: typeof fetch): Promise<Health> {
    if (kumaId === null) return 'unknown';

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