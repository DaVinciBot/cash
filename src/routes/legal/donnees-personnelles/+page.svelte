<script>
	import ArticleFrame from '$lib/components/legal/ArticleFrame.svelte';
	import { canonicalFor } from '$lib/config/site.js';

	const updatedAt = '2025-11-15';
	const canonical = canonicalFor('/legal/donnees-personnelles');
	const title = 'Données personnelles et RGPD';
	const intro =
		"Politique de protection des données décrivant la navigation publique sans collecte nominative et la gestion des comptes membres de l'association.";
	const sections = [
		{ id: 'responsable', label: '1. Responsable du traitement' },
		{ id: 'donnees', label: '2. Données collectées' },
		{ id: 'finalites', label: '3. Finalités et bases légales' },
		{ id: 'destinataires', label: '4. Destinataires' },
		{ id: 'hebergement', label: '5. Hébergement' },
		{ id: 'conservation', label: '6. Durées de conservation' },
		{ id: 'droits', label: '7. Vos droits' },
		{ id: 'exercice', label: '8. Exercer vos droits' },
		{ id: 'cookies', label: '9. Cookies' },
		{ id: 'securite', label: '10. Sécurité' },
		{ id: 'evolutions', label: '11. Évolutions' }
	];
</script>

<svelte:head>
	<title>Données personnelles — DaVinciBot</title>
	<link rel="canonical" href={canonical} />
	<meta
		name="description"
		content="Découvrez comment DaVinciBot collecte, protège et utilise vos données personnelles conformément au RGPD, ainsi que les moyens d'exercer vos droits."
	/>
	<meta name="robots" content="index,follow" />
	<meta property="og:title" content="Données personnelles — DaVinciBot" />
	<meta
		property="og:description"
		content="Politique RGPD de DaVinciBot : finalités, durées de conservation, destinataires et hébergement Netlify."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content={canonical} />
</svelte:head>

<ArticleFrame {title} {intro} {updatedAt} {sections} redirectToLegalHome={true}>
	<div class="space-y-12">
		<section id="responsable" aria-labelledby="heading-responsable">
			<h2 id="heading-responsable">1. Responsable du traitement</h2>
			<p>
				Le responsable des traitements mis en œuvre via le site
				<a href="https://davincibot.fr" rel="external">davincibot.fr</a> est l'association
				DaVinciBot, 12 Av. Léonard de Vinci, 92400 Courbevoie, France. Pour toute question relative
				à la protection des données, contactez le référent RGPD à
				<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a>.
			</p>
		</section>

		<section id="donnees" aria-labelledby="heading-donnees">
			<h2 id="heading-donnees">2. Données collectées</h2>
			<p>
				La consultation publique du Site (articles, pages institutionnelles, informations sponsors)
				ne nécessite aucune inscription et n'entraîne pas de collecte nominative. Nous ne déposons
				pas de cookies publicitaires ni de traceurs nécessitant votre consentement.
			</p>
			<p>Dans le cadre de l'espace membre, nous collectons et conservons :</p>
			<ul>
				<li>nom, prénom et photo de profil fournis par l'association ;</li>
				<li>adresse e-mail étudiante, rôle au sein de l'association et projet rattaché ;</li>
				<li>historique des commandes effectuées depuis l'espace membre et leurs statuts ;</li>
				<li>
					journaux d'authentification comprenant l'adresse IP utilisée et l'horodatage de la
					connexion.
				</li>
			</ul>
			<p>
				Des journaux techniques non nominaux (statistiques agrégées, traces d'erreur) peuvent
				également être produits par nos prestataires pour garantir la sécurité du service.
			</p>
		</section>

		<section id="finalites" aria-labelledby="heading-finalites">
			<h2 id="heading-finalites">3. Finalités et bases légales</h2>
			<p>Les traitements réalisés poursuivent les objectifs suivants :</p>
			<ul>
				<li>
					<strong>Gestion des comptes membres et des accès</strong> : création, administration et suppression
					des comptes des bénévoles (base légale : intérêt légitime de l'association et exécution de
					la mission associative).
				</li>
				<li>
					<strong>Suivi des commandes et des services internes</strong> : traitement des demandes de
					matériel et suivi des statuts (base légale : intérêt légitime et engagement associatif).
				</li>
				<li>
					<strong>Sécurisation du service</strong> : conservation des journaux de connexion (IP, date,
					heure) pour détecter les usages frauduleux (base légale : intérêt légitime à protéger les comptes).
				</li>
				<li>
					<strong>Respect des obligations légales</strong> : tenue d'un registre des droits exercés et
					réponse aux demandes RGPD (base légale : obligation légale).
				</li>
			</ul>
		</section>

		<section id="destinataires" aria-labelledby="heading-destinataires">
			<h2 id="heading-destinataires">4. Destinataires et accès</h2>
			<p>
				Les données sont traitées par les membres habilités du bureau DaVinciBot et, lorsque
				nécessaire, par les bénévoles en charge de la communication. L'accès est limité par profils
				et soumis à des engagements de confidentialité. Aucun transfert commercial n'est réalisé ;
				les données ne sont jamais vendues.
			</p>
		</section>

		<section id="hebergement" aria-labelledby="heading-hebergement">
			<h2 id="heading-hebergement">5. Hébergement et transferts internationaux</h2>
			<p>
				Le Site statique est servi par <a href="https://www.netlify.com" rel="external"
					>Netlify, Inc.</a
				>
				(États-Unis). Les données relatives aux membres sont hébergées dans notre base Supabase installée
				sur l'infrastructure AWS Francfort (eu-central-1). Supabase Pte. Ltd. opère ce service depuis
				Singapour. Les flux hors UE sont encadrés par des clauses contractuelles types et les données
				sont chiffrées en transit et au repos.
			</p>
		</section>

		<section id="conservation" aria-labelledby="heading-conservation">
			<h2 id="heading-conservation">6. Durées de conservation</h2>
			<ul>
				<li>
					Données de compte des membres : pendant la durée d'appartenance à l'association, puis
					archivage sécurisé pendant 24 mois avant suppression.
				</li>
				<li>
					Historique des commandes et statuts : durée de la relation associative prolongée de 5 ans
					pour assurer la traçabilité interne.
				</li>
				<li>Journaux de connexion (IP, date, heure) : 12 mois maximum.</li>
				<li>
					Statistiques techniques agrégées : durée strictement nécessaire à l'analyse anonymisée.
				</li>
			</ul>
		</section>

		<section id="droits" aria-labelledby="heading-droits">
			<h2 id="heading-droits">7. Vos droits</h2>
			<p>
				Conformément aux articles 15 à 22 du
				<a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj" rel="external">RGPD</a>, vous
				disposez des droits suivants : accès, rectification, effacement, limitation, opposition,
				portabilité et définition de directives post-mortem. Vous pouvez retirer votre consentement
				lorsqu'il constitue la base légale d'un traitement. En cas de doute raisonnable sur votre
				identité, DaVinciBot pourra demander un justificatif supplémentaire.
			</p>
		</section>

		<section id="exercice" aria-labelledby="heading-exercice">
			<h2 id="heading-exercice">8. Exercer vos droits</h2>
			<p>
				Pour exercer vos droits, adressez un e-mail à
				<a href="mailto:davincibot@devinci.fr">davincibot@devinci.fr</a>
				ou un courrier postal à DaVinciBot, 12 Av. Léonard de Vinci, 92400 Courbevoie, en précisant les
				données concernées et la nature de votre demande. Une réponse vous sera adressée sous un mois,
				prorogeable de deux mois en cas de complexité. Vous pouvez également saisir la
				<a href="https://www.cnil.fr/" rel="external">CNIL</a>.
			</p>
		</section>

		<section id="cookies" aria-labelledby="heading-cookies">
			<h2 id="heading-cookies">9. Cookies et mesure d'audience</h2>
			<p>
				davincibot.fr n'utilise que des cookies techniques indispensables au chargement du Site. Les
				statistiques fournies par Netlify sont agrégées et ne permettent pas d'identifier les
				visiteurs. Si de nouveaux traceurs nécessitant votre consentement étaient déployés, une
				bannière et un module de gestion des préférences seraient mis en place avant tout dépôt.
			</p>
		</section>

		<section id="securite" aria-labelledby="heading-securite">
			<h2 id="heading-securite">10. Sécurité des données</h2>
			<p>
				DaVinciBot met en œuvre des mesures physiques, logiques et organisationnelles adaptées :
				chiffrement TLS, gestion restreinte des accès administrateurs, sauvegardes régulières,
				journalisation des opérations sensibles et sensibilisation des équipes bénévoles. Toute
				violation de données présentant un risque pour vos droits fera l'objet d'une notification
				conformément au RGPD.
			</p>
		</section>

		<section id="evolutions" aria-labelledby="heading-evolutions">
			<h2 id="heading-evolutions">11. Évolutions de la politique</h2>
			<p>
				La présente politique est susceptible d'évoluer pour refléter les pratiques de l'association
				ou les exigences réglementaires. Les modifications substantielles seront signalées sur cette
				page avec une nouvelle date de mise à jour. Nous vous invitons à la consulter régulièrement.
			</p>
		</section>
	</div>
</ArticleFrame>
