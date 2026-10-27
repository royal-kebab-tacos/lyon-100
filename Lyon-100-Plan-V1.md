> DOCUMENT HISTORIQUE : les règles de couverture binaire, exclusions de chemins et blocages de migration ci-dessous sont remplacées par AGENTS.md et ROADMAP.md (révision du 24 octobre 2026). Ne pas les réimplémenter.

# Lyon 100 — Spécification et plan de réalisation V1

Référence du 24 octobre 2026. Ce document traduit intégralement les instructions du projet en décisions de réalisation. Aucune application n’est codée à ce stade. Les seuils ci-dessous sont des décisions de V1, à vérifier sur des traces réelles avant livraison.

## 1. Produit et limites

Application personnelle pour visualiser les portions de rues de la commune de Lyon déjà courues ou marchées, à partir de fichiers GPX. Une PWA est un site installable comme une application. Le site sera hébergé en HTTPS, mais aucune base de données distante ni aucun serveur métier ne sera nécessaire.

Inclus : carte, réseau éligible, import GPX multiple, détection automatique, progression locale, statistiques, historique, suppression, réinitialisation, sauvegarde/restauration JSON, installation iPhone.

Exclus : compte, authentification, synchronisation entre appareils, Strava, enregistrement GPS, guidage, génération d’itinéraires, édition manuelle des segments, statistiques par rue nommée, carte de fond téléchargée pour usage hors ligne. Les noms des voies sont conservés dans les données, sans ajouter d’écran dédié.

Le pourcentage mesure le réseau OSM sélectionné et figé, pas une certification de toutes les voies réellement existantes. Les deux chaussées séparées d’un boulevard restent deux géométries OSM distinctes ; aucune fusion heuristique n’est ajoutée. Une trace proche peut valider les deux : cette limite sera évaluée sur les essais réels.

## 2. Parcours et écrans

| Écran | Comportement attendu |
|---|---|
| Carte | Carte centrée sur Lyon au premier lancement, déplacement et zoom, rues non validées grises, validées vertes, légende textuelle, résumé de progression, bouton « Importer une sortie GPX ». |
| Progression | Pourcentage, kilomètres uniques validés, kilomètres restants, total du réseau, nombre d’activités ; état vide à zéro. |
| Activités | Liste par date de sortie décroissante, puis date d’import ; nom du fichier, date si disponible, distance GPS, distance éligible validée par cette activité ; suppression avec confirmation. |
| Réglages | Export JSON, restauration JSON avec avertissement de remplacement, réinitialisation avec confirmation, version du réseau et de l’application, consignes d’installation et rappel de sauvegarde. |

Navigation fixe à quatre entrées, mobile-first, respect des marges de l’iPhone et des grandes tailles de texte. Les erreurs sont en français. Un import affiche lecture, calcul, enregistrement puis résultat ; le succès n’est annoncé qu’après écriture complète.

Un lot est traité fichier par fichier, dans l’ordre de sélection. Chaque résultat est explicite : importé, doublon ignoré, fichier refusé. Un échec ne supprime pas les fichiers déjà importés. Pendant une mutation, les autres boutons de mutation sont désactivés ; navigation et lecture restent possibles.

La distance d’une activité est celle de sa trace complète, éventuellement hors Lyon. La distance éligible d’une activité inclut ses chevauchements avec d’autres sorties : on ne doit jamais additionner ces valeurs pour calculer la progression globale.

## 3. Réseau OpenStreetMap préparé avant déploiement

### Périmètre et filtres

Utiliser la limite administrative communale de Lyon, code INSEE 69123, vérifiée dans les données, et non la Métropole ou une simple boîte rectangulaire. Découper les lignes à la frontière réelle : seule leur longueur dans la commune compte. Gérer les composantes multiples et les trous du polygone.

Liste blanche : residential, living_street, pedestrian, unclassified, tertiary, secondary, primary ; service seulement selon les règles ci-dessous. Trunk et tous les *_link sont exclus en V1, même lorsqu’une exception piétonne pourrait exister. Exclure motorway, footway, path, cycleway, track, steps, construction, proposed et les surfaces area=yes. Ne pas transformer les périmètres des places piétonnes en rues ; conserver leurs éventuelles lignes piétonnes distinctes.

Résoudre l’accès piéton en priorité avec foot, puis access. Exclure foot=no/private et les accès limités à customers, delivery, destination, agricultural ou forestry, sauf autorisation piétonne explicite yes/designated/permissive. Un access=private/no peut ainsi être dépassé par foot=yes : cela signifie que les piétons sont autorisés. Une restriction motor_vehicle seule ne suffit pas à exclure une voie. Les valeurs inconnues, restrictions conditionnelles piétonnes et cas ambigus vont dans un rapport de préparation et sont exclus jusqu’à vérification.

Pour service : exiger un accès public explicite résolu yes/designated/permissive ; exclure parking_aisle, driveway, drive-through et emergency_access. Les services sans information d’accès ne sont pas présumés publics. Les anomalies constatées sont traitées dans une petite liste d’exceptions versionnée avec motif ; aucune correction d’OSM à distance n’est effectuée automatiquement.

Vérifier avant gel les grands axes avec trottoirs séparés, tunnels, ponts, accès industriels et voies à restrictions : l’absence de tag n’est pas une preuve d’accessibilité. Sans calcul d’itinéraire, le réseau ne constitue pas une consigne de circulation.

### Segments et stabilité

1. Télécharger une fois les lignes et tags nécessaires ainsi que la frontière. Archiver la source et la requête ou l’origine de l’extrait, avec date et empreinte SHA-256.
2. Filtrer puis découper à la frontière ; conserver les références OSM et les coupures aux intersections topologiques.
3. Sur chaque morceau entre intersections, créer ceil(longueur/50 m) segments de longueur égale. Ainsi aucun segment ne dépasse 50 m et aucune chute artificielle minuscule n’est créée à chaque tranche. Des morceaux naturellement courts subsistent.
4. Supprimer uniquement les lignes de longueur nulle et les doublons géométriques exacts indépendants du sens, avec traçabilité. Ne pas fusionner des chaussées voisines.
5. Calculer les longueurs géodésiques en mètres et les boîtes englobantes. Produire le réseau statique, sa frontière, son total et un manifeste : networkVersion, règles, date, empreintes, nombre de segments.

Identifiant : version du réseau + identifiant OSM + index du morceau découpé + index du segment. Ordre et sens canoniques dans le générateur ; résultat reproductible pour une même source. Stabilité garantie sur ce réseau figé, pas entre deux téléchargements d’OSM. Aucune mise à jour automatique du réseau en V1 ; une nouvelle version demande une migration distincte. Le kilométrage total réel ne sera annoncé qu’après préparation et audit du réseau.

Attribution visible « © OpenStreetMap contributors » avec lien vers https://www.openstreetmap.org/copyright. Livrer aussi les mentions ODbL et la provenance avec le réseau redistribué.

## 4. GPX et reconnaissance géographique

### Lecture et doublons

GPX 1.0 et 1.1, espaces de noms inclus. Utiliser les trk/trkseg ; seulement en absence de piste, accepter rte/rtept. Ignorer les waypoints isolés. Plusieurs pistes dans un fichier constituent une activité. Conserver les séparations entre pistes et entre trkseg ; ne jamais créer de trait entre eux. Date : premier horodatage valide ; sinon afficher « Date inconnue » et conserver la date d’import séparément.

Refuser XML malformé, DTD/entités déclarées, absence de lignes exploitables et coordonnées non finies ou hors limites. Une coordonnée invalide interrompt la ligne ; ne pas relier ses voisins. Retirer les répétitions strictement consécutives de coordonnées. Au moins une ligne de deux points distincts est nécessaire. Ne pas déduire le sport à partir de la vitesse ; une trace erronée ou automobile peut être importée et doit pouvoir être supprimée.

Limites initiales centralisées : GPX 20 Mio et 100 000 points par fichier ; sauvegarde JSON 100 Mio et 1 million de points cumulés. Vérifier la taille avant lecture et les comptes après lecture. Un dépassement laisse la base intacte et donne une erreur explicite. Ces plafonds sont des garde-fous à confirmer par mesure, pas une promesse de capacité de l’iPhone.

Deux empreintes SHA-256 : fichier brut et représentation canonique des pistes (coordonnées arrondies à 7 décimales, séparations, horodatages normalisés ISO ou null). Ignorer nom de fichier et métadonnées descriptives dans la seconde empreinte. Une égalité de l’une des empreintes empêche un nouvel import via des index uniques. Même fichier renommé ou XML réexporté sans changement des points : doublon. Même parcours à une autre date : activité distincte. Si les points ou horodatages ont changé, un réexport peut échapper au contrôle ; l’union des segments empêche néanmoins de gonfler les kilomètres uniques.

Conserver la trace canonique complète, les empreintes et les résultats, mais pas le XML brut. Aucun envoi de GPX à un service externe.

### Algorithme décidé

Paramètres : tolérance 15 m ; pas d’échantillonnage maximal 5 m ; seuil 70 % ; longueur maximale de segment 50 m. Pas de réglages utilisateur supplémentaires.

Éviter les grands traits artificiels : casser une ligne entre deux points distants de plus de 200 m, ou séparés de plus de 120 s lorsque leurs heures existent et progressent. Ignorer les arêtes de longueur nulle. Les portions retirées sont signalées dans le résultat d’import. Une trace très peu échantillonnée peut alors perdre des portions : choix prudent contre les validations fictives.

Effectuer le calcul dans un Web Worker, c’est-à-dire un traitement séparé qui laisse l’interface répondre. Analyser le XML sur le fil principal avec DOMParser, après contrôle de taille ; transférer les coordonnées au Worker. Mesurer aussi le coût du parsing sur iPhone.

Construire une grille spatiale de cellules de 100 m sur un repère métrique local documenté, uniquement pour présélectionner les candidats. Indexer les arêtes GPS dans toutes les cellules touchées par leur boîte augmentée de 15 m ; interroger les cellules de chaque segment routier. Ce double filtrage évite segment routier × trace complète. Utiliser les distances géodésiques Turf pour le test final, en unités explicites ; aucune comparaison de degrés avec des mètres.

Pour un segment de longueur L : n=max(1,ceil(L/5 m)), échantillons aux milieux de ses n intervalles de même longueur. Chaque échantillon est positif si sa distance minimale à une arête GPS candidate est ≤15 m. Valider si positifs/n ≥0,70. Ce choix évite de surpondérer les extrémités.

Pour une activité, réunir les résultats de toutes ses lignes. Un segment est validé entièrement ou pas du tout. Des fractions insuffisantes de plusieurs activités ne s’additionnent pas : cela demanderait un modèle de couverture supplémentaire hors V1. Un croisement orthogonal isolé ne doit pas valider une rue de 50 m ; un segment naturellement très court reste plus exposé.

Limites assumées : deux rues parallèles proches peuvent être validées ensemble ; altitude, ponts et tunnels ne sont pas désambiguïsés ; une mauvaise trace ne peut pas être corrigée avec certitude. Ne pas annoncer un matching parfait. Si les essais lyonnais révèlent des erreurs systématiques, ajuster les paramètres globaux avant gel, puis recalculer les traces de test ; ne pas empiler des heuristiques silencieuses.

## 5. Progression, stockage et sauvegarde

Ensemble validé = union des identifiants validés de toutes les activités encore présentes. Distance validée = somme des longueurs des segments de cet ensemble. Restant = total − validé. Pourcentage = 100 × validé / total. Arrondir uniquement à l’affichage : 2 décimales pour les km, 1 pour le pourcentage. Si le réseau n’est pas chargé ou valide, montrer une erreur, jamais un faux zéro. Afficher 100 % uniquement si tous les segments sont validés, sinon plafonner l’arrondi à 99,9 %.

Dexie/IndexedDB : tables activities (id, empreintes uniques, nom, dates, trace, version réseau, version algorithme, paramètres, identifiants validés) et metadata (version schéma, réseau). Statistiques et union restent dérivées, non autoritaires. Réseau statique livré avec l’app ; pas de copie de toutes ses géométries dans chaque activité. UUID pour les activités.

Parsing, empreintes et matching précèdent la transaction d’écriture ; pas de calcul long dans une transaction. Import d’une activité, suppression, remplacement par sauvegarde et réinitialisation sont atomiques. Une interruption avant validation ne doit jamais laisser une demi-activité. Index uniques et transactions protègent aussi contre deux onglets concurrents ; les autres écrans se rafraîchissent après mutation.

Supprimer une activité puis reconstruire l’union depuis les activités restantes : un segment partagé est conservé. Réinitialiser efface activités et données personnelles, en conservant l’application et le réseau public.

JSON : format identifié lyon-100-backup, schemaVersion, networkVersion et empreinte réseau, matchingVersion, paramètres, exportedAt et toutes les activités avec traces et résultats. Ne pas sauvegarder uniquement un pourcentage ou une liste globale de segments : cela empêcherait la suppression correcte des sorties.

Restauration par remplacement uniquement, après confirmation indiquant le nombre d’activités entrantes et remplacées. Valider intégralement tailles, types, coordonnées, versions, paramètres, empreintes, unicité et références des segments avant mutation. Recalculer empreintes et matching depuis les traces, puis vérifier leur cohérence avec les résultats exportés. Refuser un fichier corrompu ou incompatible sans toucher aux données présentes. Pas de migration automatique de sauvegardes d’un autre réseau ou d’une autre version de calcul en V1.

IndexedDB persiste entre fermetures normales, mais peut être effacé par l’utilisateur ou le système. Demander navigator.storage.persist() si disponible, observer son résultat sans le présenter comme une garantie ; traiter quota et erreurs d’ouverture/écriture. Une écriture échouée n’affiche aucun succès. Le JSON stocké en dehors de l’application reste la sauvegarde récupérable.

## 6. Architecture retenue et PWA

React + TypeScript + Vite ; Leaflet/React Leaflet en rendu Canvas pour le réseau ; imports ciblés de Turf ; Dexie ; vite-plugin-pwa ; Vitest pour les tests métier. Pas de Redux, serveur, moteur de routage ou bibliothèque cartographique supplémentaire. La grille spatiale est un petit module testé, pas un nouveau framework.

Organisation prévue : components et pages pour l’interface ; domain pour modèles/paramètres ; services/gpx, matching, progress, storage, backup ; workers/matching ; scripts pour préparation OSM ; public/data pour réseau/manifeste ; tests/fixtures pour GPX synthétiques et traces de validation.

L’interface lit la base ; le Worker reçoit la trace et le réseau, retourne les segments ; le service de stockage écrit ; le service de progression calcule l’union. Le Worker conserve le réseau en mémoire entre imports. Ne pas reconstruire la carte entière à chaque progression ; changer les styles des couches concernées.

Service worker : précharger l’application, icônes, manifeste et réseau figé ; prévoir explicitement la limite de taille de précache du plugin et vérifier que le réseau n’est pas exclu silencieusement. N’annoncer « disponible hors ligne » qu’après réussite du cache complet. Pas de précache des tuiles OSM ni de téléchargement massif. Fond raster standard à https://tile.openstreetmap.org/{z}/{x}/{y}.png, cache HTTP normal, attribution et Referer autorisés ; URL configurée dans un seul module. En panne réseau ou mode avion, afficher rues, progression et un message « Fond de carte indisponible hors ligne ».

HTTPS sur une adresse stable : changer de domaine change l’espace de stockage. Localhost convient au Mac ; http://adresse-du-Mac sur l’iPhone ne constitue pas le test final d’une PWA. Le vrai test iPhone utilise l’hébergement HTTPS. Sans compte signifie sans compte dans Lyon 100 ; l’hébergement reste nécessaire.

Manifeste avec id stable, name, short_name, start_url, scope, display standalone, couleurs, icônes 192/512 et apple-touch-icon 180. Installer depuis Safari : ouvrir l’adresse, Partager, « Sur l’écran d’accueil », activer « Ouvrir comme app web » si proposé, puis Ajouter. Vérifier ensuite l’ouverture depuis l’icône.

Mac, Safari iPhone et application installée ne sont pas considérés comme une base synchronisée ; ne pas présumer leur partage de stockage. Utiliser la PWA installée comme environnement principal, transférer via JSON. Aucune autorisation de localisation n’est nécessaire.

Mises à jour avec proposition de rechargement, jamais au milieu d’un import. Une mise à jour du code ne change pas le réseau ni les règles de matching silencieusement. Schéma Dexie versionné ; migration non destructive testée avant diffusion. Aucune analytique ni script tiers chargé pour lire les traces ; seuls le site et le fournisseur de tuiles reçoivent les requêtes ordinaires, ce dernier voyant les zones cartographiques consultées.

## 7. Risques et conditions de maîtrise

| Risque | Mesure retenue | Vérification exigée |
|---|---|---|
| OSM incomplet ou accès erroné | Audit des tags et cas sensibles, rapport d’exclusions, réseau figé | Frontière, services, axes, ponts, tunnels contrôlés sur carte |
| Identifiants changeant avec OSM | Source archivée, génération déterministe, version du réseau | Deux générations identiques donnent mêmes IDs et total |
| Calcul trop lent | Worker et filtre spatial à deux niveaux | Benchmark sur réseau lyonnais complet et iPhone réel |
| GPS décalé ou rues voisines | Tolérance centralisée et tests négatifs | Évaluer les erreurs réelles, documenter les limites |
| IndexedDB effacé ou saturé | JSON complet et écritures atomiques | Restauration sur base vide ; échec simulé sans perte |
| iPhone suspend l’app | Aucun succès avant commit, reprise en état cohérent | Fermer pendant traitement puis rouvrir |
| Réseau absent ou tuiles bloquées | App et réseau précachés, fond indépendant | Mode avion après installation et préparation complète |
| Mise à jour casse cache/base | Rechargement différé et migration testée | Mise à jour avec activités existantes, sans perte |

## 8. Critères d’acceptation de livraison

Tous les points sont obligatoires. Les objectifs de performance sont des seuils de recette, pas des résultats déjà mesurés.

| ID | Critère observable |
|---|---|
| A01 | Le réseau complet livré ne contient que des segments autorisés dans Lyon ; total positif, IDs uniques et génération reproductible. |
| A02 | Carte manipulable, deux états lisibles, légende et attribution visibles sur Mac et iPhone, quatre écrans utilisables sans défilement horizontal. |
| A03 | GPX valide simple ou multiple importable ; dates absentes acceptées ; erreurs et limites expliquées sans modification partielle. |
| A04 | Même GPX renommé ou réencodé sans changement de trace ignoré ; deux vraies sorties sur le même trajet comptent comme deux activités et une seule couverture. |
| A05 | Cas synthétiques : ligne superposée validée, distance 15 m incluse, au-delà exclue, 70 % inclus, sous 70 % exclu ; croisement orthogonal d’un segment de 50 m non validé ; aucune liaison entre trkseg. |
| A06 | Sur un jeu annoté d’au moins 5 GPX lyonnais et 100 segments contrôlés incluant croisements/voies voisines, précision ≥95 % et rappel ≥90 %. Précision = part des validations correctes ; rappel = part des segments réellement couverts qui sont détectés. Un échec bloque la livraison et impose une revue des paramètres ou du périmètre. |
| A07 | Statistiques égales à l’union exacte ; ordre d’import sans effet ; distance restante non négative ; aucun arrondi cumulatif. |
| A08 | Supprimer une activité garde ses portions partagées avec une autre ; supprimer la dernière remet la progression à zéro. |
| A09 | Fermeture/réouverture, actualisation et mise à jour de l’app préservent les activités ; panne d’écriture simulée ne crée pas de faux succès. |
| A10 | Export puis restauration sur un autre stockage donnent mêmes activités, segments et statistiques ; sauvegarde invalide ou incompatible laisse la base intacte. |
| A11 | Réinitialisation confirmée vide les données personnelles ; annulation de toute action destructive ne change rien. |
| A12 | Installation iPhone, ouverture autonome et redémarrage hors ligne réussis ; import d’un GPX local hors ligne réussi ; absence du fond expliquée. |
| A13 | Sur iPhone réel, build de production et réseau complet : carte utilisable ≤5 s au démarrage à cache chaud ; import de 10 000 points ≤15 s ; lot de 5 fichiers traité sans crash, avec interface réactive et statut au moins chaque seconde pendant matching. |
| A14 | GPX de 100 000 points traité ≤60 s sans crash, ou limites revues explicitement dans cette spécification avant livraison ; refus des dépassements testé. Mesurer séparément parsing, matching et écriture. |
| A15 | Tests métier, vérification TypeScript et build de production passent ; aucune requête réseau ne contient des points GPS ou sauvegardes. |

Conserver dans le procès-verbal le modèle d’iPhone, version iOS, navigateurs Mac, taille du réseau, jeux de test et durées. L’iPhone personnel est l’appareil de référence ; sa version iOS est relevée au début de la recette, sans supposer de compatibilité universelle.

## 9. Roadmap ordonnée par dépendances

1. **Figer les contrats de données et fixtures** : versions, filtres OSM, paramètres, format activité/JSON et cas GPX positifs/négatifs. Livrable : contrats et tests attendus, sans interface complexe.
2. **Préparer le réseau réel** : téléchargement ponctuel, frontière, audit, découpage, IDs, manifeste et contrôles de reproductibilité. Bloquant pour mesurer fiabilité et performance.
3. **Vérifier tôt sur iPhone** : squelette Vite/PWA minimal, HTTPS de test, installation, affichage Canvas du réseau complet, écriture IndexedDB, aller-retour d’un petit fichier JSON. Valider ces mécanismes avant le développement métier complet.
4. **Construire le moteur indépendant** : parsing, ruptures, empreintes, distances, grille, matching et Worker. Passer les tests synthétiques puis benchmark réel et jeu annoté ; ajuster et figer les paramètres.
5. **Construire la persistance et les invariants** : transactions, doublons concurrents, union, suppression, réinitialisation, erreurs de quota ; tests correspondants.
6. **Construire sauvegarde/restauration** : validation complète, recalcul, remplacement atomique et tests d’intégrité. Ne pas accumuler de vraies sorties avant cette étape.
7. **Assembler les quatre écrans** : import en lot, résultats, statistiques, activités, réglages, erreurs et carte actualisée.
8. **Finaliser le comportement PWA** : précache complet, hors ligne, icônes, mise à jour différée et migration ; conserver le réseau figé.
9. **Recette finale Mac puis iPhone** : checklist ci-dessous, corrections, reprise ciblée des tests et procès-verbal des critères A01–A15. La V1 est terminée uniquement après cette recette.

À chaque étape : état des lieux, changement annoncé, réalisation, tests/build, corrections, bilan et étape suivante. Aucun travail Strava ou routage tant que la V1 n’est pas validée.

## 10. Checklist manuelle sur Mac

Codex prépare les fichiers et lance les commandes. L’utilisateur teste l’interface avec le navigateur indiqué ; le test final porte sur le build de production, pas seulement le serveur de développement.

- [ ] Ouvrir l’adresse de test dans Safari puis Firefox ; voir Lyon, réseau gris, zéro activité et statistiques à zéro.
- [ ] Zoomer/déplacer la carte, changer d’écran, réduire la fenêtre à une largeur mobile ; contrôles et attribution restent accessibles.
- [ ] Cliquer « Importer une sortie GPX », choisir le GPX A fourni ; voir un résultat réussi, segments verts, activité et statistiques cohérentes.
- [ ] Réimporter A puis sa copie renommée et sa copie réencodée ; voir « doublon ignoré », aucun changement de statistiques ni du nombre d’activités.
- [ ] Importer B, partiellement commun avec A ; le nombre passe à deux, les portions partagées comptent une seule fois.
- [ ] Importer un lot contenant fichier valide, doublon et GPX cassé ; obtenir un résultat par fichier sans perdre le valide.
- [ ] Tester GPX sans date, hors Lyon, plusieurs trkseg et fichier trop gros ; date inconnue, zéro couverture hors Lyon, absence de liaison artificielle et refus clair du dépassement.
- [ ] Actualiser puis fermer/rouvrir le navigateur ; données identiques.
- [ ] Annuler la suppression de A, puis la confirmer ; annulation sans effet, portions communes à B conservées après confirmation.
- [ ] Réimporter A, exporter dans Téléchargements, noter nombre d’activités et statistiques ; ouvrir le fichier avec un éditeur de texte pour vérifier qu’il existe et contient les activités.
- [ ] Dans Réglages, annuler puis confirmer la réinitialisation ; zéro donnée personnelle après confirmation.
- [ ] Restaurer la sauvegarde ; retrouver activités, carte et statistiques précédentes. Tester JSON cassé et version réseau incompatible : refus sans perte.
- [ ] Activer le mode hors ligne du navigateur après préparation du cache puis recharger ; carte des rues et données disponibles, fond éventuellement absent avec message clair.
- [ ] Avec Codex : simuler échec d’écriture et deux imports concurrents ; pas de données partielles ni doublon. Tester une mise à jour avec la base remplie.

## 11. Checklist manuelle sur iPhone

Préparation : placer les GPX A/B et le JSON dans l’application Fichiers. Codex fournit l’URL HTTPS. Relever modèle, version iOS et espace disponible.

- [ ] Ouvrir l’URL dans Safari ; attendre l’état prêt hors ligne ; carte et navigation utilisables.
- [ ] Toucher Partager → Sur l’écran d’accueil → Ouvrir comme app web si proposé → Ajouter. Revenir à l’accueil et ouvrir Lyon 100 depuis son icône : affichage autonome attendu.
- [ ] Importer A depuis la PWA : « Importer une sortie GPX » → Parcourir → choisir A dans Fichiers. Vérifier le résultat, la carte verte, l’activité et le compteur.
- [ ] Importer B puis A à nouveau ; même comportement de chevauchement et de doublon que sur Mac. Tester la sélection multiple proposée par Fichiers.
- [ ] Zoomer à deux doigts, déplacer, passer du portrait au paysage ; boutons, texte, attribution et navigation restent accessibles hors des zones système.
- [ ] Fermer la PWA via le sélecteur d’applications, la rouvrir puis redémarrer l’iPhone ; progression conservée.
- [ ] Activer le mode avion après cache complet, relancer la PWA, consulter les quatre écrans et importer un GPX déjà téléchargé dans Fichiers ; fonctionner sans fond distant. Réactiver le réseau.
- [ ] Exporter JSON → Enregistrer dans Fichiers → choisir un dossier ; vérifier le fichier présent. Réinitialiser puis restaurer ce fichier depuis la PWA ; mêmes résultats. iCloud Drive constitue un emplacement choisi par l’utilisateur, pas une synchronisation de Lyon 100.
- [ ] Supprimer une activité commune et vérifier les segments conservés ; annuler les confirmations et vérifier leur absence d’effet.
- [ ] Tester JSON invalide et GPX trop volumineux ; message lisible, données antérieures inchangées.
- [ ] Lancer le GPX de performance puis mettre l’app en arrière-plan/verrouiller l’écran ; au retour, résultat entièrement enregistré ou import absent à relancer, jamais partiel. Ne pas promettre de calcul continu écran éteint.
- [ ] Mesurer démarrage et import avec les fixtures de 10 000 et 100 000 points, puis lot de cinq fichiers ; inscrire les résultats face à A13/A14.
- [ ] Avec une version de test mise à jour par Codex : accepter le rechargement hors import ; progression intacte après mise à jour, puis disponibilité hors ligne vérifiée à nouveau.
- [ ] Restaurer le même JSON sur Mac si souhaité ; constater qu’un nouvel import iPhone ne se synchronise pas automatiquement vers le Mac.

## 12. Sources techniques vérifiées

Les choix produit et seuils numériques sont ceux de cette spécification. Les références ci-dessous étayent les contraintes des plateformes, sans garantir leur comportement sur tout appareil.

- WebKit, stockage et éviction : https://webkit.org/blog/14403/updates-to-storage-policy/
- Apple, installation d’un site comme application iPhone : https://support.apple.com/en-in/guide/iphone/iphea86e5236/ios
- OSM Foundation, politique des tuiles (attribution, cache et interdiction du téléchargement massif) : https://operations.osmfoundation.org/policies/tiles/
- OSM, hiérarchie des permissions d’accès : https://wiki.openstreetmap.org/wiki/Key:access
- OSM, licence : https://www.openstreetmap.org/copyright
- Dexie, transactions atomiques : https://dexie.org/docs/Dexie/Dexie.transaction()
- Vite PWA, mise à jour proposée à l’utilisateur : https://vite-pwa-org.netlify.app/guide/prompt-for-update
