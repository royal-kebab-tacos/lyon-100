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
