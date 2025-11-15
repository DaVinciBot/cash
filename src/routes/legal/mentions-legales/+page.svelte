<script>
	import ArticleFrame from '$lib/components/legal/ArticleFrame.svelte';
	import { canonicalFor } from '$lib/config/site.js';

	const updatedAt = '2025-11-15';
	const canonical = canonicalFor('/legal/mentions-legales');
	const title = 'Mentions légales';
	const intro =
		"Informations relatives à l'éditeur du site davincibot.fr, à son hébergeur et aux responsabilités associées pour le blog public et l'espace membre.";
	const sections = [
		{ id: 'editeur', label: '1. Éditeur' },
		{ id: 'direction', label: '2. Direction de publication' },
		{ id: 'hebergeur', label: '3. Hébergement' },
		{ id: 'contact', label: '4. Contact' },
		{ id: 'propriete', label: '5. Propriété intellectuelle' },
		{ id: 'liens', label: '6. Liens externes' },
		{ id: 'responsabilite', label: '7. Responsabilité' },
		{ id: 'signalement', label: '8. Signalement' }
	];
</script>

<svelte:head>
	<title>Mentions légales — DaVinciBot</title>
	<link rel="canonical" href={canonical} />
	<meta
		name="description"
		content="Mentions légales du site davincibot.fr : identification de l'éditeur, hébergeur Netlify, coordonnées et droits de propriété intellectuelle."
	/>
	<meta name="robots" content="index,follow" />
	<meta property="og:title" content="Mentions légales — DaVinciBot" />
	<meta
		property="og:description"
		content="Retrouvez les informations légales et de contact de l'association DaVinciBot, éditrice du site davincibot.fr."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content={canonical} />
</svelte:head>

<ArticleFrame {title} {intro} {updatedAt} {sections} redirectToLegalHome={true}>
	<div class="space-y-12">
		<section id="editeur" aria-labelledby="heading-editeur">
			<h2 id="heading-editeur">1. Éditeur du site</h2>
			<p>
				Le site <a href="https://davincibot.fr" rel="external">davincibot.fr</a> est édité par
				DaVinciBot, association loi 1901 déclarée auprès de la Préfecture des Hauts-de-Seine. Siège
				social : 12 Av. Léonard de Vinci, 92400 Courbevoie, France. Adresse électronique :
				<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a>.
			</p>
		</section>

		<section id="direction" aria-labelledby="heading-direction">
			<h2 id="heading-direction">2. Direction de la publication</h2>
			<p>
				La direction de la publication est assurée par le bureau de DaVinciBot. Pour toute demande
				relative au contenu éditorial, écrivez à
				<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a>.
			</p>
		</section>

		<section id="hebergeur" aria-labelledby="heading-hebergeur">
			<h2 id="heading-hebergeur">3. Hébergement</h2>
			<p>
				Le front statique est assuré par <a href="https://www.netlify.com" rel="external"
					>Netlify, Inc.</a
				>, 512 2nd Street, Fl 2, San Francisco, CA 94107, États-Unis (<a
					href="https://www.netlify.com/legal/terms-of-use/"
					rel="external">terms of use</a
				>
				• <a href="https://www.netlify.com/privacy/" rel="external">privacy</a>). Notre base de
				données Supabase est hébergée sur Infrastructure AWS Francfort (eu-central-1) et opérée par
				Supabase Pte. Ltd., 65 Chulia Street, Level 38 Unit 02/03, OCBC Centre, Singapore 049513.
				L'association reste pleinement responsable des contenus publiés ainsi que des traitements de
				données.
			</p>
		</section>

		<section id="contact" aria-labelledby="heading-contact-legal">
			<h2 id="heading-contact-legal">4. Contact</h2>
			<p>
				Le site ne comporte pas de formulaire de contact. Pour toute question concernant le Site,
				contactez DaVinciBot par e-mail à <a href="mailto:davincibot@devinci.fr"
					>davincibot@devinci.fr</a
				>
				ou par courrier au siège social. Les demandes impliquant des données personnelles sont
				traitées conformément à la page
				<a href="/legal/donnees-personnelles">Données personnelles</a>.
			</p>
		</section>

		<section id="propriete" aria-labelledby="heading-propriete-legal">
			<h2 id="heading-propriete-legal">5. Propriété intellectuelle</h2>
			<p>
				L'intégralité des contenus présents sur le Site (textes, images, logos, vidéos, graphismes,
				documents téléchargeables, structure générale) est protégée par le
				<a href="https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006069414/" rel="external"
					>Code de la propriété intellectuelle</a
				> et les conventions internationales applicables. Toute reproduction, représentation ou diffusion,
				totale ou partielle, est soumise à l'autorisation écrite préalable de DaVinciBot, sauf exceptions
				légales.
			</p>
		</section>

		<section id="liens" aria-labelledby="heading-liens-legal">
			<h2 id="heading-liens-legal">6. Liens externes</h2>
			<p>
				La présence de liens hypertextes vers d'autres sites n'engage pas la responsabilité de
				DaVinciBot quant à leur contenu. Toute création de lien vers le Site doit faire l'objet
				d'une information préalable adressée à DaVinciBot, qui peut exiger sa suppression s'il
				s'avère contraire aux lois en vigueur ou à l'objet du Site.
			</p>
		</section>

		<section id="responsabilite" aria-labelledby="heading-responsabilite">
			<h2 id="heading-responsabilite">7. Responsabilité</h2>
			<p>
				DaVinciBot s'efforce d'assurer l'exactitude et la mise à jour des informations publiées mais
				ne saurait garantir l'absence d'erreurs. L'association décline toute responsabilité pour
				tout dommage direct ou indirect résultant d'un accès ou d'une impossibilité d'accès au Site,
				de l'utilisation de celui-ci ou des informations qu'il contient.
			</p>
		</section>

		<section id="signalement" aria-labelledby="heading-signalement">
			<h2 id="heading-signalement">8. Signalement d'un contenu illicite</h2>
			<p>
				Tout Utilisateur peut signaler un contenu illicite ou choquant en écrivant à
				<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a>. La demande devra contenir
				l'URL précise du contenu, la date du constat et une description des motifs du signalement.
				DaVinciBot s'engage à examiner chaque signalement et à retirer promptement tout contenu
				manifestement illicite.
			</p>
		</section>
	</div>
</ArticleFrame>
