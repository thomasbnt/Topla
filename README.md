# Topla

![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-v7-BC52EE?logo=astro&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-fr%20%7C%20en-3E7BFA)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-ready-F38020?logo=cloudflare&logoColor=white)

Boîte à outils pour animer vos parties de jeux de société. Installable comme application (PWA), fonctionne entièrement hors ligne.

![Écran d'accueil de Topla](public/screenshots/accueil.png)

## Outils

- **Petit Bac** — tire une lettre de l'alphabet au hasard (jamais deux fois la même d'affilée), avec historique des lettres tirées.
- **Chiffre aléatoire** — tire un chiffre de 0 à 9.
- **Roulette du doigt** — chaque joueur pose un doigt sur l'écran, un compte à rebours désigne un doigt au hasard parmi ceux posés.
- **Équipes aléatoires** — ajoutez des joueurs, choisissez un nombre d'équipes, répartition équilibrée aléatoire.
- **Score / Compteur** — un compteur de points par joueur (+1/-1, +5 en appui long), classement en temps réel avec podium.
- **Dés** — de 1 à 6 dés, lancer au tap ou en secouant le téléphone.
- **Sablier** — décompte avec presets rapides ou durée personnalisée, vibration et son à la fin.
- **Pile ou face** — lancer de pièce classique.

Les joueurs, équipes et scores sont sauvegardés sur l'appareil (localStorage) pour reprendre une partie interrompue. Un écran **Paramètres** (discret, en bas de l'accueil) permet de voir l'espace utilisé et de tout effacer.

## Langues

Français (`/...`) et anglais (`/en/...`), routing i18n natif d'Astro
(`defaultLocale: "fr"`, pas de préfixe pour le français). URLs anglaises
traduites (`/lettre` → `/en/letter`, `/des` → `/en/dice`, `/sablier` →
`/en/timer`, …) via une table de correspondance dans `src/i18n/translations.js`
(export `slugs`), aussi utilisée pour générer les `hreflang` du sitemap
(appariement manuel, `@astrojs/sitemap` ne sait pas apparier des slugs
différents automatiquement) et pour la redirection langue.

Au tout premier chargement, la langue du navigateur est détectée une seule
fois (redirection vers l'équivalent `/en/...` si `navigator.language`
commence par `en`) puis mémorisée en `localStorage` — plus aucune
redirection automatique ensuite, y compris après un choix manuel via le
sélecteur FR/EN dans Paramètres. Toutes les chaînes (pages `.astro` et
scripts vanilla `public/js/*.js`) viennent d'une source unique :
`src/i18n/translations.js` (export `translations`).

## Installer l'application

Ouvrez l'app dans un navigateur mobile (Chrome, Safari...) puis :

- **Android / Chrome** : menu → "Ajouter à l'écran d'accueil" (ou bannière d'installation automatique).
- **iOS / Safari** : bouton Partager → "Sur l'écran d'accueil".

Une fois installée, un appui long sur l'icône propose des raccourcis directs vers Petit Bac, Roulette, Score et Dés.

## Stack technique

[Astro](https://astro.build/) v7 en sortie statique (`output: "static"`), adaptateur
[`@astrojs/cloudflare`](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
pour un déploiement Workers. Aucun framework UI, aucune police ou CDN externe
(uniquement les polices système). Icônes inline au format [Lucide](https://lucide.dev/).
Site multi-page : chaque outil est une route Astro autonome (pas de routeur
côté client, navigation par vraies URLs).

```
astro.config.mjs        output: "static", build.format: "file", adaptateur cloudflare, i18n fr/en
wrangler.jsonc           config Cloudflare Workers (assets.directory: ./dist/client, build.command)
src/
  i18n/translations.js    dictionnaire fr/en (textes) + table de correspondance des slugs d'URL
  layouts/Layout.astro    <head> commun (meta OG/Twitter, manifest, icônes) + script i18n/détection langue
  components/tools/       un composant par outil (HomeTool, LettreTool, ...), reçoit lang="fr"|"en"
  pages/
    index.astro, lettre.astro, ...          wrappers fr (racine, sans préfixe, slugs fr)
    en/index.astro, en/letter.astro, ...    wrappers en (mêmes composants, lang="en", slugs en)
public/                   copié tel quel dans dist/ au build (pas de hash de fichier,
                          requis pour que sw.js précache des noms stables)
  manifest.json          manifeste PWA (icônes, shortcuts, screenshots)
  sw.js                  service worker (cache-first + revalidation réseau, précache fr + en)
  _headers               cache-control (sw.js toujours revalidé)
  css/style.css
  js/
    app.js               bootstrap partagé (service worker, salutation, bouton installer)
    modal.js             modal de confirmation réutilisable
    lettre.js, chiffre.js, roulette.js, equipes.js,
    score.js, des.js, sablier.js, pile-face.js, parametres.js
  icons/                 icônes app (192/512 + variantes maskable)
  screenshots/           captures utilisées par le manifeste PWA
scripts/generate-commit-info.js   génère public/js/commit-info.js (affiché dans Paramètres)
```

## Développement local

```
npm install
npm run dev               # astro dev, hot reload
npm run build              # astro build → dist/
npm run preview            # build + wrangler dev sur dist/ (environnement Workers réel)
```

La génération du commit courant (`scripts/generate-commit-info.js`) tourne
automatiquement avant `dev` et `build` (`predev`/`prebuild`). Le build Cloudflare
(configuré via `wrangler.jsonc` → `build.command`) l'exécute aussi en prod.

## Contribuer

Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, …).

## Transparence

Ce projet a été développé avec l'aide d'une IA (Claude Code), par souci de
transparence et pour gagner du temps à faire ce qui compte vraiment : jouer à
nos jeux de société.

## Licence

GPL-3.0, voir [LICENSE](LICENSE).
