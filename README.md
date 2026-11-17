# Abonix

Site vitrine de produits digitaux pour la Tunisie : catalogue public, commande **uniquement via WhatsApp** (aucun paiement en ligne), prix en dinars tunisiens (TND), et administration complète sur `/admin`.

- **Stack** : Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, PostgreSQL, **Drizzle ORM**, Zod, React Hook Form.
- **Langue** : français. **Devise** : TND, stockée en entiers (millimes : 1 TND = 1000) pour éviter toute erreur d'arrondi.

> **Écart par rapport au cahier des charges** : le cahier prévoyait Prisma. Les binaires de Prisma n'étaient pas téléchargeables dans l'environnement de développement, donc rien n'aurait pu être exécuté ni vérifié. Le projet utilise **Drizzle ORM** (même rôle : schéma typé, migrations SQL versionnées dans `drizzle/`, requêtes typées).

## Fonctionnement de la commande

1. Le visiteur choisit un produit (et une offre, s'il y en a) puis clique sur **Commander via WhatsApp**.
2. Le serveur **recalcule** nom, prix et disponibilité depuis la base (le navigateur n'envoie que des identifiants et une quantité), enregistre une *demande* au statut « Demande initiée » (désactivable dans Réglages) et renvoie un lien `https://wa.me/<numéro>?text=…`.
3. WhatsApp s'ouvre avec un message prérempli. **Rien n'est confirmé** tant que votre équipe n'a pas répondu : le statut ne change que par une action manuelle dans `/admin/commandes`.

Le site ne collecte aucune coordonnée du client.

## Démarrage local

Prérequis : Node.js 22+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # Windows : copy .env.example .env
# éditez .env : au minimum DATABASE_URL
createdb abonix               # ou créez la base avec pgAdmin / psql

npm run db:migrate            # applique les migrations (dossier ./drizzle)
npm run db:seed               # réglages, pages, FAQ + catalogue de démonstration
npm run admin:create          # crée le premier administrateur (mot de passe saisi de façon masquée)
npm run dev                   # http://localhost:3000  — admin : http://localhost:3000/admin
```

- `npm run db:seed:base` : contenu de base **sans** produits de démonstration (recommandé en production). Les produits de démo ont une référence `DEMO-…` et un nom terminé par « (démo) ».
- Le seed est idempotent : le relancer ne duplique rien et n'écrase pas vos modifications.
- Il n'existe **aucun mot de passe par défaut** et aucune inscription publique. Pour créer un admin sans interaction : `ADMIN_EMAIL=moi@exemple.tn ADMIN_NAME="Nom" ADMIN_PASSWORD='…' npm run admin:create` (relancer la commande avec le même e-mail change son mot de passe). 12 caractères minimum.

## Variables d'environnement

Voir `.env.example`, commenté.

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Connexion PostgreSQL |
| `APP_URL` | recommandé | URL publique. En `https://`, le cookie de session devient `__Host-…` + `Secure`. Sert aussi aux liens de produit et au sitemap |
| `WHATSAPP_NUMBER` | non | Numéro par défaut (chiffres, indicatif inclus, sans `+`). Surchargé ensuite par Admin → Réglages |
| `HASH_SALT` | **oui en production** | 24 caractères minimum (`openssl rand -base64 32`). Sert à hacher les adresses IP pour la limitation de débit |
| `STORAGE_PROVIDER` | non | `local` (défaut) ou `cloudinary` |
| `UPLOAD_DIR` | non | Dossier des images en mode `local` (défaut `./storage/uploads`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | si `cloudinary` | Compte Cloudinary |

L'application refuse de démarrer avec une configuration invalide et nomme les variables fautives, sans afficher leurs valeurs.

## Images

Chaque téléversement est **vérifié sur son contenu réel** (le type MIME envoyé par le navigateur n'est pas fiable), puis ré-encodé en WebP (2000 px maximum, métadonnées supprimées) sous un nom aléatoire. JPEG, PNG, WebP, AVIF jusqu'à 5 Mo. Les SVG sont refusés.

- **Local** : fichiers sur disque, servis par `/uploads/…`. Il faut un disque **persistant** (VPS, volume Docker). Ne convient pas à Vercel.
- **Cloudinary** : recommandé sur Vercel. Les appels sont signés côté serveur ; le secret n'est jamais envoyé au navigateur.
- `npm run media:cleanup` liste les images locales orphelines de plus de 24 h ; `-- --apply` les supprime.

## Tests et vérifications

```bash
npm run typecheck
npm run lint
npm test                       # vitest : unitaires + intégration sur la base `abonix_test` (créée automatiquement)
npm run build
npm run test:e2e               # Playwright sur le build de production, base dédiée `abonix_e2e` (recréée à chaque lancement)
```

- Les tests refusent de s'exécuter sur une base dont le nom ne finit pas par `_test` / `_e2e` : ils ne touchent jamais à vos données.
- `test:e2e` exige un `npm run build` préalable et un Chromium disponible (`npx playwright install chromium`, ou `PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chrome`).
- Couverture : filtres et tri du catalogue, fiche produit, offres et validation des prix, message et lien WhatsApp, produits indisponibles, création de demande, entrées invalides, limitation de débit, authentification (jetons de session, verrouillage après échecs), refus de toute action d'administration sans session, CRUD produits/catégories, validation des images, route de téléversement (session, même origine, faux fichiers), parcours client (desktop + mobile) et parcours admin complet.

## Sécurité (résumé)

- Mots de passe hachés en **Argon2id**. Sessions côté serveur : le cookie contient un jeton aléatoire, la base ne stocke que son empreinte SHA-256 ; durée glissante de 7 jours ; `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS. Déconnexion des autres appareils au changement de mot de passe.
- Limitation de débit stockée en base (valable avec plusieurs instances) : connexion, demandes WhatsApp, téléversements, changement de mot de passe. Message de connexion identique que l'e-mail existe ou non.
- Chaque Server Action et chaque route d'administration revérifie la session **côté serveur** ; la redirection du proxy n'est qu'un confort. Le téléversement vérifie aussi l'origine de la requête.
- Contenu : aucun HTML brut (Markdown seulement, sans HTML), liens validés (`https`, chemins relatifs), icônes en liste blanche.
- En-têtes : CSP avec nonce et `strict-dynamic`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. `/admin` est en `noindex` et exclu du sitemap.
- Les erreurs inattendues sont journalisées côté serveur et jamais détaillées au navigateur.
- `npm audit --omit=dev` : 0 vulnérabilité au moment de la livraison. Des avis restent sur des **outils de développement** (esbuild embarqué dans `drizzle-kit`, `braces`) : ils n'existent pas en production.

## Choix d'architecture

- Les pages sont rendues **dynamiquement** (données toujours fraîches après une modification dans l'admin) ; la CSP à nonce l'impose de toute façon. Un cache peut être ajouté plus tard si le trafic le justifie.
- Authentification maison (sessions en base) plutôt qu'une bibliothèque : un seul rôle administrateur, aucune inscription, surface réduite et entièrement testée.
- Une demande conserve des **instantanés** (nom, référence, offre, prix) : modifier ou supprimer le produit ensuite ne change pas l'historique.

## Déploiement

### Option A : Vercel + Neon

1. Créez une base **Neon** et copiez l'URL de connexion (`?sslmode=require`).
2. Créez un compte **Cloudinary** (images : `STORAGE_PROVIDER=cloudinary`, le disque de Vercel est éphémère).
3. Importez le dépôt dans Vercel ; renseignez `DATABASE_URL`, `APP_URL` (`https://votre-domaine`), `HASH_SALT`, `WHATSAPP_NUMBER`, `STORAGE_PROVIDER` et les variables Cloudinary.
4. Depuis votre poste, avec `DATABASE_URL` pointant vers Neon : `npm run db:migrate`, `npm run db:seed:base`, `npm run admin:create`.
5. Déployez, ouvrez `/admin`, vérifiez le numéro WhatsApp dans Réglages et relisez les pages légales.

### Option B : VPS avec Docker

1. Copiez le projet sur le serveur, `cp .env.example .env`, renseignez `POSTGRES_PASSWORD`, `APP_URL` (https), `HASH_SALT`.
2. `docker compose up -d --build` (les migrations s'appliquent au démarrage).
3. `docker compose exec app npm run db:seed:base` puis `docker compose exec app npm run admin:create`.
4. Placez un reverse proxy HTTPS (Caddy ou Nginx) devant le port 3000 ; les images sont dans le volume `uploads`.

> Le `Dockerfile` et le `docker-compose.yml` n'ont **pas** été exécutés dans l'environnement de développement : testez-les avant la mise en production.

### Liste de contrôle avant mise en ligne

- [ ] `HASH_SALT` et `APP_URL` (https) définis ; mot de passe de base solide
- [ ] Migrations appliquées, `db:seed:base` (pas de produits de démo), premier admin créé
- [ ] Numéro WhatsApp vérifié dans Admin → Réglages (envoyez-vous une commande test)
- [ ] **Pages légales** (confidentialité, conditions) relues et adaptées par un professionnel, puis marquées « validées » : les textes fournis sont des modèles
- [ ] Vrais produits, images et prix saisis ; produits de démo supprimés
- [ ] HTTPS actif, sauvegardes PostgreSQL planifiées
- [ ] Domaine renseigné dans `APP_URL` (sitemap et liens de partage)

## Structure

```
src/app/(public)/      pages publiques       src/app/admin/        administration
src/server/services/   logique métier        src/server/actions/   Server Actions (toutes protégées)
src/server/db/         schéma Drizzle        src/server/auth/      sessions, mots de passe
src/server/storage/    images (local, Cloudinary)
src/lib/validation/    schémas Zod partagés  drizzle/              migrations SQL
scripts/               migrate, seed, create-admin, cleanup-media
tests/  e2e/           vitest / Playwright
```
