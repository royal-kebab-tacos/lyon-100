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

- Historique temporel : évolution globale, nouvelles voies par semaine/mois, évolution par arrondissement. Utiliser dates et couvertures des activités conservées ; définir le comportement de l’historique après suppression/correction.
- [x] Premier lot 1.2.0 : synthèse Lyon/neuf zones dans Progression, kilomètres uniques/restants, rues terminées/total, arrondissement le plus avancé et plus proche des 100 % (kilomètres restants). Couverture fusionnée une fois pour le tableau.
- [ ] Évolution récente : dépend de l’historique temporel ci-dessous.
- [x] Jalons 25/50/75/100 % pour Lyon et chaque arrondissement, sans points ni badges. Un jalon reflète les mètres effectifs, pas les statuts de rues.
- À vérifier : portions ambiguës (parallèles, GPS imprécis, incertitude). Valider/refuser/ignorer, sans rendre chaque import pénible ; s’appuyer sur les corrections séparées.
- Filtres avancés et sélection locale de zone ; améliorer la consultation hors ligne en respectant les conditions des fonds de carte.
- [x] Thème clair/sombre/système (1.2.0), préférence IndexedDB sur cet appareil ; fond de carte inchangé.
- [ ] Recette visuelle Safari/iPhone du mode sombre et du changement de thème système.
- Import direct d’une archive ZIP Strava, traitement local borné, réutilisation des parseurs normalisés et de l’antidoublon. Dépend du support FIT si l’archive en contient.

## V2 — Strava automatique

Connexion au compte personnel : course sur Strava → réception automatique → normalisation → matching → progression. OAuth, secrets et récupération automatique exigent une conception backend dédiée, seulement à cette étape. Réutiliser `NormalizedActivity`, ne pas ajouter maintenant comptes internes, profils ou architecture multi-utilisateur.

## V3 — générateur de parcours

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
2. **Historique temporel, puis évolution récente** (sections 11 et fin de 13). Les dates d’activité/import et couvertures permettent déjà de reconstruire des unions cumulées, sans nouveau matching. Recalculer par date de sortie, avec importedAt comme repli explicite pour les sorties sans date ; semaines ISO et mois selon Europe/Paris. Supprimer une sortie réécrit l’historique reconstruit. Une correction possède seulement son dernier updatedAt : impossible de reconstituer honnêtement ses anciennes valeurs ou les corrections effacées. Choix : montrer d’abord un historique automatique des sorties, clairement distinct de la progression actuelle corrigée. Si l’historique exact des corrections devient nécessaire, ajouter un journal versionné et l’inclure dans la sauvegarde ; ne pas inventer le passé. Le réseau et le dénominateur courants servent de référence fixe, documentée. Calcul incrémental dans un Worker pour éviter activités × réseau × dates sur le thread principal. Tests : import désordonné, doublon spatial, suppression partagée, date manquante, frontières semaine/mois et corrections.
3. **Segments à vérifier facultatifs** (section 8). Le matcher renvoie actuellement uniquement les portions retenues, pas les candidats rejetés ni leur confiance. Étendre son résultat avec motifs explicites (parallèle, distance, continuité) et version du diagnostic, puis stockage séparé des suggestions et décisions. Nécessite migration IndexedDB et extension rétrocompatible de sauvegarde si les décisions sont persistées. Réutiliser les corrections existantes pour valider/refuser, sans transformer toute trace proche en suggestion et sans bloquer les imports.
4. **Confort local et hors-ligne** : filtres avancés et amélioration d’état hors connexion après mesures réelles. Pas de cache massif de tuiles. Le compteur « X rues restantes ici » reste pour plus tard, conformément au prompt.
5. **Strava V2** (section 16) : stockage serveur sécurisé des jetons, OAuth et mécanisme d’acquisition automatique ; identifiant d’activité fournisseur en plus des hashes de traces pour éviter les doublons entre import manuel et récupération. Un seul propriétaire, aucun compte interne multi-utilisateur.
6. **Parcours V3** (section 10) : données de routage enrichies avec accès piétons, barrières et connectivité réelle ; boucles 5/8/10/15 km, départ/cible, export GPX. Ne pas réutiliser sans validation le graphe simplifié du matching. La génération devra rester indépendante de la couverture enregistrée et ne jamais créditer une route simplement proposée.

Les demandes de sauvegarde cloud, envoi vers Strava après un éventuel enregistrement, image partageable et compteur local restent listées dans « Plus tard ». Aucun besoin actuel de refondre NormalizedActivity, les intervalles de couverture ou les corrections. Les évolutions de modèle ci-dessus seront réalisées avec leurs fonctionnalités, tests de migration et sauvegardes compatibles, pas préventivement.
