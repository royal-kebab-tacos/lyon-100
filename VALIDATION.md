# Validation de la révision 1.1.1 — 26 octobre 2026

## Résultat sur la sauvegarde réelle

La sauvegarde fournie contient 81 activités déjà recalculées en 1.1 : la mise à jour avait fonctionné. Le défaut était dans les filtres OSM : suppression des axes use_sidepath et de tous les trottoirs, et mauvaise priorité entre access et foot.

Après correction, validation/restauration de la sauvegarde complète : **81 activités et toutes leurs traces conservées à l’identique**. Couverture globale : **84,30 → 107,48 km uniques**. Sortie réelle Guillotière : **3,66 → 9,21 km uniques reconnus**, sur 11,22 km de distance GPS totale. Le calcul des 81 activités a pris environ 9 secondes sur le serveur Node ; ce n’est pas une mesure iPhone.

Comparaison cartographique avant/après inspectée avec le même GPS : grands trous fortement réduits sur les quais et les rues. Quelques différences subsistent ; aucune promesse de précision parfaite. Aucune augmentation de la tolérance de 15 m. Aucun GPS brut recolorié pour simuler la couverture.

Le réseau contient **127 122 unités et 1 078 662,62 m**, version `lyon-v2-f1a372ba1520e6fa`, même source OSM BBBike du 17 octobre. Le pourcentage global reste proche de 10 % car le dénominateur augmente aussi. Les trottoirs ne sont retirés que lorsqu’un axe parallèle proche les représente. Les axes use_sidepath représentent la rue pour la progression, sans indiquer où circuler.

Les fichiers personnels restent hors dépôt et archive. Le script facultatif `node --import tsx scripts/validate-backup.ts /chemin/sauvegarde.json` vérifie une sauvegarde sans l’écrire ni la modifier.

## Contrôles automatisés

- 63 tests : parsing, fractions, croisements, rues parallèles, virages, doublons, union/suppression, corrections, migrations et restauration ; régressions des permissions piétonnes, trottoirs et trois voies réelles oubliées.
- Lint, TypeScript et build de production : exécutés pour cette livraison.
- Réseau statique précaché ; aucun téléchargement massif/cache de tuiles ajouté.
- Les benchmarks versionnés de 96 191 unités concernent la version 1.1 précédente ; ils ne sont pas des mesures du nouveau réseau ni d’un iPhone.

## Limites et recette restante

La comparaison géographique réelle est validée, mais la recette interactive de cette révision dans un navigateur et sur iPhone reste à effectuer. Les tentatives précédentes d’accès au navigateur étaient bloquées ; aucune capture de l’ancienne V1 ne sert de preuve pour cette livraison. Le réseau de 37 Mio et le rendu des 127 122 unités nécessitent notamment une mesure sur iPhone.

Les ponts, tunnels et traces GPS ambiguës peuvent encore être mal associés. Une correction incompatible avec un changement de réseau bloque ce changement pour préserver les données. Le statut « terminée » à 95 % ne gonfle jamais les mètres. FIT reste hors de cette révision.

## Checklist sur Mac — à exécuter avec vos données

- [ ] Exporter le JSON de l’ancienne V1 ; arrêter son serveur ; installer la nouvelle version sans effacer IndexedDB.
- [ ] Ouvrir exactement la même adresse dans le même navigateur ; attendre le recalcul ; conserver le même nombre, les mêmes noms et dates d’activités.
- [ ] Vérifier les quatre écrans dans Safari ; vérifier l’absence d’erreur et la lisibilité à largeur mobile.
- [ ] Sur Guillotière : comparer GPS et vert le long du quai, au virage et dans les rues suivantes. Identifier toute portion manquante avec le fichier réel.
- [ ] Masquer le GPS : le vert reste ; aucune trace orange ne s’affiche après un import ordinaire.
- [ ] Importer GPX et TCX valides, puis un doublon et un fichier invalide ; vérifier les messages. Tester GPX.gz/TCX.gz.
- [ ] Vérifier une rue partielle puis une rue à ≥95 % : statut terminé mais mètres restants conservés.
- [ ] Sélectionner les neuf arrondissements : statistiques, zoom et mise en évidence ; comparer la somme de leurs kilomètres à Lyon.
- [ ] Tester recherche, filtres de rues, Retrouver sur la carte, fiche et filtres Toutes/Restantes/Parcourues.
- [ ] Choisir une unité, confirmer chacune des corrections, recharger, puis Revenir au calcul automatique ; contrôler mètres et dénominateur.
- [ ] Supprimer une activité après sauvegarde : ses portions communes à une autre restent ; annuler une suppression ne change rien.
- [ ] Exporter puis restaurer JSON ; vérifier activités et corrections. Tester ancien JSON, JSON invalide et annulation.
- [ ] Tester réinitialisation uniquement sur une copie de données sauvegardée ; restaurer ensuite.
- [ ] Fermer et rouvrir ; conserver la progression. Vérifier fonctionnement sans fond de carte.

## Checklist sur iPhone — après hébergement HTTPS

- [ ] Relever modèle/version iOS ; ouvrir Safari à l’URL HTTPS ; attendre la préparation hors ligne.
- [ ] Partager → Sur l’écran d’accueil ; ouvrir par l’icône en mode autonome.
- [ ] Restaurer votre JSON depuis Fichiers ; vérifier les mêmes kilomètres et activités.
- [ ] Tester import multiple, GPS comparé, filtres, fiche de rue, correction et confirmations au toucher.
- [ ] Tester zoom, déplacement et rotation portrait/paysage, sans débordement ni bouton masqué.
- [ ] Fermer/réouvrir la PWA puis redémarrer l’iPhone : données conservées.
- [ ] Mode avion après chargement : consulter progression, rues et activités ; importer un fichier local ; le fond peut manquer.
- [ ] Exporter dans Fichiers, restaurer et vérifier corrections et suppression partagée.
- [ ] Mesurer démarrage, import 5–20 km, lot de sorties et recalcul de l’historique ; vérifier réactivité et absence de crash. Objectifs : démarrage chaud ≤5 s, fichier 10 000 points ≤15 s, maximum 100 000 points ≤60 s, à confirmer.
- [ ] Mettre en arrière-plan pendant import/recalcul : aucune demi-activité ne doit apparaître après reprise.
- [ ] Accepter une mise à jour hors import ; progression conservée, hors ligne à nouveau opérationnel.

## Préparation à l’hébergement — 26 octobre 2026

66 tests automatisés incluent le chargement du réseau réparti en fichiers. Les parties sont nommées par hash ; le build conserve exactement les mêmes unités, géométries et longueurs. Le fichier monolithique est conservé dans les sources pour la préparation OSM mais retiré du build distribué. Aucun historique personnel n’est publié. L’accès hébergé est privé, par le compte ChatGPT propriétaire. La recette iPhone, notamment reconnexion et hors ligne, reste à effectuer. L’aperçu géré a échoué avant démarrage (commande vite introuvable dans son environnement), malgré le build local disponible ; ne pas présenter cet aperçu comme une validation visuelle.

## Correctif 1.1.2 — restauration entre navigateurs
La sauvegarde du 26 octobre a reproduit le refus au contrôle de couverture : 81 activités, aucun segment différent, aucun nombre d’intervalles différent, mais 58 activités avec différences numériques ; écart maximal 2,84e-14 sur une fraction. La comparaison des fractions accepte désormais un écart ≤1e-9, soit ≤1e-8 m par unité de 10 m. Les identifiants, la structure, les bornes, le hash GPS et les différences significatives restent vérifiés. Le GPS et sa tolérance sont inchangés. L’hébergement Sites a échoué ; la production utilisée est Netlify, mise à jour par dépôt du dossier compilé.

## Préparation GitHub / Netlify
69 tests, lint, TypeScript et build passent après reconstitution des deux fichiers OSM compressés. L’intégrité des fichiers reconstitués est vérifiée par SHA-256. La configuration Netlify impose les contrôles avant publication. La connexion du site existant au dépôt nécessite encore l’autorisation de son propriétaire dans Netlify.

## Lot 1.2.0 — 28 octobre 2026

- 73 tests automatisés réussis, lint, TypeScript et build de production réussis.
- Nouveaux cas : union partagée, unités aux frontières sans double comptage, statut 95 % distinct du jalon 100 %, corrections/exclusions, suppression, sélection des arrondissements et zones vides.
- Aucun changement des règles OSM, du matching, du schéma IndexedDB ou du format de sauvegarde.
- Réseau complet conservé dans le build PWA. Pas de dépendance ajoutée.
- Vérification visuelle locale non réalisée : Chromium absent et téléchargement Playwright inutilisable dans cet environnement. Le serveur Vite annonce son démarrage en boucle locale, mais la connexion depuis une commande séparée échoue. Ne pas présenter ceci comme une recette navigateur réussie.

### Recette Mac puis iPhone pour ce lot

1. Exporter une sauvegarde, accepter la mise à jour hors import, vérifier Application 1.2.0 dans Réglages.
2. Comparer nombre d’activités, kilomètres et pourcentage avec la version précédente : identiques sans nouvelle importation/correction.
3. Réglages → Apparence : Clair, Sombre, Système ; vérifier textes, boutons, confirmations, champs, attribution et navigation sur les quatre écrans. Les tuiles restent dans leur style original ; vérifier aussi fond masqué.
4. Recharger après choix Sombre : préférence conservée. Passer à Système puis changer l’apparence de l’appareil : réaction sans rechargement.
5. Progression : Lyon + neuf zones, jalons, synthèses, sélection de zone et liste de rues. Aucun débordement horizontal à 390 px et en orientation paysage.
6. Vérifier sur une rue à 95–99 % : statut terminée, mais kilomètres restants et jalon 100 % non acquis pour la zone incomplète.
7. Sur une copie de test, ajouter/retirer une correction puis revenir en automatique : tableaux actualisés et chiffres revenus à leur valeur précédente.
8. Répéter sur iPhone installé, fermer/rouvrir ; consulter Progression et Réglages hors ligne après un chargement complet. Le fond de carte peut manquer, les données doivent rester visibles.
9. Sur une copie de test, restaurer le JSON : activités/corrections conservées, préférence de thème de l’appareil inchangée.

Cette liste reste à valider sur les appareils réels ; le passage des tests automatisés ne la remplace pas.

## Lot 1.3.0 — historique (28 octobre 2026)

- 86 tests réussis : 11 nouveaux cas de calcul/calendrier et 2 tests de composant (rendu des données, changement de zone sans nouveau Worker, suppression, erreur et reprise). Tests de composant sous jsdom avec Worker simulé, pas une recette visuelle navigateur.
- Lint sans avertissement nouveau, TypeScript et build de production ; Worker historique inclus dans le pré-cache PWA (26 entrées).
- Benchmark local : réseau réel de 127 122 unités, 100 activités SYNTHÉTIQUES de 2 500 unités chacune, 674 ms pour l’historique. Différence avec le total de l’union actuelle : 0 m. Ce résultat n’est pas une mesure Safari/iPhone ni une vraie sortie.
- Aucun changement de matching, réseau, schéma de base ou format de sauvegarde. Traces GPS non transférées au Worker historique (seulement dates, IDs et couvertures).
- Recette visuelle réelle toujours à effectuer ; l’environnement ne dispose pas de navigateur local utilisable (limite constatée sur le lot précédent).

### Recette Mac puis iPhone

1. Vérifier 1.3.0, activités et progression globale inchangées ; ouvrir Progression avec les sorties existantes, sans les réimporter.
2. Vérifier courbe/tableau, bascule semaine/mois et périodes plus anciennes ; périodes sans nouveauté à zéro, cumuls non décroissants.
3. Choisir deux arrondissements puis Tout Lyon : titres et valeurs changent, le total Lyon égale les neuf zones (avant arrondi d’affichage).
4. Vérifier les encadrés semaine/mois, une semaine du lundi au dimanche et une période sans sortie.
5. Sur une copie de test : importer une ancienne sortie ; vérifier sa contribution à sa date de réalisation. Réimport identique : aucun double comptage.
6. Sur une copie : supprimer une sortie partageant des rues avec une autre ; les mètres de l’autre restent présents et les gains sont réattribués chronologiquement. Restaurer la sauvegarde pour retrouver l’historique.
7. Exclure puis rétablir une portion sur une copie : le dénominateur et toutes les périodes se recalculent. Include/remove change le total courant, pas les gains automatiques historiques, comme expliqué dans l’écran.
8. Contrôler les deux thèmes et une largeur iPhone ; le tableau peut défiler horizontalement à l’intérieur de son cadre. Tester hors ligne après téléchargement complet et ouverture de cette version.
9. Changer rapidement de zone ou supprimer pendant un calcul : aucun résultat d’une ancienne liste d’activités ne doit réapparaître.

## Lot 1.4.0 — vérification GPS facultative (28 octobre 2026)

- 103 tests réussis ; lint, TypeScript et build de production réussis.
- Diagnostics : décalage soutenu 15–22 m, voies parallèles concurrentes, exclusion des axes secondaires quand un axe est clairement plus proche, croisements, voies collinéaires, points isolés, pistes séparées, grands sauts. Le résultat du matching demeure identique avant/après diagnostic.
- Stockage : ignorer sans modifier les activités ni les corrections ; déduplication des choix simultanés ; réaffichage ; suppression/réinitialisation ; sauvegarde et restauration des choix/corrections ; compatibilité sans le champ optionnel ; refus des entrées falsifiées ; rollback en cas d’échec.
- Composant sous jsdom avec Worker simulé : affichage du motif, actions transmises uniquement au clic, masquage des portions déjà corrigées. Ceci ne remplace pas une recette visuelle sur navigateur réel.
- Benchmark local final : réseau réel de 127 122 unités, 2 500 pistes SYNTHÉTIQUES indépendantes reprenant les géométries OSM (20,12 km au total), 284 ms, 40 suggestions. Ce cas mesure le coût local sur ces données, pas la qualité d’une vraie course ni les performances iPhone.
- Le Worker de diagnostic est inclus dans le pré-cache de production (27 entrées). La tolérance du matching reste à 15 m ; les 22 m concernent seulement le diagnostic. Aucun recalcul imposé au démarrage, aucune nouvelle dépendance, aucun changement de schéma IndexedDB.

### Recette Mac puis iPhone

1. Exporter une sauvegarde, attendre la publication, ouvrir Réglages : version 1.4.0. Vérifier mêmes sorties, kilomètres et progression.
2. Activités → Vérifier le GPS sur une ancienne sortie : le panneau apparaît et l’analyse laisse la progression inchangée. L’absence de suggestions reste possible.
3. Comparer sur la carte : zoom sur la petite portion bleue, trace orange de la bonne sortie, toutes les portions affichées. Contrôler une voie parallèle et un décalage GPS connu.
4. Sur une copie de test : « Je l’ai parcourue » puis annuler la confirmation : aucun changement. Confirmer : correction globale sur la portion entière. Depuis la carte, revenir au calcul automatique pour retrouver l’état précédent.
5. Même contrôle pour « Je ne l’ai pas parcourue ». La portion corrigée disparaît des suggestions.
6. Ignorer une suggestion : mètres inchangés, choix conservé après fermeture/réouverture. Réafficher les ignorés : suggestion à nouveau disponible.
7. Exporter/restaurer sur une copie puis sur un autre appareil en 1.4.0 : choix ignorés et corrections conservés. Une ancienne sauvegarde sans choix reste restaurable.
8. Supprimer une sortie sur une copie : ses choix ignorés sont nettoyés ; les couvertures des autres sorties restent présentes.
9. Quitter/changer de sortie pendant l’analyse : aucun résultat d’une ancienne sortie ne doit remplacer celui de la sortie choisie. Tester fermeture du panneau et réouverture.
10. Vérifier mode clair/sombre, boutons sur iPhone et analyse hors ligne après téléchargement complet. Tester une vraie sortie longue ; aucune performance iPhone n’est affirmée avant cette recette.

Recette visuelle Mac/iPhone en attente. Le navigateur local n’était pas disponible pour la validation précédente ; cette livraison ne prétend pas remplacer les essais sur appareils réels.

## Lot 1.5.0 — carte et navigation

- Tests, lint, TypeScript et build de production réussis. Avertissements de build non bloquants : taille du bundle et configuration native Vite.
- 110 tests automatisés : sept nouveaux cas sur index spatial, portions traversant la vue, déduplication, jonctions/boucles, conservation des fractions et séparation des styles.
- Mesure locale sur le réseau réel : 4 403 unités intersectent une vue autour de Guillotière (4.828–4.842 E, 45.748–45.758 N), contre 127 122 dans Lyon. C'est une réduction de charge, pas une mesure de fluidité sur iPhone.
- Aucun changement du réseau, matching, stockage ou sauvegarde. Pas de nouvelle dépendance.
- Recette visuelle navigateur et iPhone encore à effectuer : aucun navigateur local utilisable n'a permis de la certifier.

### Tests manuels Mac puis iPhone 14

1. Vérifier 1.5.0, mêmes activités et kilomètres ; ne pas effacer le stockage.
2. Dans Carte : zoom progressif Lyon → quartier → rue, déplacement rapide dans chaque direction, retour Lyon. Les rues de la nouvelle vue doivent réapparaître après le geste, sans rester manquantes.
3. Tester Toutes/Restantes/Parcourues, un arrondissement puis Lyon ; mêmes fractions vertes et grises, aucune jonction inventée.
4. Sélectionner plusieurs portions, ouvrir une rue depuis la liste et comparer au GPS : sélection bleue et bonne trace orange, zoom correct.
5. Ouvrir À vérifier depuis la navigation puis depuis une activité : bonne sortie, analyse, comparaison, confirmations et ignorer/réafficher fonctionnent. Revenir de la carte à À vérifier conserve la sortie choisie.
6. Vérifier les cinq onglets en portrait/paysage et en clair/sombre, aucun bouton masqué.
7. Après chargement complet, tester hors connexion : rues et données consultables, fond éventuellement absent.
8. Comparer le ressenti des déplacements avec/sans fond cartographique pour distinguer le dessin des rues et le téléchargement des tuiles. Rapporter le cas encore lent avant le lot de parcours.

## Lot 1.6.0 — tolérance conditionnelle

- 129 tests réussis ; lint, TypeScript et build de production réussis. Avertissements non bloquants Vite/configuration native et taille du bundle inchangés.

- Tests ajoutés : décalages ±18/24 m, longueur partielle, rejet à 26 m, passage court, aller-retour et pistes séparées, croisement, rue voisine et concurrente à 28 m, même nom sur deux axes, chemins indépendants, niveaux/pont, transitions vers la marge normale.
- Compatibilité : restauration matching 2.0.0 recalculée, corrections conservées, version future refusée ; tests existants d'atomicité, échec et modification dans un autre onglet conservés.
- Composant jsdom : suggestion de décalage résolue masquée, doute parallèle conservé.
- Comparaison locale sur 81 anciennes activités réelles : 107 479,42 m uniques avant, 107 517,04 m après (+37,62 m). Aucune activité ne perd de longueur couverte. Comparaison des deux moteurs : environ 13,6 s sur le runtime local, pas une mesure iPhone. Données personnelles et résultats détaillés restent hors dépôt.
- Le réseau et le dénominateur ne changent pas. Aucun changement de schéma IndexedDB ; version de matching 2.1.0, application 1.6.0.

### Recette manuelle Mac puis iPhone

1. Exporter une sauvegarde ; ouvrir 1.6.0 et laisser finir le recalcul automatique. Vérifier nombre de sorties et corrections. Ne pas supprimer l'application ni réimporter les GPX.
2. Comparer une vraie portion de rue large à sa trace orange : une progression longitudinale peut compter malgré un décalage 15–25 m ; un croisement seul doit rester non validé.
3. Contrôler une rue parallèle non faite, un quai bas/haut, un pont et un chemin de parc : absence de crédit supplémentaire uniquement dû à la proximité.
4. Ouvrir À vérifier : décalages résolus masqués, ambiguïtés persistantes consultables.
5. Tester restauration d'une ancienne sauvegarde sur une copie ; corrections et activités conservées, progression recalculée. Tester transfert vers un autre appareil également en 1.6.0.
6. Fermer/réouvrir après le recalcul : pas de recalcul répété. Tester carte, filtres et zoom.

Recette visuelle réelle non effectuée dans cet environnement. Les deux captures fournies ne suffisent pas à certifier un résultat de matching sans leurs traces correspondantes.

## Lot 1.7.0 — continuité et traversées piétonnes

- Linter, TypeScript et build de production réussis. 29 entrées dans le pré-cache, dont les liaisons publiques. Avertissements non bloquants Vite/configuration native et taille du bundle conservés.

- 149 tests réussis : raccordement entre ancrages, fraction partielle, chemins sans nom, noms différents, chemin alternatif même sous un autre nom, niveaux, connexion absente, détour GPS, limite de 40 m, séparation activités/pistes/temps, restauration des sauvegardes 2.0.0 et 2.1.0.
- Liaisons : traversées publiques autorisées, accès privés/interdits exclus, IDs distincts, couverture dessinée sans objectif gris ni ajout aux kilomètres/statistiques, sauvegarde/restauration et refus de corrections sur une liaison.
- Source OSM archivée : passage 1304453497, retiré auparavant par le filtre crossing. La préparation le rétablit comme liaison hors score. 20 478 unités de liaison pour Lyon, fichier public généré automatiquement depuis la source déjà livrée et pré-caché. Le réseau des rues et son dénominateur ne changent pas.
- Comparaison finale sur 81 anciennes activités réelles : 107 517,04 → 108 099,48 m uniques (+582,45 m), aucune perte de longueur par activité. Environ 14,4 s pour comparer les deux moteurs sur le runtime local ; ce n'est pas une mesure iPhone. Dans la zone Gallieni/Gailleton : +4,83 m éligibles et 7,53 m de passage piéton reconnus pour le dessin hors score. Aucun GPS personnel ni résultat détaillé ajouté au dépôt.
- Les résultats n'établissent pas que tous les trous de la capture sont corrigés : certains cheminements diffèrent, d'autres connexions peuvent encore manquer. Comparer la sauvegarde actuelle à la trace pour conclure sur chaque cas.

### Recette Mac puis iPhone

1. Vérifier 1.7.0, laisser terminer le recalcul sans réimport. Même nombre d'activités, corrections conservées, même total éligible ; vérifier les éventuels gains automatiques.
2. Comparer l'entrée ouest du pont Gallieni et sa traversée à la trace de la sortie. Le passage peut être dessiné en vert sans être un nouvel objectif à corriger.
3. Vérifier un petit trou sur une même voie, une rue parallèle distincte, deux chemins possibles et un quai à un autre niveau. Aucun trait droit inventé entre voies non connectées.
4. Vérifier deux activités distinctes de part et d'autre d'un trou : elles ne doivent pas déclencher un raccordement entre elles.
5. Vérifier les filtres : aucune liaison technique non parcourue ajoutée à « Restantes ». Les fractions restent fidèles.
6. Exporter/restaurer sur une copie et transférer vers un autre appareil également à jour ; activités, corrections et liaisons reconnues conservées.
7. Après chargement complet, ouvrir hors ligne : données de liaisons disponibles comme le réseau. Tester fluidité et zoom sur iPhone.

Recette visuelle Safari/iPhone non effectuée dans cet environnement ; les tests jsdom et les calculs locaux ne la remplacent pas.


## Version 1.8.0 — exploration locale

Tests ajoutés : intersection exacte cercle/polyligne (projection locale), couverture partielle intersectée plutôt que prorata global, unions, exclusions, connecteurs ignorés, arrondissement, voies sans nom, regroupement NFC, tri selon la portion restante, suppression de couverture, polyline coudée et cercle vide. Test React du panneau : choix, rayon, localisation, effacement, recalcul et absence de mutation.

Mesure locale sur le réseau complet et la sauvegarde réelle de 81 activités : construction de l’index ~89 ms ; requêtes rayons 250/500/1000/2000 m ~7/12/51/105 ms autour du point de test. Mesure du conteneur, pas de l’iPhone. Recherche déclenchée par les entrées du panneau, pas par chaque déplacement ou zoom. Données personnelles non incluses dans les tests ni le dépôt.

Vérification visuelle non réalisée : Playwright disponible mais exécutable Chromium absent. Recette iPhone à faire : placer un point, annuler, déplacer/zoomer, changer rayon et arrondissement, Voir puis effacer ; vérifier cercle, absence de débordement, thème sombre et mises à jour après import/correction/suppression. L’exploration ne prouve pas qu’un départ est accessible ni qu’un trajet est praticable.

Validation automatique 1.8.0 : 156 tests réussis, lint, TypeScript et build de production réussis. Avertissements Vite existants sur taille du bundle et résolution future du chargeur de configuration ; pas d’échec de compilation.

## Fondations de routage après 1.8.0 — 28 octobre 2026

173 tests réussis, lint, TypeScript et build de production réussis. Tests nouveaux : accès foot prioritaire, chaussée use_sidepath/trottoirs séparés, traversées, sens piétons et automobiles distincts, barrières/portails verrouillés/bordures, nœud de jonction explicite, pont sans connexion géométrique inventée, compression avec forme et distance conservées, restrictions de virage piétonnes exclues conservativement, discontinuités, frontière avec trou, source non mutée, plus court chemin et géométrie inversée, limites distance/visites/temps, annulation et métadonnées absentes. Extraction Python compilée et exécutée sur un PBF complet ; le PBF historique tronqué échoue avec unexpected EOF.

Source de routage indépendante : BBBike Lyon, données OSM au 24 octobre 2026 00:00 UTC. SHA-256 du PBF : `58a3ce52b19ade2abde857eee0e92a176ab20eaddb8df3e8d0089a959cc12e19`. Extraction : 193 943 voies, 61 536 nœuds portant des tags pertinents et 1 305 relations de restriction (ensemble de l’extrait, pas seulement Lyon). Pas de remplacement du réseau de score dont la source est antérieure.

Graphe final : 53 353 nœuds et 65 630 arêtes ; 114 484 arêtes originales avant compression. 727 composantes non orientées ; la plus grande contient 48 811 nœuds. Ce nombre ne prouve pas une accessibilité dans les deux sens. 32 911 nœuds exclus par le profil dans l’extrait entier ; aucune relation explicitement piétonne détectée comme bloquante dans cette source. Préparation hors application ~71 s ici. Les bordures `barrier=kerb` sont franchissables par défaut pour le profil marche/course, conformément à la documentation OSM (https://wiki.openstreetmap.org/wiki/Tag:barrier=kerb), sauf restriction explicite ; ce n’est pas un profil fauteuil roulant.

Benchmark final dans le conteneur : index de recherche ~136 ms, trois recherches entre nœuds proches de repères publics ~10/11/16 ms, chemins de 1 063/1 353/1 728 m, respectivement 4 038/7 063/10 632 nœuds visités. Budget de chaque recherche : 6 km, 20 000 nœuds, 1 seconde. Ces résultats mesurent uniquement le plus court chemin sur le graphe, pas des boucles maximisant les rues nouvelles, ni la performance iPhone, ni l’accessibilité réelle de chaque passage. Le benchmark prend le nœud le plus proche d’un repère sans prétendre que le raccordement au repère est praticable.

Le moteur et les données de prototype ne sont pas chargés par l’interface : les assets de production restent identiques à 1.8.0. Aucun changement de matching, de progression ou de sauvegarde. Pas de nouvelle recette visuelle nécessaire pour ce lot sans UI ; recette de parcours réel et tests iPhone obligatoires avant activation. Les dépendances de préparation Python restent hors application et hors installation Netlify.

Suite prioritaire : vérifier des trajets et leurs géométries ; traiter les composantes déconnectées sans inventer de liens, puis relier le score au réseau routable de date différente. Ensuite seulement prototype de boucles borné avec Worker et GPX.

## Prototype de boucles et liaison au score — 28 octobre 2026

183 tests réussis, lint, TypeScript et build réussis. Nouveaux cas : correspondance partielle inversée, géométrie coudée, refus de voie/niveau/pont différents ou voie parallèle déplacée, union inter-arêtes et revisites, corrections/exclusions/arrondissement, source différente, non-mutation, boucle orientée fermée, géométrie incompatible refusée, limites temps/visites partagées, annulation et requête Worker identifiée avec erreurs sérialisées.

Raccordement des snapshots : 87 216 unités sur 127 122, environ 707,4 km sur 1 078,7 km (65,6 %) ont une correspondance géométrique au moins partielle. Les kilomètres sont les fractions effectivement associées. Préparation ~1,06 s et calcul des gains ~367 ms dans le conteneur ; les correspondances statiques doivent être préparées hors du téléphone, les gains dépendent de sa couverture et se calculeront en Worker. Les axes de score non associés ne donnent pas de récompense présumée.

Benchmark durable `tests/loops-benchmark.json` effectué avec couverture vide (aucune donnée personnelle), 2 secondes et 800 000 nœuds visités maximum par génération, jusqu’à 24 paires de points. Résultats : 3/2/2/3 propositions pour 5/8/10/15 km, environ 1,26/1,55/1,80/1,99 s ici. 8/10/15 km atteignent la limite de visites et conservent leurs propositions déjà validées : ne pas présenter cela comme une recherche exhaustive. La préparation des liens et gains est mesurée séparément dans ce benchmark direct ; le protocole Worker soustrait le temps des gains au budget restant. La copie/initialisation des données doit être mesurée lors de l’intégration réelle.

Essai privé supplémentaire sur la sauvegarde réelle effectué ; rapport et géométries personnalisées non publiés. Une boucle de 5 km demandés a été inspectée visuellement sur le réseau OSM : forme fermée, passages géométriquement continus, niveaux et connexions issus des nœuds source. Ce n’est pas une validation de praticabilité sur le terrain. Aucun trait GPS personnel rendu ou exporté. Les propositions ne sont pas des parcours mathématiquement optimaux.

Aucune UI n’a changé : assets applicatifs toujours identiques à 1.8.0. Le Worker du prototype est testé comme module mais pas encore chargé par l’application. La recette de chargement/déchargement/annulation sur iPhone et le contrôle des trajets réels restent à faire dans le lot visible suivant.

## 1.9.0 — parcours visibles (29 octobre 2026)

- Tests ajoutés : client Worker réutilisé, annulation/rejet et résultats obsolètes, délai maximal et erreurs tardives ; chargement vérifié/cache corrompu/réparation/hors connexion/quota ; départ réellement connecté et rayon maximal ; GPX XML échappé/coordonnées exactes/fermeture/absence de temps/partage annulé ; interface sans téléchargement automatique, choix de distance, propositions, export, annulation et invalidation lors d’un changement de couverture.
- Contrôle du build dans Chromium 134, vue 390 × 844 : zéro requête de routage avant action, 36 parties au premier départ, trois propositions pour 5 km, tracé violet inspecté et fichier GPX téléchargé. Aucun débordement horizontal et aucune erreur JavaScript. Fond de carte volontairement bloqué pour vérifier le repli existant.
- Après passage hors connexion et changement de point, nouveau départ trouvé depuis CacheStorage sans nouvelle requête de routage.
- Données publiques : 36 975 638 octets non compressés ; compression gzip locale des 36 parties : 7 081 235 octets (la compression et la facturation réelles dépendent de l’hébergeur). Association stricte : 65,58 % des mètres du score. Aucun préchargement des parties routing dans le service worker.
- Aucune sauvegarde personnelle, trace GPS réelle ou proposition personnalisée dans les fichiers à publier. Les captures/exports du contrôle navigateur restent des diagnostics locaux.
- Limites : pas de test sur iPhone physique ni de validation terrain. Le test Chromium ne certifie pas le partage iOS, la mémoire disponible sur l’appareil ou la compatibilité d’une application de guidage externe.

Contrôle automatisé complet : **193 tests réussis dans 22 fichiers**, compilation TypeScript et build PWA réussis. L’avertissement Vite concernant la taille du paquet principal demeure ; les données de routage sont séparées et chargées uniquement à la demande.

## 1.10.0-dev.1 — quadrillage local et relief (29 octobre 2026)

Version de travail, non déployée en production. **204 tests réussis dans 24 fichiers**, lint sans avertissement nouveau, TypeScript et build PWA réussis. Les avertissements Vite préexistants sur le chargement futur de configuration et la taille du paquet principal restent présents.

Tests ajoutés : quadrillage d’une grille, petits repassages autorisés, proposition plus courte sans remplissage, sortie de périmètre au milieu d’une géométrie, frontière réelle d’arrondissement et marge, départ hors zone, sens uniques et retour, budget partagé/annulation, gains marginaux avec recouvrements/exclusions/couverture, relief modifiant le choix du trajet, ascension/descente inversées, sommets intermédiaires, données inconnues sur pont/tunnel, profil SVG interrompu et invalidation après changement de rayon/zone/préférence relief.

Données IGN : 131 328 échantillons publics, aucune valeur manquante sur les points demandés ; les ponts/tunnels sont volontairement non échantillonnés. Archive gzip de 858 764 octets, 14 parties, SHA-256 vérifié avant préparation. Provenance/licence conservées. Aucun appel IGN pendant les calculs de l’application ou le build. Les données de parcours complètes représentent 40 545 522 octets avant compression et restent hors pré-cache PWA, chargées à la demande.

Essais reproductibles sur le réseau complet avec couverture vide, sans trace personnelle (`tests/local-routing-benchmark.json`) :

- Cercle de 500 m autour d’un point public de Croix-Rousse : première proposition 5 377 m, 3 217 m nouveaux estimés, D+ estimé 36 m, 100 % du trajet dans le cercle.
- Départ public vers les Terreaux, arrondissement 1 : première proposition sans préférence relief 5 478 m / D+ estimé 168 m ; avec préférence relief 5 203 m / D+ estimé 38 m. Profil connu sur environ 97–98 % du trajet ; ne pas présenter ces nombres comme un relevé de terrain.
- Sur cet environnement, les cas mesurés restent sous deux secondes. Ce n’est pas une mesure de performance iPhone.

Contrôle Chromium 134, viewport 390 × 844 : sélection du point, génération dans le cercle, profil visible, carte quadrillée, téléchargement GPX, zéro débordement horizontal, absence d’erreur JavaScript. Changement en arrondissement 1, zoom sur sa frontière, nouveau point et génération vérifiés. Le contrôle a révélé puis permis de corriger le recentrage intempestif sur l’ancien départ au changement de zone. Réutilisation des 39 parties déjà chargées pour retrouver un départ hors connexion. Les caches et diagnostics restent locaux.

Limites : pas de recette iPhone physique ni de parcours effectué ; D+ de terrain estimé avec bruit résiduel possible, profil inconnu sur certains ouvrages. Heuristique locale, pas de garantie d’optimum, d’absence totale de longues répétitions ou de couverture de toutes les petites rues. Les propositions sous le budget demandé sont signalées. Un premier chargement exige une connexion et la conservation du cache dépend du navigateur.
