# Lyon 100 — référence produit durable

Révision du 28 octobre 2026, fondée sur la demande complète A–Z d’Arthur. Cette référence remplace les choix incompatibles du plan initial `Lyon-100-Plan-V1.md`. `ROADMAP.md` décrit les versions et le travail restant ; ne pas implémenter les versions futures spontanément.

## Finalité et limites
Application strictement personnelle pour explorer à pied/course les voies raisonnablement accessibles de la commune de Lyon (INSEE 69123), par import d’activités. Arthur n’est pas développeur : effectuer les opérations autorisées, prendre les décisions mineures, expliquer simplement, fournir une mise à jour utilisable et un README accessible. Conserver l’existant, ne pas repartir de zéro.

React + TypeScript + Vite, Leaflet Canvas, Turf ciblé, Dexie/IndexedDB, Worker local, vite-plugin-pwa. Mobile-first iPhone, hébergement statique HTTPS, sans compte ni backend métier. Pas de GPS direct ni application native dans cette V1.

## Invariant principal : le vert est une portion réellement parcourue
- Le vert est projeté sur le réseau OSM, jamais un GPX brut recolorié.
- Couverture progressive en unités stables de **10 m maximum** ; conserver les fractions à l’intérieur d’une unité. Une rue de 100 m suivie sur 60 m affiche environ 60 m verts, pas zéro ou 100 m.
- Stocker par activité des intervalles normalisés [0,1] par unité, fusionner leurs unions sans double comptage. Les deux extrémités partielles de plusieurs sorties se combinent.
- Calcul de distance avec les longueurs géodésiques, arrondi uniquement à l’affichage.
- Distance, orientation, succession temporelle et connectivité participent au matching. Tolérance GPS habituelle **15 m**, extension conditionnelle 1.6.0 décrite ci-dessous, observations espacées de **8 m**, plusieurs candidats conservés puis choix d’une chaîne cohérente. Routes intermédiaires bornées et proches de la trace ; aucune jonction entre pistes ou grands sauts GPS.
- Ne jamais résoudre les trous par une énorme tolérance, une validation arbitraire de toute la rue ou un trait droit inventé entre rues non connectées.
- Rue terminée à **STREET_COMPLETION_THRESHOLD = 0.95**. Statuts : non commencée, partiellement parcourue, terminée. Une couverture de 96 % reste 96 % et compte 960 m sur 1 000, même si la rue est terminée. Les mètres restants restent gris.
- La trace GPS orange est masquée par défaut, visible seulement sur demande pour comparer une activité, puis masquable. Ne jamais afficher toutes les traces simultanément. Garder leurs données pour recalcul.

## Réseau éligible
Lyon entier et ses neuf arrondissements OSM, pas la Métropole ni des quartiers. Une unité appartient à une seule zone ; les kilomètres des neuf zones doivent égaler Lyon. Attribution par milieu géométrique des unités ≤10 m, frontière commune réelle et arrondissements réels. Les rues traversant plusieurs zones peuvent figurer dans plusieurs listes locales, sans doubler leurs mètres dans Lyon.

Inclure les rues, boulevards, avenues, impasses, quais, passages publics, rues piétonnes/résidentielles/partagées, services publics pertinents, chemins urbains et allées de parcs. Liste concrète : residential, living_street, pedestrian, unclassified, tertiary, secondary, primary, footway, path, steps ; cycleway si piétons explicitement admis ; track aménagé grade1/grade2. Service avec accès public explicite, hors parking/entrée privée.

Résoudre les permissions spécifiques `foot` avant `access` : une autorisation piétonne explicite yes/designated/permissive prime sur la restriction générale. Exclure access=no/private en l’absence de cette autorisation, interdictions piétonnes, autoroutes, voies rapides/bretelles, construction/proposed, surfaces area=yes, chemins informal=yes, accès conditionnels non résolus, voies explicitement inaccessibles. Ne pas collectionner des objets techniques : traversées, îlots et liaisons purement techniques balisés footway=crossing/traffic_island/access_aisle/link/tram_crossing exclus du dénominateur. Ne pas exclure globalement les trottoirs : retirer seulement une unité sidewalk si ses trois points de contrôle sont représentés par un axe parallèle autorisé à moins de 12 m, au même niveau et avec le même état bridge. Conserver les autres trottoirs. Les rues foot=use_sidepath restent des axes représentatifs de la rue marchable via son trottoir, jamais une consigne de courir sur la chaussée. Les cheminements indépendants de quais/parcs restent inclus. Ce compromis évite de compter rue + deux trottoirs ; OSM ne garantit pas l’accessibilité réelle de toute voie non renseignée.

Préparation séparée `npm run prepare`, retries bornés, source archivée et provenance, génération reproductible, déduplication exacte y compris sens inverse. Aucun appel Overpass quotidien. © OpenStreetMap contributors / ODbL. Aucun téléchargement massif de tuiles.

## Progression et exploration
- Lyon et chacun des neuf arrondissements : total éligible, mètres uniques, restants, pourcentage, rues terminées/total. Sélection de zone : statistiques locales, zoom et mise en évidence.
- Carte : toutes les portions / restantes / parcourues. Le statut d’une rue ne remplace jamais la couverture métrique. Consultation locale en déplaçant la carte avec filtre Restantes.
- Liste des rues, recherche, filtres terminées/en cours/non commencées, retrouver sur carte. Fiche : nom, total, parcouru, restant, pourcentage, statut.
- Voies sans nom incluses dans les kilomètres, hors nombre de rues nommées. Regroupement exact du nom NFC ; pas de fusion géographique automatique d’homonymes.

## Activités et données
Tous les formats produisent `NormalizedActivity` : coordonnées, pistes séparées, timestamps, nom/date, distance. Import multiple, erreurs compréhensibles, progression pendant calcul, doublons SHA-256 du contenu canonique et du fichier. GPX obligatoire ; TCX et gzip si simples ; FIT et archive Strava selon roadmap.

Activités : date, nom, distance, nouvelles voies/portions, progression apportée, comparaison GPS à la demande, suppression avec union des sorties restantes. Pas de notes ni classement. Dates d’activité et d’import distinctes, traces conservées. Historique automatique reconstruit par date de sortie (date d’import explicitement signalée en repli). Semaines du lundi au dimanche et mois en Europe/Paris ; union incrémentale par portion dans un Worker indépendant, sans nouveau matching. Afficher évolution globale/par arrondissement, gains hebdomadaires/mensuels, périodes sans gain, synthèse semaine/mois courants. Les exclusions actuelles définissent le réseau éligible fixe sur tout l’historique ; les corrections include/remove ne sont pas antidatées faute de journal. Expliquer l’écart possible avec le total corrigé actuel. Supprimer/restaurer une activité recalcule l’historique. Un résultat de calcul ancien ne doit pas être montré après mutation. Aucun historique dérivé supplémentaire à persister ni changement de format de sauvegarde.

Corrections manuelles essentielles par unité : parcourue, non parcourue, exclue de l’objectif, retour automatique. Persistantes, table séparée, prioritaires sur les résultats automatiques. Exclure retire aussi la longueur du dénominateur. Confirmation et retour possible. Les corrections sont incluses dans les sauvegardes.

IndexedDB versionnée ; calcul avant transaction, remplacement atomique ; migration par recalcul automatique des traces existantes, sans demander un réimport si les données sont présentes. Copie de récupération avant migration. Refuser sans perte un changement de réseau qui ne permettrait pas de préserver des corrections. Protéger les mutations contre les versions concurrentes et les changements dans un autre onglet pendant recalcul.

Export/import JSON manuel complet, validation avant confirmation puis remplacement atomique. Anciennes sauvegardes V1 prises en charge par recalcul. Réinitialisation avec confirmation. Pas de synchronisation implicite entre appareils/origines. Stockage local non garanti à vie : expliquer les sauvegardes simplement.

## Hors ligne et évolution
Après premier chargement : shell, réseau, activités, progression et statistiques consultables hors connexion. Fond de carte éventuellement indisponible, ce qui est acceptable en V1. Respecter le fournisseur de tuiles. Mise à jour PWA proposée hors import, jamais forcée pendant une mutation.

Le tableau de bord reste dans Progression, sans navigation supplémentaire : Lyon, neuf zones, kilomètres uniques/restants, rues terminées/total. Les jalons 25/50/75/100 % suivent les mètres effectifs ; 95 % termine le statut d’une rue, jamais le jalon 100 %. L’arrondissement le plus avancé maximise le pourcentage ; le plus proche des 100 % minimise les kilomètres restants parmi les zones encore incomplètes. En cas d’égalité, ordre numérique stable. Une zone sans voie éligible n’atteint aucun jalon.

Thème clair/sombre/système, Système par défaut, changement système suivi en direct. Préférence locale dans settings, sans migration des activités ; elle reste propre à l’appareil et n’est pas exportée dans la sauvegarde des sorties. Les tuiles gardent leur style d’origine et peuvent être masquées avec le contrôle existant.

La vision future inclut Strava automatique, génération de boucles 5/8/10/15 km avec départ et arrondissement cible puis export GPX. Aucun classement de sorties, notes, quartiers, carte de chaleur, double score OSM/accessibilité, mode course tranquille, points, badges, niveaux, streaks ou notifications de fin de course. Détails et priorités dans ROADMAP ; aucune architecture SaaS préventive.

## Validation obligatoire
Tests : 60/100 m partiels ; 96/100 m terminés sans gonflement ; enchaînement connecté ; croisement ; rues parallèles ; GPS légèrement décalé ; revisite unique ; union 50+48=98 % ; suppression partagée. Ajouter migration/échec/rollback, corrections prioritaires, arrondissements sans double compte, sauvegarde et parsing.

Exécuter tests, lint, TypeScript, build ; vérifier l’interface et les performances réseau complet. Comparer une vraie activité (notamment Guillotière) à son GPS : ne pas présenter un test synthétique comme une vraie course et ne pas annoncer cette recette réussie sans les données. L’accès au navigateur d’Arthur n’est pas implicite. Recette iPhone réelle toujours nécessaire.

## Régression réelle du 26 octobre 2026
La sauvegarde réelle de 81 activités prouve que V1.1 était installée et recalculée. Les exclusions combinées de use_sidepath et sidewalk, et la mauvaise priorité access/foot, étaient la cause principale des grands trous. Les règles corrigées donnent 9,21 km uniques sur la sortie Guillotière contre 3,66 auparavant, sans modification GPS ni hausse de tolérance. Ne pas réintroduire ces exclusions. Les données personnelles restent hors dépôt, fixtures et archive applicative. Une comparaison cartographique locale a été inspectée ; elle ne remplace pas une recette du navigateur et de l’iPhone.

## Vérification GPS facultative (1.4.0)

Depuis Activités, analyser une seule sortie à la demande, y compris une ancienne sortie, dans un Worker séparé. Ce diagnostic est indépendant du matching et ne modifie jamais automatiquement la couverture. Première version : voies parallèles (directions proches, séparation latérale réelle, distances concurrentes) ou trace longeant une portion entre 15 et 22 m sans axe admissible plus proche. Demander une avancée longitudinale répétée, ignorer croisements perpendiculaires, grands sauts, coupures temporelles et points isolés. Les 22 m ne sont qu’un rayon de diagnostic ; la règle habituelle reste à 15 m, complétée depuis 1.6.0 par la règle conditionnelle ci-dessous. Les suggestions ne sont ni exhaustives ni des probabilités de certitude.

Comparaison carte : portion bleue, trace orange, zoom local, filtre Toutes. Valider/refuser exige confirmation et utilise les corrections globales existantes sur l’unité entière ; préciser que toutes les sorties sont concernées. Les portions déjà corrigées ne sont plus proposées. Ignorer ne change aucun kilomètre et concerne seulement la sortie/portion/version du diagnostic ; possibilité de réafficher. Choix stockés dans settings.reviewIgnored (table existante), exportés via un champ optionnel strictement validé du JSON v2. Les sauvegardes sans ce champ restent compatibles. Nettoyer les choix à la suppression de l’activité et à la réinitialisation, avec transactions atomiques. Pas de résultats dérivés à persister ni de migration de base inutile. Limiter le diagnostic à 500 suggestions par sortie et l’affichage à 20 à la fois, en annonçant la limite.

## Priorité demandée : fluidité, vérification puis parcours (1.5.0)

La vérification GPS est désormais un onglet « À vérifier » avec choix d'une sortie ; le raccourci dans Activités reste disponible. Garder le diagnostic facultatif et les confirmations existantes.

La carte indexe spatialement le réseau et ne dessine que les unités intersectant la vue élargie. Mettre en cache les fractions exactes et réunir seulement les extrémités strictement identiques d'un même style, sans combler les trous. La sélection possède sa couche indépendante. Ne jamais alléger les données de couverture pour accélérer le dessin. Mesurer sur iPhone réel avant de promettre une fluidité acquise.

Arthur demande maintenant les parcours près de chez lui avant Strava automatique. Ordre : stabiliser la carte et la vérification, exploration autour d'un point choisi manuellement, préparer un graphe piéton routable distinct du réseau de score, proposer des boucles puis exporter un GPX. Aucun abonnement Strava ni OAuth ne doit être une dépendance de la génération. Une route proposée ne crédite aucun mètre parcouru. Les autres demandes restent dans ROADMAP.md.

## Tolérance au trottoir opposé — 1.6.0

Demande explicite : limiter les vérifications de portions de 9–10 m pour une même rue parcourue depuis un autre trottoir, sans créditer les rues voisines. Matcher 2.1.0 : garder les chaînes normales ≤15 m indépendantes ; en l'absence de candidat normal, chercher un axe de rue jusqu'à 25 m, direction à 20° maximum, suivi continu d'au moins 32 m uniques. Highway residential/living_street/pedestrian/unclassified/tertiary/secondary/primary seulement. Aucun élargissement automatique des parcs, pistes et chemins indépendants.

Refuser l'extension si un autre corridor admissible est à une distance ≤ distance du candidat +5 m (recherche jusqu'à 30 m). Même nom ne suffit pas : alignement géométrique, écart latéral ≤3 m et même layer/bridge pour appartenir au même corridor. Ne pas fusionner deux chaussées parallèles, deux niveaux, ni deux noms distincts. Les chemins intermédiaires gardent les bornes de distance et la connectivité existantes. Pistes séparées et passages courts ne se cumulent pas pour atteindre 32 m ; des allers-retours sur 20 m ne suffisent pas. Conserver les fractions longitudinales observées.

Recalcul automatique des traces via la migration existante ; corrections prioritaires, copie locale de récupération, transaction atomique. Accepter les sauvegardes matching 2.0.0 du réseau courant par recalcul et conserver leurs corrections/choix ignorés. Les versions futures inconnues restent refusées. Masquer seulement les suggestions de décalage entièrement couvertes par cette activité ; les ambiguïtés parallèles restent visibles même si l'une des voies est verte.

Limite : cette règle corrige des décalages simples ; elle ne résout pas encore la représentation d'une avenue par deux axes OSM ou tous les trottoirs indépendants. Toute évolution de regroupement de chaussées doit définir le dénominateur, préserver les corrections et exclure les chemins réellement distincts avant livraison. Ne pas promettre que les captures d'Arthur sont corrigées sans comparer leurs traces correspondantes.

## Petits trous de continuité — 1.7.0

Demande : ne pas obliger à corriger un petit morceau entre deux passages reconnus sur la même rue ou le même chemin. Le matcher 2.2.0 conserve les résultats précédents, puis examine les ruptures entre ancrages réellement retenus dans une même piste GPS, avec une approche et une sortie reconnues. Recherche bornée à 200 états, raccordement réel de 40 m maximum, trace intermédiaire ≤60 m, écart route/GPS ≤25 m dans les deux sens, progression longitudinale cohérente ; trajet réseau borné aussi par la distance GPS. Les fractions des unités sont conservées.

Le raccordement doit être unique parmi les chemins admissibles du graphe (même une alternative avec un autre nom bloque). Hors passages piétons explicites, toutes ses portions ont le même nom NFC ou sont toutes sans nom ; même layer. Aucun collage d'extrémités proches, aucune ligne droite inventée, aucune fusion de deux rues sous le seul prétexte du nom. Le libellé « Voie sans nom » est une absence d'information, pas un identifiant de rue. Une liaison réelle entre chemins sans nom peut être acceptée.

Ne jamais combler entre activités ou pistes distinctes, à travers un saut >200 m ou une coupure temporelle >120 s / temps décroissant. Conserver les règles de recalcul, sauvegarde, corrections et récupération. Restaurer les sauvegardes matching 2.0.0 et 2.1.0 par recalcul ; ne pas accepter les versions futures inconnues. Réseau et dénominateur inchangés. Les connexions retirées du réseau éligible ou les changements de niveau/nom restent une limite : ne pas prétendre qu'un trou de capture est corrigé sans reproduction avec sa trace.

Les traversées piétonnes publiques OSM crossing/traffic_island/tram_crossing sont maintenant préparées séparément dans `network.connectors` (hors `network.segments` et hors dénominateur). Les IDs sont préfixés connector:, les longueurs géométriques réelles conservées. Utiliser les connexions exactes OSM, sans accrochage par proximité. Une traversée explicite peut joindre deux noms ou l'extrémité d'un pont via les nœuds réellement partagés ; cela ne fusionne pas ces rues. Les liaisons participent uniquement au raccordement entre ancrages, pas à la compétition des candidats normaux, pour préserver le matching existant. Elles sont dessinées seulement là où une activité les a reconnues ; pas d'objectif gris supplémentaire, pas de correction manuelle sur ces IDs. Sauvegardes : autoriser leurs couvertures, mais pas leurs IDs dans les corrections.

Préparation reproductible depuis la source OSM déjà archivée : scripts/prepare-connectors.ts, appelée après restauration des données et avant développement/tests/build, ainsi qu'après prepare. Vérifier sourceHash/version. Fichier public généré et pré-caché pour usage hors ligne, aucun appel Overpass quotidien. Le passage OSM 1304453497 d'environ 7,53 m à l'entrée du pont Gallieni était retiré du réseau de score ; il est maintenant représenté comme liaison sans modifier ce score.


## Exploration autour d’un point — 1.8.0

À la demande d’Arthur, reprendre les évolutions fonctionnelles et différer les corrections trottoirs/Gallieni restantes sans les déclarer résolues. Carte → Autour d’un point : choix explicite au toucher, annulation, rayon 250/500/1000/2000 m, cercle et point, effacement. Le point reste en mémoire de l’écran uniquement (pas une adresse enregistrée). Pendant le choix, ne pas ouvrir la fiche de correction.

Recherche spatiale locale puis découpe des polylignes au cercle ; soustraire les intervalles déjà couverts dans la seule intersection, utiliser les longueurs géodésiques stockées pour les mètres. Respecter corrections et arrondissement ; exclure connecteurs et exclusions. Compter les noms NFC distincts, voies sans nom dans les mètres séparément. Inclure les fractions restantes même sur une rue au statut terminé (95 %). Liste de dix noms les plus proches des portions restantes ; Voir cible une unité locale, jamais toutes les rues homonymes de Lyon. Distance explicitement à vol d’oiseau. Aucune géolocalisation, requête d’adresse, modification de couverture ou migration.

Les propositions de départs praticables et les boucles attendent le graphe routable et son prototype borné. Ne pas assimiler proximité géométrique et accessibilité à pied.
