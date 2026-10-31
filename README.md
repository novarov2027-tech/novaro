# Novaro, boutique de parfums (React + Express + MongoDB)

```
novaro/
├── server/   API Express + Mongoose (auth JWT, produits, commandes, admin, seed)
└── client/   React + Vite (boutique, panier, comptes, administration)
```

## 1. MongoDB Atlas (gratuit)
1. Créez un compte sur https://www.mongodb.com/cloud/atlas et un cluster **M0 (Free)**.
2. **Database Access** : créez un utilisateur (nom + mot de passe).
3. **Network Access** : ajoutez `0.0.0.0/0` (nécessaire pour Render ; à restreindre plus tard).
4. **Connect > Drivers** : copiez l'URI et ajoutez le nom de la base avant le `?` :
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/novaro?retryWrites=true&w=majority`

## 2. Lancer en local
```bash
cd server
cp .env.example .env        # remplissez MONGODB_URI, JWT_SECRET, OWNER_EMAIL, OWNER_PASSWORD
npm install
npm run seed                # crée le compte propriétaire, les 8 catégories et des produits d'exemple
npm run dev                 # http://localhost:5000

cd ../client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173  (le proxy Vite envoie /api vers le port 5000)
```
- Boutique : `http://localhost:5173`
- Administration : connectez-vous avec `OWNER_EMAIL` / `OWNER_PASSWORD`, puis ouvrez `/admin`.
- Les produits d'exemple sont fictifs (prix inventés) : modifiez-les dans l'admin ou videz la collection `products` avant de relancer `npm run seed`.

## 3. Fonctionnement des commandes et du stock
- Le client doit avoir un compte (téléphone obligatoire) pour commander. Il peut parcourir sans compte.
- **Quand le client confirme** : le stock de chaque produit baisse tout de suite (opération atomique, impossible de vendre plus que le stock). La commande arrive chez le propriétaire avec nom, téléphone, adresse (facultative) et gouvernorat.
- **Le propriétaire** peut appeler / écrire sur WhatsApp, puis **confirmer** ou **annuler**. Une annulation remet le stock ; réactiver une commande annulée le reprend (refusé s'il n'y en a plus assez).
- Historique complet des commandes avec recherche, filtre par statut et chronologie des changements de statut. La liste se rafraîchit toute seule toutes les 15 secondes.

## Catégories et rôles
- **Un seul bouton « Se connecter »** : après connexion, le propriétaire arrive sur l'administration, les clients restent sur la boutique.
- Le propriétaire peut revenir à la boutique avec **« Vue boutique »** (en mode aperçu : pas de panier) et retourner à l'admin avec **« Vue admin »**.
- Onglet **Catégories** : ajouter ou supprimer une catégorie. Les produits d'une catégorie supprimée ne sont pas effacés : ils passent « sans catégorie » et restent visibles dans **Tout**. Ils peuvent être réaffectés dans l'onglet Produits.

## 4. Connexion Google (optionnel)
1. https://console.cloud.google.com > APIs et services > Identifiants > **ID client OAuth** (type *Application Web*).
2. **Origines JavaScript autorisées** : `http://localhost:5173` et l'URL Vercel de production.
3. Mettez le même ID dans `server/.env` (`GOOGLE_CLIENT_ID`) et `client/.env` (`VITE_GOOGLE_CLIENT_ID`).
Sans ID, le bouton Google n'apparaît pas. Un nouveau compte Google doit ensuite saisir son numéro de téléphone.

## 5. Photos produits (optionnel)
Créez un compte gratuit sur https://cloudinary.com et remplissez `CLOUDINARY_*` dans `server/.env`. Sans cela, l'envoi de photo renvoie « Cloudinary non configuré » (le reste fonctionne). Chaque produit peut avoir jusqu'à 6 photos : la première s'affiche sur la carte (recadrée au format 4:5 pour une grille régulière), toutes sont visibles en entier dans la fiche produit. Conseil : photos verticales ou carrées, produit centré, même fond.

## 6. Mise en ligne temporaire (pour montrer au client)
**API sur Render** (https://render.com, Web Service gratuit)
- Root directory : `server` · Build : `npm install` · Start : `npm start`
- Variables : `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (longue chaîne aléatoire), `CLIENT_URL` (URL Vercel), `GOOGLE_CLIENT_ID`, `CLOUDINARY_*`.
- Lancez le seed une fois depuis votre PC (`npm run seed` avec le `.env` pointant vers Atlas).
- Le plan gratuit s'endort après inactivité : ouvrez `https://VOTRE-API.onrender.com/api/health` une minute avant la démonstration.

**Boutique sur Vercel** (https://vercel.com)
- Root directory : `client` · Framework : Vite.
- Dans `client/vercel.json`, remplacez `YOUR-API.onrender.com` par l'adresse Render. Ce « rewrite » fait passer `/api` par le même domaine que la boutique : les cookies de connexion restent du premier parti et fonctionnent sur Safari et mobile. Laissez `VITE_API_URL` vide.
- Ajoutez `VITE_GOOGLE_CLIENT_ID` si vous utilisez Google.

**Alternative : Cloudflare Pages** (gratuit, usage commercial autorisé)
- Le dossier `client/functions/api/[[path]].js` redirige `/api/*` vers l'API Render (même rôle que `vercel.json`).
- Réglages Pages : Root directory `client` · Build `npm run build` · Output `dist`.
- Variables : `API_URL` = adresse Render (sans `/` final), `NODE_VERSION` = `20`, et `VITE_GOOGLE_CLIENT_ID` si Google est utilisé.
- Sur Render, mettez `CLIENT_URL` = adresse `https://xxx.pages.dev`, et ajoutez-la aux origines autorisées de Google.

## Avant la vraie mise en production
- Changer `OWNER_PASSWORD` et `JWT_SECRET`, restreindre l'accès réseau Atlas.
- Ajouter une limitation de requêtes sur `/api/auth/*` (par exemple `express-rate-limit`).
- Remplacer le catalogue d'exemple par les vrais produits et prix.
