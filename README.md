# Lyon 100 — version de travail 1.10.0-dev.1

**Cette branche prépare les nouveaux parcours locaux et le relief. Elle n’est pas publiée : le site Netlify reste en 1.9.0.**

Explorez Lyon à pied ou en courant. Les portions de voies réellement parcourues deviennent vertes, au fil de vos sorties. Vos données restent sur votre appareil.

## Utiliser la version hébergée

Ouvrez https://voluble-mandazi-129da2.netlify.app. Le Mac de la maison peut être éteint. À la première ouverture, allez dans Réglages → Restaurer un fichier JSON, sélectionnez votre sauvegarde récente puis confirmez. Les données restent dans ce navigateur : elles ne se synchronisent pas entre appareils.

Sur iPhone, ajoutez d’abord le site à l’écran d’accueil depuis Safari, puis restaurez le JSON dans l’application ouverte par son icône. Conservez une sauvegarde indépendante. Une fois le dépôt GitHub relié au projet Netlify, chaque modification publiée sur main déclenche les tests puis le déploiement. Gardez la même adresse. L’installation hors ligne  restent à vérifier sur votre iPhone.

La distribution découpe le réseau en plusieurs fichiers pour respecter la limite de taille de l’hébergeur. Le réseau, les identifiants et les calculs sont identiques à la version 1.1.1 validée.

## 1. Installer et démarrer sur Mac

Le réseau de Lyon est déjà fourni. **Ne lancez pas la préparation OSM pour commencer.**

Avant la première installation, vérifiez Node.js : ouvrez Terminal (⌘ Espace → Terminal), puis tapez `node -v` et `npm -v`. Si une commande est introuvable, installez **Node.js 24 LTS**, version 24.5 ou supérieure, depuis https://nodejs.org/en/download : choisissez l’installateur macOS `.pkg`. Quittez Terminal avec ⌘ Q puis rouvrez-le.

Décompressez l’archive et placez le dossier **Lyon-100** dans **Téléchargements**. Dans Terminal, exécutez **une commande à la fois** :

```bash
cd ~/Downloads/Lyon-100
npm ci
npm run dev
```

Attendez la fin de `npm ci` avant la dernière commande. Ouvrez ensuite **http://localhost:5173** dans Safari ou votre navigateur habituel. Laissez Terminal ouvert pendant l’utilisation. Pour arrêter : **Ctrl C** dans Terminal.

La prochaine fois, seules les commandes `cd ~/Downloads/Lyon-100` et `npm run dev` sont nécessaires.

Si le port 5173 est déjà utilisé, arrêtez l’ancien Lyon 100 avec Ctrl C. Ne changez pas d’adresse pour contourner ce message : une autre adresse possède une autre base de données.

## 2. Mettre à jour votre ancienne V1 sans effacer vos sorties

**Ne supprimez pas vos activités. Il n’est pas nécessaire de réimporter vos GPX.** Si vous avez déjà supprimé l’ancien dossier, cela n’empêche pas la mise à jour : les sorties sont dans le navigateur. Gardez votre sauvegarde JSON.

Cette version 1.1.1 corrige les voies oubliées par la 1.1. Après recalcul de la sauvegarde fournie le 26 octobre : 81 activités conservées, environ 107,48 km uniques au lieu de 84,30. Le pourcentage reste proche de 10 % car le total de voies éligibles a aussi augmenté. Vos nouvelles sorties importées depuis peuvent modifier ces chiffres.

1. Dans votre ancien Lyon 100, ouvrez **Réglages → Exporter ma sauvegarde** et conservez le JSON.
2. Arrêtez l’application : Ctrl C dans le Terminal qui la fait fonctionner.
3. Si un dossier **Lyon-100** existe encore dans Téléchargements, renommez-le en **Lyon-100-ancienne** pour le conserver. S’il a déjà été supprimé, passez à la suite.
4. Décompressez la nouvelle archive. Placez son dossier **Lyon-100** dans Téléchargements.
5. Exécutez les trois commandes de la section 1, une à la fois.
6. Ouvrez **la même adresse, dans le même navigateur** qu’avant. Si c’était http://localhost:5173, gardez exactement cette adresse.
7. Attendez le message indiquant le nombre de sorties recalculées. Laissez la page ouverte. Les traces, noms et dates sont conservés ; les kilomètres sont recalculés sur le nouveau réseau.

Un recalcul interrompu avant sa fin ne remplace pas partiellement les activités. La version conserve aussi une copie interne des données précédant la migration. Le JSON exporté reste votre sauvegarde indépendante.

Si aucune activité n’apparaît, vérifiez d’abord le navigateur et l’adresse. Vous pouvez aussi restaurer votre ancien JSON : ses traces seront recalculées automatiquement. **N’utilisez pas Réinitialiser pour faire une mise à jour.**

Après migration, revenir à l’ancien code avec la nouvelle base n’est pas pris en charge. Gardez le JSON d’avant mise à jour si vous devez revenir en arrière.

## 3. Importer une sortie et comprendre la carte

Cliquez sur **Importer une sortie**, choisissez un ou plusieurs fichiers. Sur ordinateur, le glisser-déposer fonctionne aussi.

Formats acceptés : **GPX, TCX, GPX.gz et TCX.gz**. FIT et archive ZIP Strava restent à intégrer. Un fichier ne doit pas dépasser 20 Mo, y compris après décompression, ni 100 000 points GPS.

Le vert signifie **« cette portion a été parcourue »**. Une rue suivie sur 620 mètres sur 1 000 affiche environ 620 mètres verts et 62 %. La trace GPS est associée aux voies OSM, avec une tolérance de 15 mètres.

Les unités mesurent au plus 10 mètres. La couverture peut être partielle à l’intérieur de chaque unité : parcourir 96 mètres sur 100 ne compte pas artificiellement 100 mètres. Les portions de plusieurs sorties se réunissent ; repasser au même endroit ne double pas les kilomètres.

Le calcul tient compte de l’ordre des points, de la direction et des connexions entre voies. Les virages et demi-tours sont conservés. Les pistes séparées et grands sauts GPS ne sont pas reliés artificiellement. Le GPS peut encore être ambigu près de voies parallèles, ponts ou tunnels.

La carte n’affiche pas de trace orange par défaut. Pour comparer : **Activités → Comparer au GPS**, puis **Masquer la trace GPS** sur la carte. Une seule activité est affichée à la fois.

Sélectionnez **Tout Lyon** ou un arrondissement. Les statistiques changent et la carte zoome sur la zone. Les filtres **Toutes les portions / Restantes / Parcourues** permettent de voir ce qu’il reste dans la zone que vous regardez.

## 4. Rues, statistiques et corrections

Dans **Progression**, retrouvez Lyon et les neuf arrondissements, puis la liste des rues avec recherche et filtres.

Une rue est **terminée à partir de 95 % de longueur réellement parcourue**. Cela ne change pas ses mètres : une rue de 1 000 mètres parcourue sur 960 mètres est terminée, mais les 40 mètres restants restent non parcourus.

Cliquez sur **Retrouver sur la carte**, ou touchez une portion sur la carte, pour lire la fiche de rue : total, parcouru, restant, pourcentage et statut.

La portion sélectionnée apparaît en bleu. Vous pouvez confirmer :

- **Je l’ai parcourue** : valide cette unité.
- **Je ne l’ai pas parcourue** : retire sa couverture erronée.
- **Exclure de mon objectif** : retire la portion et sa longueur du total à explorer, par exemple pour un passage inaccessible.
- **Revenir au calcul automatique** : annule la correction.

La correction concerne uniquement la petite portion bleue, jamais toute la rue. Elle est conservée après les imports et recalculs, et incluse dans les sauvegardes.

Les voies sans nom comptent dans les kilomètres mais pas dans le nombre de rues nommées. Les noms identiques sont regroupés. Une rue peut traverser plusieurs arrondissements ; ses mètres ne comptent qu’une fois dans Lyon. Chaque unité est attribuée à la zone contenant son milieu ; l’imprécision près d’une frontière est limitée à la taille d’une unité.

Le réseau inclut désormais les cheminements de quais et de parcs pertinents. Il contient environ **1 078,66 km**, contre 844,05 km dans la version 1.1 : le pourcentage peut donc baisser malgré une meilleure couverture. Les trottoirs sont conservés lorsqu’aucun axe de rue parallèle suffisamment proche ne les représente. Les trottoirs redondants et traversées purement techniques ne sont pas des objectifs supplémentaires. Les axes indiquant « utiliser le trottoir » représentent la rue dans cette carte de progression ; ils ne sont pas des consignes de circulation sur la chaussée. Certains accès OSM restent à vérifier sur le terrain.

## 5. Activités et suppression

**Activités** affiche nom, date, distance GPS totale, nouvelles voies apportées à l’import et progression correspondante. Ces contributions historiques ne sont pas la somme à utiliser pour la couverture globale.

Pour supprimer une activité, touchez la corbeille et confirmez. Ses portions partagées avec d’autres sorties restent vertes. Les corrections manuelles restent prioritaires.

## 6. Sauvegarder, restaurer, repartir de zéro

**Sauvegarder :** Réglages → Exporter ma sauvegarde. Conservez le fichier JSON hors de l’application, dans Téléchargements ou Fichiers.

**Restaurer :** Réglages → Restaurer un fichier JSON → choisissez le fichier → attendez la vérification → confirmez Remplacer mes données. La restauration remplace les activités et corrections présentes, elle ne fusionne pas. Une erreur avant validation laisse les données intactes. Les sauvegardes de l’ancienne V1 et de la version 1.1 sont acceptées et recalculées ; les corrections incompatibles avec un nouveau réseau sont refusées sans perte. Limite : 100 Mo et un million de points cumulés.

**Tout effacer :** Réglages → Réinitialiser mes données → confirmation. Cela efface les activités, corrections et copie interne de récupération. **Cette action est inutile pour une mise à jour.**

Vos données sont dans **IndexedDB**, le stockage de votre navigateur sur cet appareil. Un effacement des données du site ou du navigateur peut les supprimer. Un autre navigateur, une autre adresse ou un autre appareil possède un stockage distinct. Il n’y a pas de synchronisation automatique Mac/iPhone.

## 7. Tester rapidement le correctif de la Guillotière

1. Sauvegardez votre ancien JSON, puis installez la mise à jour comme en section 2.
2. Attendez le recalcul ; vérifiez que le nombre d’activités est conservé.
3. Dans Activités, choisissez votre sortie concernée et **Comparer au GPS**.
4. Zoomez sur le quai et les rues empruntées : comparez la ligne orange et les portions vertes sur le réseau. De petites différences GPS sont possibles, mais pas de grands trous artificiels sur une voie présente et réellement suivie.
5. Masquez le GPS : les portions vertes restent visibles.
6. Vérifiez une rue partiellement suivie, puis une rue presque entière : le statut à 95 % ne doit pas ajouter de mètres.
7. Si le problème persiste, envoyez à Codex **le GPX de cette sortie** et une capture de la zone. Le GPX suffit pour commencer ; votre sauvegarde JSON peut aider à tester la migration de toutes vos sorties.

**Exemple sans donnée personnelle :** importez `tests/fixtures/exemple-lyon.gpx`. C’est un exemple synthétique sur la rue de la République, environ **0,70 km et 76 unités**. Il ne remplace pas la validation de votre vraie sortie. Un deuxième import est signalé comme doublon. Supprimez cet exemple après essai.

## 8. Mettre à jour les données OSM

Inutile au quotidien. Le réseau livré est prêt. Pour le reproduire depuis la source incluse, sans téléchargement ni Python :

```bash
npm run prepare -- --cached
```

Pour récupérer une nouvelle source :

```bash
npm run prepare
```

Le script essaie Overpass avec des tentatives limitées, puis un extrait PBF BBBike si nécessaire. Le repli demande Python et `osmium` :

```bash
python3 -m venv .venv-osm
source .venv-osm/bin/activate
python -m pip install osmium
npm run prepare
```

La préparation prend plusieurs minutes. Elle ne fait pas partie du démarrage. Les neuf limites administratives sont obligatoires. Un échec ne remplace pas un réseau valide. Après un changement de réseau, les activités sont recalculées ; si des corrections manuelles ne peuvent plus être rattachées, le changement est bloqué pour les préserver. Ne mettez pas à jour OSM sans sauvegarde et sans besoin concret.

Source fournie : OpenStreetMap / extrait BBBike Lyon du **17 octobre 2026**, **127 122 unités**, **1 078 662,62 mètres**. Frontière communale et neuf arrondissements réels. Source reproductible dans `data/lyon-source.json.gz`, provenance dans `public/data/provenance.json`.

**© OpenStreetMap contributors — ODbL 1.0.** https://www.openstreetmap.org/copyright — https://opendatacommons.org/licenses/odbl/1-0/ . Les données dérivées et leur source sont incluses dans l’archive. Les dépendances conservent leurs licences ; aucune nouvelle licence de redistribution du code original n’est ajoutée.

## 9. Tests et version de production

Dans Terminal, dans le dossier du projet :

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Ou **`npm run check`** pour tests, lint et build incluant TypeScript.

Pour ouvrir le build : `npm run preview`, puis l’adresse affichée, normalement http://localhost:4173. Cette adresse possède une base distincte de celle du développement sur 5173. Ne double-cliquez pas sur `dist/index.html`.

Mesures techniques : `npm run benchmark` et `node --import tsx scripts/benchmark-connected.ts`. Les jeux sont synthétiques sur le vrai réseau ; les mesures sur ordinateur ne garantissent pas la vitesse sur iPhone.

## 10. Installer sur iPhone et consulter hors ligne

Il faut un hébergement statique **HTTPS** stable du dossier `dist`, puis une validation sur votre iPhone. Le serveur local Mac ne suffit pas à cette installation.

1. Ouvrez l’adresse HTTPS dans Safari.
2. Attendez l’indication « Application prête hors ligne ».
3. Partager → Sur l’écran d’accueil → Ajouter. Activez « Ouvrir comme app web » si proposé.
4. Ouvrez ensuite Lyon 100 par son icône.
5. Pour récupérer vos données Mac : exportez le JSON, copiez-le dans Fichiers sur iPhone, puis restaurez-le dans la PWA.

Le shell et le réseau sont précachés ; activités et progression restent locales. Le fond cartographique nécessite Internet et peut être masqué. Les tuiles OSM ne sont pas téléchargées en masse. Une mise à jour propose un bouton et ne doit pas être acceptée pendant un import.

## Pour poursuivre le projet

- `AGENTS.md` : décisions produit durables.
- `ROADMAP.md` : V1, V1.5, V2, V3 et exclusions.
- `VALIDATION.md` : contrôles réellement réalisés et recette restante.
- `src/gpx` : normalisation, matching et Worker ; `src/db` : stockage/migration/sauvegardes ; `src/stats` : unions et progression ; `src/map` : carte ; `scripts` : préparation OSM et mesures.

## Dépôt GitHub et Netlify

Dépôt public avec l’accord d’Arthur : https://github.com/royal-kebab-tacos/lyon-100. Relier le projet Netlify existant, branche main. La configuration netlify.toml définit Node 24, la commande npm run check et le dossier publié dist. Les tests doivent réussir avant chaque déploiement. Aucun compte, historique GPX ou JSON personnel ne doit être ajouté au dépôt.

Les fichiers OSM volumineux sont compressés et répartis dans data/bundled. Après npm ci, ils sont reconstitués automatiquement et leur SHA-256 est vérifié. Le réseau est identique à la version 1.1.2 validée. Après une modification volontaire des données avec npm run prepare, exécuter node scripts/bundle-data.mjs avant de publier le commit, avec public/data/provenance.json. Ne pas éditer les morceaux manuellement.

## Nouveautés 1.2.0

Dans **Réglages → Apparence**, choisissez Clair, Sombre ou Système. Le choix est mémorisé sur cet appareil. Le fond de carte conserve ses couleurs ; vous pouvez le masquer avec le bouton existant. La sauvegarde JSON transfère vos activités et corrections, pas cette préférence d’affichage.

Dans **Progression**, consultez les jalons 25/50/75/100 % de Lyon et des neuf arrondissements, l’arrondissement le plus avancé et celui qui a le moins de kilomètres à parcourir avant 100 %. Une rue terminée à 95 % ne crédite pas les mètres manquants. Les voies sans nom comptent toujours dans les kilomètres.

Après publication Netlify, acceptez la mise à jour proposée par Lyon 100. Vérifiez dans Réglages que la version indique **1.2.0**. Vos sorties n’ont pas besoin d’être réimportées.

## Nouveautés 1.3.0 : votre historique

Dans **Progression**, choisissez Tout Lyon ou un arrondissement. Sous les cartes de progression, **Votre progression dans le temps** affiche une courbe et un tableau. Basculez entre **Par semaine** et **Par mois** ; utilisez le bouton des périodes plus anciennes pour remonter votre historique. Les encadrés **Cette semaine** et **Ce mois-ci** indiquent les kilomètres uniques nouvellement découverts.

Vos sorties déjà importées suffisent : aucun réimport n’est nécessaire. Une rue parcourue plusieurs fois compte à son premier passage dans l’ordre des dates de sortie. Une sortie sans date utilise sa date d’import, avec un message explicatif. Les semaines commencent le lundi, selon l’heure de Lyon. Les périodes sans nouvelles rues affichent zéro.

Cet historique provient du calcul automatique des sorties. Les validations/retraits manuels n’y sont pas antidatés ; les voies exclues aujourd’hui sont retirées de toutes les périodes. Le total peut donc différer de la progression actuelle corrigée. Supprimer une sortie recalcule les périodes passées. Le réseau actuel sert de référence pour toutes les dates.

Le calcul reste sur votre appareil et fonctionne hors ligne après chargement complet de cette version. La sauvegarde JSON existante suffit pour retrouver l’historique sur un autre appareil. Vérifiez **Application : 1.3.0** dans Réglages après publication.

## Nouveautés 1.4.0 : vérifier une sortie

Dans **Activités**, touchez **Vérifier le GPS** sur une sortie. Le panneau **À vérifier** analyse uniquement cette sortie ; aucun réimport n’est nécessaire et la progression ne change pas pendant l’analyse.

Pour une suggestion, choisissez **Comparer sur la carte** : la portion concernée est bleue, votre trace GPS orange. Vous pouvez corriger depuis la fiche sur la carte, ou revenir dans Activités :

- **Je l’ai parcourue** / **Je ne l’ai pas parcourue** : correction de la portion entière, pour toutes vos sorties, après confirmation.
- **Ignorer** : masque cette suggestion sans changer vos kilomètres ; **Réafficher les portions ignorées** permet de revenir dessus.
- Pour annuler une correction : touchez la portion sur la carte, puis **Revenir au calcul automatique**.

La première version repère des voies parallèles plausibles et des décalages soutenus juste au-delà des 15 m de tolérance. Ce sont des indices, pas des erreurs certaines. Une liste vide ne garantit pas l’exactitude complète d’une sortie. Maximum 500 suggestions par sortie, avec affichage progressif par 20.

Les choix ignorés sont conservés sur cet appareil et inclus dans les nouvelles sauvegardes JSON. Pour les transférer, utilisez Lyon 100 1.4.0 ou une version ultérieure sur l’autre appareil. Vos anciennes sauvegardes restent utilisables ; elles ne contiennent simplement pas ces choix. Les diagnostics ne quittent pas votre appareil et restent utilisables hors ligne après téléchargement complet de la version.

## Nouveautés 1.5.0 : carte allégée et onglet À vérifier

La dernière mise à jour ajoutait la recherche des portions GPS incertaines, mais elle se trouvait dans les activités. Touchez maintenant directement **À vérifier**, puis choisissez une sortie. Vous pouvez comparer chaque suggestion à sa trace GPS et décider ; rien n'est ajouté automatiquement à votre progression. Ce premier diagnostic cherche les voies parallèles et les décalages GPS soutenus, pas tous les trous possibles.

La carte prépare uniquement les rues proches de la zone affichée et réutilise leurs géométries. Choisir une portion ne reconstruit plus tout le réseau. Vos kilomètres, corrections et sauvegardes ne changent pas. Le premier affichage de Lyon entier peut encore demander un peu de temps ; le fond de carte dépend aussi de la connexion.

Après la mise à jour, vérifiez **1.5.0** dans Réglages, puis zoomez sur votre quartier, déplacez la carte et essayez les filtres. Testez aussi **À vérifier** sur une sortie connue. Il n'est pas nécessaire de supprimer l'application ou de restaurer vos données pour cette mise à jour.

La prochaine priorité sera l'exploration près d'un point choisi, puis les boucles et l'export GPX après préparation d'un réseau de navigation fiable. Cette fonction n'attendra pas la connexion automatique à Strava. L'import de vos propres itinéraires dans Strava dépend de ses fonctions payantes ; nous vérifierons une solution gratuite pour suivre le GPX sur iPhone. Les autres demandes sont conservées dans ROADMAP.md.

## Nouveautés 1.6.0 : moins de corrections pour les décalages GPS simples

Une trace qui longe une rue depuis un trottoir éloigné peut maintenant être reconnue jusqu'à **25 mètres de son axe**, si elle reste alignée sur au moins **32 mètres**, sans voie concurrente proche. La tolérance habituelle reste de 15 mètres. Cela ne valide pas toute une rue parce que vous la croisez ou passez à proximité. Les petits traits restent une unité de dessin, pas une obligation de les vérifier un par un.

Au premier démarrage de cette version, laissez l'application terminer le recalcul de vos anciennes sorties. Aucun réimport GPX nécessaire. Vos corrections restent prioritaires ; une copie de récupération locale est conservée lors du recalcul. Exporter une sauvegarde reste conseillé. Les sauvegardes des versions précédentes sont acceptées ; une sauvegarde créée en 1.6.0 nécessite cette version ou une version compatible sur l'autre appareil.

Dans « À vérifier », les décalages déjà entièrement résolus par le calcul ne sont plus proposés. Les vraies ambiguïtés entre voies proches restent disponibles, sans obligation de les traiter.

Cette version ne fusionne pas automatiquement deux chaussées parallèles d'une avenue ni un quai bas avec la rue au-dessus. Le GPS ne suffit pas toujours pour les distinguer. Le regroupement des représentations d'une même rue reste une amélioration séparée à tester ; cette marge ne garantit pas la correction de chaque trou visible sur les captures.

## Nouveautés 1.7.0 : raccorder les petits trous

La version 1.6.0 améliorait les décalages latéraux. La 1.7.0 traite un autre cas : un petit morceau manquant **entre deux passages déjà reconnus pendant la même sortie**.

L'application peut reconnaître automatiquement le raccordement si un seul chemin réel et cohérent avec votre GPS relie les deux passages. La liaison est limitée à 40 mètres. Cela fonctionne aussi pour des chemins sans nom qui se suivent réellement. Deux chemins simplement proches ou plusieurs chemins possibles ne sont pas fusionnés automatiquement. Un changement de nom n’est accepté dans ce raccordement que si une traversée piétonne explicite relie réellement les voies.

Les anciennes sorties sont recalculées au premier lancement ; laissez ce calcul se terminer. Aucun réimport nécessaire. Les corrections restent prioritaires, les anciennes sauvegardes sont acceptées. Utilisez la même version récente sur Mac et iPhone pour échanger vos sauvegardes.

Cela ne garantit pas la disparition de tous les trous : une connexion absente du réseau ou une ambiguïté réelle peut rester visible. Les captures seules ne permettent pas de reconstituer les points GPS qui ont produit le résultat. L'onglet À vérifier reste facultatif.

La 1.7.0 rétablit également les passages piétons publics nécessaires pour relier les rues. Ils étaient auparavant retirés des données de progression, ce qui pouvait laisser des trous même avec un GPS correct. Ils apparaissent en vert lorsqu'ils sont reconnus dans votre sortie, **sans ajouter des kilomètres à votre objectif**. Un cas identifié est la traversée d'environ 7,5 m à l'entrée du pont Gallieni.


## Nouveauté 1.8.0 : explorer autour d’un point

Dans Carte, utilisez **Autour d’un point → Choisir sur la carte**, puis touchez un lieu. Un cercle indique le rayon choisi : 250 m, 500 m, 1 km ou 2 km. Le panneau affiche les kilomètres encore à découvrir dans ce cercle, le nombre de noms de rues concernés et les dix plus proches. **Voir** zoome sur une portion locale de la rue. Les voies sans nom sont comptées séparément dans les mètres. Le filtre d’arrondissement et vos corrections s’appliquent.

Les distances sont à vol d’oiseau, pas des itinéraires à pied. La liste inclut les petits restes de rues au statut « Terminée ». Le point n’est pas enregistré dans les sauvegardes et disparaît en quittant la carte. Vous pouvez le déplacer, annuler le choix ou l’effacer. Aucun réimport ou recalcul des activités n’est requis. Les boucles et l’export GPX sont disponibles depuis la version 1.9.0 (voir ci-dessous).

## Historique technique : préparation après 1.8.0

Le placement du point reste disponible. Ce lot prépare le moteur de chemins, sans ajouter encore de bouton de génération et sans changer le numéro 1.8.0 de l’interface. Les activités, le réseau de progression et les sauvegardes restent indépendants du routage.

Pour travailler sur le moteur (développement uniquement) :

1. Télécharger l’extrait public `https://download.bbbike.org/osm/bbbike/Lyon/Lyon.osm.pbf` dans `.osm-cache/routing-source.osm.pbf`. Le téléchargement est manuel et séparé de l’installation/build de l’application.
2. Installer Python et pyosmium dans un environnement de préparation (`python3 -m pip install osmium`).
3. Exécuter `python3 scripts/extract-routing-pbf.py .osm-cache/routing-source.osm.pbf .osm-cache/routing-source.json.gz`.
4. Exécuter `npm run routing:prepare -- .osm-cache/routing-source.json.gz`, puis `npm run routing:benchmark`.

Les fichiers générés sont dans `.osm-cache/`, pas dans le site ni dans les sauvegardes. L’extracteur refuse un PBF incomplet avant de remplacer une archive existante. L’ancien fichier du score peut servir à mesurer la topologie via `npm run routing:prepare`, mais son absence de tags de nœuds/restrictions interdit l’usage normal du moteur de routage. Les mesures de benchmark ne sont pas des consignes de navigation.

Références du profil OSM : [accès](https://wiki.openstreetmap.org/wiki/Key:access), [sens piétons](https://wiki.openstreetmap.org/wiki/Key:oneway:foot), [barrières](https://wiki.openstreetmap.org/wiki/Barriers). Les règles retenues sont volontairement conservatrices, sans garantie d’exhaustivité ni d’accessibilité réelle.

## Historique technique : prototype de boucles

Après préparation du graphe : `npm run routing:loops` prépare les correspondances avec le réseau de progression, puis essaie des boucles 5/8/10/15 km avec un départ de test près d’un repère public. La couverture est vide par défaut ; pour un diagnostic local seulement, un chemin de sauvegarde peut être fourni en argument. Les sorties personnalisées restent dans `.osm-cache/` et ne doivent pas être publiées.

Ce prototype privilégie des portions restantes identifiées sans compter deux fois un passage. Il compare au maximum 24 combinaisons avec un budget commun ; il peut retourner moins de trois propositions, voire aucune. Les distances peuvent s’écarter de ±20 % de la demande. Les nouvelles portions sont des estimations conservatrices : une partie des axes du score n’est pas associée aux cheminements du réseau piéton. Aucun gain n’est enregistré tant qu’une activité réellement effectuée n’est pas importée.

Le moteur et son Worker ne sont pas encore exposés dans l’application. Le prochain lot doit intégrer le chargement des données, le choix du départ, l’annulation, l’affichage puis l’export GPX. Aucun changement visible ni nouvelle version de l’interface dans ce lot.


## Nouveauté 1.9.0 : préparer une boucle et emporter son GPX

1. Dans **Carte → Autour d’un point**, choisissez un lieu sur la carte.
2. Dans **Préparer une boucle**, choisissez 5, 8, 10 ou 15 km puis **Trouver un départ proche**. Le premier chargement nécessite une connexion. Le départ violet est un point du réseau piéton, situé au maximum à 200 m à vol d’oiseau ; le trajet pour le rejoindre n’est pas inclus.
3. Vérifiez son emplacement puis cliquez sur **Générer depuis ce départ**. Jusqu’à trois propositions affichent leur distance, les nouveaux kilomètres estimés et les repassages. Le filtre d’arrondissement privilégie les nouveaux mètres dans cette zone ; la boucle peut en sortir.
4. **Voir sur la carte** affiche la boucle en violet. **Exporter le GPX** permet de partager le fichier si le navigateur le propose, sinon de le télécharger. Sur iPhone, utilisez Fichiers ou une application compatible GPX. L’import direct dans Strava ou Plans n’est pas garanti.

Vous pouvez annuler le chargement ou le calcul. Changer le point, la distance ou la progression efface les anciens parcours. Les calculs se font sur votre appareil et ne valident aucun kilomètre : seules les activités réellement importées et vos corrections modifient la progression. Aucun recalcul de vos anciennes activités ni changement du format de sauvegarde pour cette version.

Ces propositions sont expérimentales : distance à ±20 %, calcul borné, parfois moins de trois résultats ou aucun. Les gains sont prudents car environ 66 % du réseau de progression est associé strictement aux cheminements de routage. Vérifiez les accès sur place. L’utilisation réelle sur iPhone et l’ouverture du GPX dans une application de guidage restent à confirmer.

Les données de parcours sont téléchargées seulement à la demande, puis conservées dans le cache si le navigateur le permet. Elles peuvent ensuite être réutilisées hors connexion ; l’appareil peut toutefois effacer ce cache. Le fond de carte reste soumis à sa connexion habituelle. Cela limite les téléchargements répétés et la consommation Netlify.

### Préparation reproductible des données

`npm ci` reconstruit les fichiers nécessaires à partir des archives publiques présentes dans le dépôt. Le patch compressé `data/routing/` conserve les changements OSM, tags de nœuds et restrictions nécessaires, avec provenance et SHA-256. Il est appliqué séparément de la source de progression. Aucun Python ni téléchargement Overpass/PBF n’est nécessaire à l’installation ou au déploiement. La première préparation peut prendre environ une minute ; les suivantes vérifient le cache. Les parties `public/routing/` et le manifeste généré ne sont pas versionnés et ne sont pas préchargés par la PWA.

Pour les 128 crédits annoncés jusqu’au 25 novembre, cette version regroupe les changements en une seule publication de production. Les essais se font localement et sur la branche de développement, avant la mise à jour de `main`.


## En préparation : quadriller les rues proches et limiter les côtes

Dans Préparer une boucle, choisissez **Autour du point** pour privilégier le cercle bleu, ou un **arrondissement** pour explorer sa zone. Le choix d’un arrondissement affiche sa limite et zoome sur elle : placez ensuite le départ souhaité sur la carte.

Le générateur enchaîne des portions voisines encore à découvrir. Il accepte de courts repassages et évite autant que possible les longues liaisons répétées. Il reste majoritairement dans la zone ; de petits débordements sont permis. Si une distance n’est pas pertinente dans ce secteur, il peut proposer plus court au lieu d’ajouter des kilomètres. Les propositions restent des heuristiques, pas une promesse de couvrir toutes les rues ni d’être optimales.

**Limiter les côtes**, actif par défaut, intervient pendant le calcul. Chaque proposition affiche le D+ (somme estimée des montées), le D− et le profil. Les altitudes proviennent de l’IGN RGE ALTI, échantillonnées sur le réseau public et préparées à l’avance. Aucun appel à l’IGN ni envoi de votre point ou de vos activités au moment de générer. Les altitudes sont chargées et conservées avec les autres données de parcours. Les ponts et tunnels restent inconnus lorsque l’altitude du terrain ne représente pas le passage ; le pourcentage renseigné et les interruptions du profil l’indiquent.

Les données IGN sont sous [Licence Ouverte 2.0](https://www.data.gouv.fr/datasets/rge-alti-r) ; [documentation du service altimétrique](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/). L’archive publique de 131 328 points est vérifiée par SHA-256. L’installation et le build n’appellent pas le service : ils utilisent les parties compressées présentes dans le dépôt. Pour renouveler ces données en développement : `node --import tsx scripts/elevation-points.ts`, puis `python scripts/fetch-elevation.py` et `python scripts/pack-elevation.py`.

Cette version de travail conserve le format des sauvegardes et les résultats de matching. Aucun nouveau déploiement de production pour ce lot préparatoire.
