# Lyon 100 — roadmap produit

Révision : 28 octobre 2026. Les invariants durables sont dans AGENTS.md. `[x]` signifie implémenté et vérifié automatiquement ou dans la recette documentée ; cela ne remplace pas les validations réelles encore ouvertes. Le plan initial est historique.

## V1 stabilisée — ordre des dépendances

1. **Réseau et unités**
   - [x] Réseau OSM communal statique, voies piétonnes/quais/parcs pertinents, exclusions techniques, provenance, unités ≤10 m, identifiants géométriques stables pour une géométrie identique.
   - [x] Neuf frontières d’arrondissement et affectation unique des unités.
   - [ ] Audit de terrain des quais, voies publiques incertaines et cas OSM manquants ; compléter les règles seulement avec des cas concrets.
2. **Moteur et couverture**
   - [x] Fractions réelles dans chaque unité ; continuité séquentielle par réseau connecté ; distance/orientation ; prévention des validations parallèles multiples.
   - [x] Union métrique, statut rue à 95 % sans gonfler les mètres, suppression correcte.
   - [x] Recalcul de la sauvegarde réelle et comparaison cartographique de Guillotière (26 octobre) ; correction des règles OSM fautives.
   - [ ] Compléter la recette sur d’autres cas difficiles : pont/tunnel, rue parallèle, quai, parc, et dans le navigateur/iPhone. L’algorithme ne promet pas de résoudre une ambiguïté GPS indécidable.
3. **Persistance et reprise**
   - [x] IndexedDB v2, recalcul automatique des anciennes traces, récupération avant migration, interruption sans écriture partielle.
   - [x] Corrections manuelles séparées prioritaires, exclusion du dénominateur, confirmations et retour au calcul automatique.
   - [x] Sauvegarde/restauration JSON, anciennes sauvegardes V1 recalculées.
4. **Usage quotidien**
   - [x] GPX multiple, TCX, GPX.gz/TCX.gz, représentation interne commune, détection des doublons.
   - [ ] FIT : choisir et tester un lecteur maintenu sur un vrai export FIT avant intégration ; aucun lecteur binaire improvisé dans le correctif de couverture.
   - [x] Carte verte fidèle aux fractions, orange uniquement à la demande et masquable ; sélection d’une seule activité à la fois.
   - [x] Lyon/arrondissements avec statistiques et zoom ; filtres toutes/restantes/parcourues ; liste/recherche/statut/fiche de rue et localisation.
   - [x] Activités avec date, nom, distance, nouvelles portions/km, progression apportée, comparaison GPS et suppression.
   - [x] Exploration locale : déplacer/zoomer la carte et filtrer Restantes.
5. **Livraison**
   - [x] Tests métier, lint, TypeScript et build de production.
   - [ ] Recette vraie activité et Mac Safari, responsive puis iPhone réel, installation HTTPS, démarrage hors ligne, restauration et performances. Voir VALIDATION.md. Ne pas appeler cette étape entièrement terminée tant que ces vérifications manquent.

## V1.5 — après validation de la couverture centrale

- [x] Historique temporel (1.3.0) : courbe et tableau global/par arrondissement, nouveaux kilomètres par semaine/mois, périodes inactives et consultation des périodes anciennes. Reconstitution automatique depuis les dates/couvertures existantes, calcul incrémental dans un Worker ; exclusions actuelles appliquées partout, corrections include/remove hors historique. Suppression/restauration entraînent un nouveau calcul.
- [x] Premier lot 1.2.0 : synthèse Lyon/neuf zones dans Progression, kilomètres uniques/restants, rues terminées/total, arrondissement le plus avancé et plus proche des 100 % (kilomètres restants). Couverture fusionnée une fois pour le tableau.
- [x] Évolution récente (1.3.0) : gains de nouvelles voies cette semaine et ce mois, pour la zone sélectionnée.
- [x] Jalons 25/50/75/100 % pour Lyon et chaque arrondissement, sans points ni badges. Un jalon reflète les mètres effectifs, pas les statuts de rues.
- [x] À vérifier (1.4.0) : analyse facultative par sortie, voies parallèles et décalage soutenu de 15–22 m ; comparaison carte, corrections avec confirmation, ignorer/réafficher et sauvegarde des décisions. Matching inchangé.
- [ ] Étendre les diagnostics aux petits trous résiduels et ruptures de connectivité uniquement après examen de cas réels ; les suggestions actuelles ne couvrent pas tous les cas GPS.
- Filtres avancés et sélection locale de zone ; améliorer la consultation hors ligne en respectant les conditions des fonds de carte.
- [x] Thème clair/sombre/système (1.2.0), préférence IndexedDB sur cet appareil ; fond de carte inchangé.
- [ ] Recette visuelle Safari/iPhone du mode sombre et du changement de thème système.
- Import direct d’une archive ZIP Strava, traitement local borné, réutilisation des parseurs normalisés et de l’antidoublon. Dépend du support FIT si l’archive en contient.

## Chantier ultérieur — Strava automatique

Connexion au compte personnel : course sur Strava → réception automatique → normalisation → matching → progression. OAuth, secrets et récupération automatique exigent une conception backend dédiée, seulement à cette étape. Réutiliser `NormalizedActivity`, ne pas ajouter maintenant comptes internes, profils ou architecture multi-utilisateur.

## Prochaine priorité fonctionnelle — générateur de parcours

Boucles humaines et agréables de 5/8/10/15 km, point de départ et arrondissement cible, maximisant les nouvelles voies sans détours absurdes pour quelques mètres. Export GPX. Dépend d’une couverture fiable et d’un graphe de cheminements réellement routable, avec sens/accès/barrières et préférences de confort ; le graphe simplifié du matching ne suffit pas à promettre un itinéraire praticable.

## Plus tard uniquement

- Nombre de rues restantes dans une zone visible/sélectionnée (« 4 rues restantes ici »).
- Sauvegarde automatique iCloud / Google Drive ; export/import JSON manuel reste disponible.
- Si un enregistrement direct de course est ajouté un jour : envoi vers Strava.
- Export d’une jolie image de progression.

## Fonctionnalités explicitement refusées

Progression par quartier, carte de chaleur, classement des sorties, notes personnelles, scores séparés OSM brut/accessibilité, mode « courir tranquille », points, badges, achievements, niveaux, streaks, gamification complexe, notifications de fin de course, multi-utilisateur, comptes/profils/permissions et architecture SaaS. Pas de backend, OAuth Strava, routage ou application iOS native dans le présent chantier.

## Audit du prompt produit et ordre des prochains lots (28 octobre 2026)

Les sections 1 à 7 du prompt sont déjà couvertes par la V1 : géographie, trois états, seuil 95 %, éligibilité, fiche/liste des rues, import/historique des sorties, corrections séparées. La section 9 est couverte par déplacement/zoom et filtre Restantes. Le hors-ligne de la section 15 précharge shell et données, avec limite du fond cartographique documentée. Aucune modification du matching ni du réseau dans le lot 1.2.0.

1. **Livré dans ce lot : apparence, synthèse et jalons** (sections 12, 13 partiellement, 14). Aucun changement de schéma IndexedDB, de couverture ou de sauvegarde. Les corrections actualisent immédiatement les synthèses. Choix de thème local à l’appareil, non transféré par JSON.
2. **Historique temporel et évolution récente — livré en 1.3.0** (sections 11 et fin de 13). Les dates d’activité/import et couvertures permettent déjà de reconstruire des unions cumulées, sans nouveau matching. Recalculer par date de sortie, avec importedAt comme repli explicite pour les sorties sans date ; semaines ISO et mois selon Europe/Paris. Supprimer une sortie réécrit l’historique reconstruit. Une correction possède seulement son dernier updatedAt : impossible de reconstituer honnêtement ses anciennes valeurs ou les corrections effacées. Choix : montrer d’abord un historique automatique des sorties, clairement distinct de la progression actuelle corrigée. Si l’historique exact des corrections devient nécessaire, ajouter un journal versionné et l’inclure dans la sauvegarde ; ne pas inventer le passé. Le réseau et le dénominateur courants servent de référence fixe, documentée. Calcul incrémental dans un Worker pour éviter activités × réseau × dates sur le thread principal. Tests : import désordonné, doublon spatial, suppression partagée, date manquante, frontières semaine/mois et corrections.
3. **Segments à vérifier facultatifs — premier lot livré en 1.4.0** (section 8). Le diagnostic géométrique séparé traite deux signaux bornés et explicables, sans toucher au matcher ni exiger de recalcul des activités. Suggestions dérivées à la demande, version du diagnostic dans les choix ignorés. Les corrections existantes portent les validations/refus ; settings porte les ignorés. Aucun changement de schéma IndexedDB nécessaire. Sauvegarde v2 étendue par un champ optionnel validé ; absence du champ acceptée. Tests de restauration/rollback/suppression et continuité inclus. Les motifs plus complexes (petits trous, connectivité) restent à développer avec des cas concrets.
4. **Confort local et hors-ligne** : filtres avancés et amélioration d’état hors connexion après mesures réelles. Pas de cache massif de tuiles. Le compteur « X rues restantes ici » reste pour plus tard, conformément au prompt.
6. **Strava automatique, après les parcours** (section 16) : stockage serveur sécurisé des jetons, OAuth et mécanisme d’acquisition automatique ; identifiant d’activité fournisseur en plus des hashes de traces pour éviter les doublons entre import manuel et récupération. Un seul propriétaire, aucun compte interne multi-utilisateur.
5. **Parcours, avant Strava automatique** (section 10) : données de routage enrichies avec accès piétons, barrières et connectivité réelle ; boucles 5/8/10/15 km, départ/cible, export GPX. Ne pas réutiliser sans validation le graphe simplifié du matching. La génération devra rester indépendante de la couverture enregistrée et ne jamais créditer une route simplement proposée.

Les demandes de sauvegarde cloud, envoi vers Strava après un éventuel enregistrement, image partageable et compteur local restent listées dans « Plus tard ». Aucun besoin actuel de refondre NormalizedActivity, les intervalles de couverture ou les corrections. Les évolutions de modèle ci-dessus seront réalisées avec leurs fonctionnalités, tests de migration et sauvegardes compatibles, pas préventivement.

## Retours de recette

- 28 octobre : Arthur confirme le fonctionnement de la 1.2.0, son numéro de version et le mode sombre. Cela ne valide pas automatiquement tous les cas de la checklist hors-ligne et système.
- 28 octobre : Arthur confirme aussi le bon fonctionnement du lot 1.3.0.
- Suite après recette 1.4.0 : confort de recherche/tri des rues et exploration ; approfondir les diagnostics selon les erreurs réellement observées. Strava et parcours restent des chantiers distincts nécessitant les dépendances indiquées plus haut.

## Priorités actualisées après le retour sur iPhone 14

Cet ordre remplace celui de l'audit historique ci-dessus. Les demandes non cochées restent à faire.

1. [x] **1.5.0 : carte et accès au diagnostic.** Index spatial, rendu limité à la vue avec marge, géométries partielles en cache, regroupement exact des lignes, sélection indépendante ; onglet « À vérifier ». Aucun changement des kilomètres, du réseau, du matching ou du format de sauvegarde.
2. [ ] **Recette iPhone 14.** Comparer zoom/déplacement, filtres et sélection avec les mêmes données ; traiter les régressions avant d'ajouter du routage. Mesurer séparément premier chargement, dessin des rues et arrivée du fond cartographique.
3. [ ] **Exploration locale.** Point de référence choisi sur la carte (inutile d'exiger l'adresse exacte du domicile), distance de proximité et rues restantes autour de ce point ; proposer des départs publics accessibles, expliquer distance d'accès et intérêt. Le compteur local est avancé ici car utile aux parcours.
4. [ ] **Réseau routable.** Préparer séparément les cheminements piétons, connexions, niveaux pont/tunnel, barrières et restrictions. Les axes représentatifs foot=use_sidepath du score ne sont pas des consignes de navigation sur la chaussée. Tester les jonctions et les impasses ; ne pas inventer une liaison pour atteindre une rue.
5. [ ] **Boucles locales puis GPX.** Départ sélectionné/proposé, longueurs 5/8/10/15 km, option arrondissement ; favoriser les mètres non parcourus, borner répétitions/détours, proposer moins d'options si aucun résultat raisonnable. Prévisualiser distance, nouvelles rues estimées et GPX ; départ/retour connectés, format GPX valide, aucune modification de progression avant import d'une activité réellement effectuée.
6. [ ] **Compatibilité téléphone.** Tester un GPX exporté dans une application gratuite adaptée. Strava documente l'import GPX via son créateur d'itinéraires web, dont l'accès exige un abonnement : ne pas promettre l'import personnel gratuit dans Strava mobile. Les liens Google Maps/Plans peuvent aider à rejoindre le départ ; ils ne garantissent pas le suivi exact d'une boucle GPX.
7. [ ] **Puis autres demandes.** Strava automatique, FIT/ZIP, sauvegarde cloud, image partageable et diagnostics plus avancés restent conservés ; les reprendre selon les dépendances et les cas réels.

Sources officielles consultées pour la préparation :
- Strava, import GPX : https://support.strava.com/fr/articles/15402061-comment-creer-un-itineraire-a-partir-d-un-fichier-gpx
- Strava, création web et abonnement : https://support.strava.com/fr/articles/15401971-comment-creer-et-gerer-des-itineraires-sur-le-site-web-de-strava
- Google Maps, liens et limites de points intermédiaires : https://developers.google.com/maps/documentation/urls/get-started
- Apple Plans, parcours à pied créés manuellement : https://support.apple.com/en-mide/guide/iphone/iph3d7ebd491/27/ios/27

Aucun flux officiel d'import GPX vers Plans iPhone n'a été confirmé dans cette recherche. Vérifier la compatibilité réelle à la livraison du générateur ; ne pas confondre ouvrir le point de départ, afficher une trace et être guidé sur cette trace.

## Retour trottoirs et rues larges — priorité avant les parcours

- [x] 1.6.0 : extension conditionnelle 15→25 m sur un suivi longitudinal ≥32 m, concurrence entre voies vérifiée, chaînes normales préservées, recalcul automatique et sauvegardes précédentes compatibles.
- [x] Masquer les suggestions de décalage déjà entièrement couvertes ; conserver les doutes sur les voies parallèles.
- [ ] Recette sur les traces exactes des captures Avenue de Grande-Bretagne / Rue de la Madeleine : les captures seules ne donnent ni l'activité ni ses points GPS. La comparaison de l'ancienne sauvegarde n'est pas une preuve que ces deux cas sont corrigés.
- [ ] Si le problème restant est la double représentation d'une même avenue : concevoir un regroupement de chaussées/trottoirs explicitement associés, avec métrique unique, géométrie cohérente et migration des corrections. Ne pas se contenter du nom ou de la proximité ; préserver quais, niveaux et voies indépendantes.
- Les étapes exploration locale, graphe routable, prototype de boucles avec budget de calcul puis GPX restent prioritaires ensuite ; aucune promesse d'optimum global. Les autres demandes restent conservées.

## Retour pont Gallieni / quai Gailleton — continuité

- [x] 1.7.0 : raccordement court et unique dans le réseau existant, soutenu par la même trace, entre une approche et une sortie reconnues. Chemins sans nom pris en charge sans fusion globale par libellé.
- [x] Tests de chemin alternatif, nom différent, niveaux, absence de connexion, décalage GPS, ancrages partiels et séparation des activités/pistes/temps. Recalcul et anciennes sauvegardes compatibles.
- [ ] Reproduire les trous précis de la capture avec la sauvegarde actuelle correspondante. La sauvegarde historique disponible ne permet pas de certifier leur résolution. Examiner notamment les traversées techniques retirées du réseau et les transitions de nom/niveau. Ne pas augmenter la tolérance indéfiniment pour masquer une connexion OSM absente.
- Le regroupement des chaussées, l'exploration locale et le prototype de parcours restent conservés avec leurs dépendances.

- [x] Cause identifiée à l'entrée du pont Gallieni : traversée OSM 1304453497 exclue comme objet technique. Préparation séparée de liaisons publiques, utilisation pour les raccordements et dessin de leur couverture, hors statistiques et objectif. Sur la sauvegarde historique, la traversée est reconnue intégralement ; cela ne certifie pas tous les trous du quai de la capture.


## Reprise des évolutions — 1.8.0 (28 octobre)

Arthur demande de passer aux autres mises à jour dans l’ordre. Les trous/trottoirs encore non résolus sont différés, pas abandonnés ni déclarés corrigés. La sauvegarde actuelle confirme 81 activités en matching 2.2.0.

1. [x] Exploration locale, premier lot : point manuel, rayon, kilomètres restants dans le cercle, noms de rues et voies sans nom, dix rues les plus proches et localisation de la portion. Corrections et arrondissement pris en compte. Distance à vol d’oiseau explicitement annoncée.
2. [ ] Recette visuelle iPhone du choix/annulation, cercle, liste et thème sombre ; performance réelle toujours à mesurer.
3. [ ] Préparer le graphe piéton séparé, restrictions et connexions réelles ; proposer des points de départ accessibles seulement après cette vérification. Le premier lot ne garantit aucun accès à pied.
4. [ ] Prototype de boucles avec budget de calcul et mesures de qualité/performance avant interface complète, puis export GPX et essai gratuit sur iPhone.
5. [ ] Strava automatique, FIT/ZIP, sauvegarde cloud et autres demandes conservées.

## Fondations de routage — reprise après validation du point

- Arthur confirme que le choix du point fonctionne sur son appareil. Cela ne vaut pas validation de toutes les autres interactions de la 1.8.0.
- [x] Extraction indépendante des chemins, tags de nœuds et relations depuis un PBF complet ; écriture atomique, date source et SHA-256 du PBF. L’ancien PBF local s’est révélé tronqué ; nouveau téléchargement dédié, sans remplacer le réseau de score.
- [x] Graphe de topologie séparé : trottoirs/traversées conservés, identifiants OSM exacts, points de géométrie compressés entre jonctions, directions piétonnes, blocages et audit des composantes.
- [x] Plus court chemin borné, tas de priorité, annulation et diagnostics d’échec. L’archive historique incomplète ne peut pas servir au mode `route`.
- [ ] Recette de trajets réels : départ, pont/quai, traversées, impasses et passages fermés. Le profil conservateur peut exclure un itinéraire valide ; les composantes ne sont pas fusionnées pour forcer un résultat.
- [ ] Rapprocher le réseau routable et les fractions du score, sans créditer de gain par simple proximité ; les snapshots ont des dates distinctes.
- [ ] Prototype de boucles : budget commun à la génération entière, Worker, longueur souhaitée, gain unique et répétitions, puis mesures sur iPhone.
- [ ] Interface de propositions et export GPX après ces contrôles ; essai dans une application iPhone gratuite.

Ce lot est technique : pas de changement visuel ni d’activation de navigation, application toujours 1.8.0. Les demandes différées (trottoirs, Strava, FIT/ZIP, cloud) restent conservées.

## Prototype de boucles et raccordement au score

- [x] Raccordement conservateur entre snapshots : identité OSM + niveau + géométrie quasi identique ; intervalles partiels, union sans doublon, corrections/exclusions et zone de gain.
- [x] Prototype 5/8/10/15 km : trois tronçons routés orientés, budget commun, contrôle de fermeture, répétitions, longueur et déduplication, classement par nouvelles portions estimées. Worker préparé avec identifiant de requête ; intégration client encore absente.
- [x] Mesures sur Lyon avec couverture vide et essai local sur la sauvegarde réelle ; aucun GPS personnel ni rapport personnalisé publié. Inspection visuelle locale de la forme d’une boucle et validation automatique des raccordements ; pas une recette de terrain.
- [ ] Étendre la correspondance au score seulement avec preuves topologiques/géométriques : environ 65,6 % des kilomètres sont associés strictement, les axes représentatifs/trottoirs différents sont volontairement non transférés.
- [ ] Prochaine livraison visible : empaqueter les données de routage avec provenance et chargement à la demande ; valider le point de départ sur le graphe sans liaison artificielle ; initialiser le Worker une fois, annulation et protection contre résultats périmés ; afficher les propositions, limites des estimations et budget atteint.
- [ ] Export GPX et validation dans une application gratuite iPhone ; contrôler les parcours et mesurer sur appareil réel avant d’annoncer une navigation fiable.

Le prototype est séparé de l’interface 1.8.0 et ne change pas le matching. La validation de chemins dans OSM et de leur géométrie ne certifie pas l’ouverture d’un passage sur le terrain.
