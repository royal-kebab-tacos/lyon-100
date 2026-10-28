# Lyon 100 — version 1.1.2

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

Dépôt privé : https://github.com/royal-kebab-tacos/lyon-100. Relier le projet Netlify existant, branche main. La configuration netlify.toml définit Node 24, la commande npm run check et le dossier publié dist. Les tests doivent réussir avant chaque déploiement. Aucun compte, historique GPX ou JSON personnel ne doit être ajouté au dépôt.

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
