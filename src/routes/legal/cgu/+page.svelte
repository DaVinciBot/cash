<script>
	import ArticleFrame from '$lib/components/legal/ArticleFrame.svelte';
	import { canonicalFor } from '$lib/config/site.js';

	const updatedAt = '2025-11-15';
	const canonical = canonicalFor('/legal/cgu');
	const title = "Conditions générales d'utilisation";
	const intro =
		"Ces conditions précisent les règles applicables à la consultation publique du blog davincibot.fr et à l'espace membre réservé aux bénévoles de l'association.";
	const sections = [
		{ id: 'objet', label: '1. Objet' },
		{ id: 'definitions', label: '2. Définitions' },
		{ id: 'acceptation', label: '3. Acceptation et mise à jour' },
		{ id: 'acces', label: '4. Accès au site' },
		{ id: 'services', label: '5. Services proposés' },
		{ id: 'comportements', label: '6. Comportements interdits' },
		{ id: 'propriete', label: '7. Propriété intellectuelle' },
		{ id: 'liens', label: '8. Liens hypertextes' },
		{ id: 'garanties', label: '9. Garanties et responsabilités' },
		{ id: 'securite', label: '10. Sécurité' },
		{ id: 'contact', label: '11. Contact' },
		{ id: 'droit', label: '12. Droit applicable' }
	];
</script>

<svelte:head>
	<title>Conditions générales d'utilisation — DaVinciBot</title>
	<link rel="canonical" href={canonical} />
	<meta
		name="description"
		content="Consultez les conditions générales d'utilisation du site davincibot.fr : accès, responsabilités, propriété intellectuelle et modalités de contact."
	/>
	<meta name="robots" content="index,follow" />
	<meta property="og:title" content="Conditions générales d'utilisation — DaVinciBot" />
	<meta
		property="og:description"
		content="Cadre légal d'utilisation du site davincibot.fr et engagements de l'association DaVinciBot."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content={canonical} />
</svelte:head>

<ArticleFrame {title} {intro} {updatedAt} {sections} redirectToLegalHome={true}>
	<div class="space-y-12">
		<section id="objet" aria-labelledby="heading-objet">
			<h2 id="heading-objet">1. Objet</h2>
			<p>
				Les présentes conditions générales d'utilisation (ci-après « CGU ») encadrent la
				consultation du blog public et des pages institutionnelles du site
				<a href="https://davincibot.fr" rel="external">davincibot.fr</a> (ci-après « le Site »), ainsi
				que l'accès à l'espace numérique réservé aux membres de l'association loi 1901 DaVinciBot, domiciliée
				12 Av. Léonard de Vinci, 92400 Courbevoie. Toute navigation vaut acceptation sans réserve des
				présentes CGU.
			</p>
		</section>

		<section id="definitions" aria-labelledby="heading-definitions">
			<h2 id="heading-definitions">2. Définitions</h2>
			<ul>
				<li>
					<strong>Site</strong> : l'ensemble des contenus et fonctionnalités accessibles à l'adresse
					<a href="https://davincibot.fr" rel="external">https://davincibot.fr</a>.
				</li>
				<li>
					<strong>Services</strong> : les formulaires de contact, contenus éditoriaux, flux d'actualité
					et plus largement toute ressource disponible sur le Site.
				</li>
				<li>
					<strong>Utilisateur</strong> : toute personne qui consulte ou interagit avec le Site.
				</li>
			</ul>
		</section>

		<section id="acceptation" aria-labelledby="heading-acceptation">
			<h2 id="heading-acceptation">3. Acceptation et mise à jour</h2>
			<p>
				L'utilisation du Site implique l'acceptation pleine et entière des CGU. DaVinciBot peut les
				actualiser pour tenir compte des évolutions légales, techniques ou fonctionnelles. La date
				de dernière révision figure en tête de page et toute poursuite de la navigation ou
				utilisation de l'espace membre vaut acceptation de la version en vigueur. Les versions
				successives peuvent être obtenues sur simple demande écrite.
			</p>
		</section>

		<section id="acces" aria-labelledby="heading-acces">
			<h2 id="heading-acces">4. Accès au Site</h2>
			<p>
				Le Site public (articles de blog, pages de présentation et informations sur les sponsors)
				est librement accessible sans création de compte. L'espace membre, destiné aux bénévoles de
				DaVinciBot, nécessite une authentification individuelle fournie par l'association. Le Site
				est disponible 24 h/24 et 7 j/7, sous réserve des opérations de maintenance ou
				indisponibilités de nos prestataires : <a
					href="https://www.netlify.com/legal/terms-of-use/"
					rel="external">Netlify, Inc.</a
				>
				pour l'hébergement statique et Supabase (Infrastructure AWS Francfort eu-central-1) pour la base
				de données. DaVinciBot ne saurait être tenue responsable des interruptions de service imputables
				à ces fournisseurs ou aux réseaux de communication.
			</p>
		</section>

		<section id="services" aria-labelledby="heading-services">
			<h2 id="heading-services">5. Services proposés</h2>
			<p>
				Le Site public permet de consulter librement des articles de blog sur l'actualité de
				l'association, des pages de présentation de nos activités et les informations relatives à
				nos sponsors. Aucun formulaire de contact ni fonctionnalité de dépôt de contenu n'est
				proposé aux visiteurs.
			</p>
			<p>
				L'espace membre offre, quant à lui, des outils internes : gestion des commandes de matériel,
				accès aux services numériques et consultation du suivi des demandes. Ces fonctionnalités
				sont réservées aux membres authentifiés et peuvent évoluer en fonction des besoins
				opérationnels de DaVinciBot.
			</p>
		</section>

		<section id="comportements" aria-labelledby="heading-comportements">
			<h2 id="heading-comportements">6. Comportements interdits</h2>
			<p>
				L'Utilisateur s'engage à ne pas porter atteinte au bon fonctionnement du Site, notamment en
				:
			</p>
			<ul>
				<li>
					tentant d'accéder de manière non autorisée aux systèmes d'information de DaVinciBot ou de
					son hébergeur ;
				</li>
				<li>
					collectant ou utilisant des données personnelles présentes sur le Site sans autorisation ;
				</li>
				<li>
					diffusant des contenus illicites, injurieux, diffamatoires, discriminatoires ou portant
					atteinte aux droits de tiers ;
				</li>
				<li>
					utilisant le Site à des fins frauduleuses, publicitaires ou commerciales non autorisées.
				</li>
			</ul>
		</section>

		<section id="propriete" aria-labelledby="heading-propriete">
			<h2 id="heading-propriete">7. Propriété intellectuelle</h2>
			<p>
				Le Site et chacun des éléments qui le composent (marques, logos, icônes, infographies,
				photographies) sont protégés par la législation internationale de la propriété
				intellectuelle, notamment le
				<a href="https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006069414/" rel="external"
					>Code de la propriété intellectuelle</a
				>. Les contenus figurant sur le Site sont la propriété de DaVinciBot ou de leurs titulaires
				respectifs. Toute reproduction ou représentation, par quelque procédé et support que ce
				soit, est subordonnée à l'autorisation expresse de DaVinciBot.
			</p>
		</section>

		<section id="liens" aria-labelledby="heading-liens">
			<h2 id="heading-liens">8. Liens hypertextes</h2>
			<p>
				Le Site peut contenir des liens vers des sites tiers. DaVinciBot n'exerce aucun contrôle sur
				ces ressources externes et décline toute responsabilité quant à leur contenu, leur
				disponibilité ou leur conformité légale. La création d'un lien vers une page de
				davincibot.fr est autorisée sous réserve d'une mention explicite de la source et d'absence
				de confusion sur l'origine des contenus.
			</p>
		</section>

		<section id="garanties" aria-labelledby="heading-garanties">
			<h2 id="heading-garanties">9. Garanties et responsabilités</h2>
			<p>
				Les contenus publiés (articles, descriptions de projets, informations sponsors) le sont à
				titre indicatif. Malgré nos efforts pour assurer leur exactitude, DaVinciBot ne peut
				garantir leur exhaustivité ni l'absence d'erreurs. L'association décline toute
				responsabilité pour les dommages directs ou indirects résultant de l'utilisation du Site ou
				des services internes, y compris la perte de données, l'altération de fichiers,
				l'introduction de logiciels malveillants ou toute indisponibilité.
			</p>
		</section>

		<section id="securite" aria-labelledby="heading-securite">
			<h2 id="heading-securite">10. Sécurité</h2>
			<p>
				DaVinciBot met en œuvre des mesures raisonnables pour sécuriser le Site (chiffrement TLS,
				surveillance de l'hébergement Netlify, politiques d'accès restreint). Dans le cadre de
				l'authentification des membres, nous enregistrons l'adresse IP utilisée et l'horodatage de
				chaque connexion afin de détecter les accès anormaux et protéger les comptes. L'Utilisateur
				est invité à utiliser des équipements récents, dépourvus de virus et dotés d'un navigateur à
				jour.
			</p>
		</section>

		<section id="contact" aria-labelledby="heading-contact">
			<h2 id="heading-contact">11. Contact</h2>
			<p>
				Pour toute question relative aux CGU ou signalement de contenu illicite, l'Utilisateur peut
				écrire à
				<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a> ou adresser un courrier à DaVinciBot,
				12 Av. Léonard de Vinci, 92400 Courbevoie, France.
			</p>
		</section>

		<section id="droit" aria-labelledby="heading-droit">
			<h2 id="heading-droit">12. Droit applicable et juridiction compétente</h2>
			<p>
				Les présentes CGU sont soumises au droit français. Tout litige relatif à l'interprétation ou
				à l'exécution des CGU relève de la compétence des tribunaux français territorialement
				compétents.
			</p>
		</section>
	</div>
</ArticleFrame>
