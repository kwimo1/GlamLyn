# Glam Lyn

Web app phone-first en français pour un centre de beauté local:

- accueil éditorial blanc/or
- tunnel de réservation multi-services
- compte client par téléphone + code SMS
- dashboard admin
- avis site + extraits Google
- section reels Instagram gérée par l’admin
- notifications SMS avec fallback mock

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- stockage local JSON pour la démo: `data/mock-db.json`
- schéma Supabase cible: [`supabase/schema.sql`](./supabase/schema.sql)

## Lancer le projet

1. Copier `.env.example` vers `.env.local`
2. Installer si besoin: `npm install`
3. Lancer: `npm run dev`
4. Ouvrir `http://localhost:3000`

## Identifiants de démo

- Admin: `owner-glamlyn`
- Mot de passe: `GlamLyn2026!`

Pour la connexion cliente, si aucun fournisseur SMS n’est configuré, le code OTP de démonstration est affiché dans l’interface après demande.

## Commandes utiles

- `npm run dev`
- `npm run lint`
- `npm run build`

## Notes d’implémentation

- Les pages publiques et la réservation sont optimisées d’abord pour mobile.
- Les uploads admin sont stockés localement dans `data/uploads` et servis par `/api/media/[id]`.
- Les SMS passent par Twilio si les variables sont renseignées; sinon ils sont mockés et visibles dans le dashboard admin.
- Les exports CSV sont disponibles depuis l’admin via:
  - `/api/exports/bookings`
  - `/api/exports/clients`

## Passage à Supabase

Le projet fonctionne aujourd’hui en mode démo local avec stockage fichier. Pour une mise en production:

1. créer les tables via [`supabase/schema.sql`](./supabase/schema.sql)
2. migrer `lib/mock-db.ts` vers un repository Supabase
3. stocker les médias dans Supabase Storage
4. remplacer le realtime local/par rafraîchissement par Supabase Realtime
5. brancher les vraies clés SMS
