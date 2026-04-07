# Glam Lyn

Web app phone-first en français pour un centre de beauté local :

- accueil éditorial blanc/or
- tunnel de réservation multi-services
- compte client par lien magique e-mail
- tableau de bord admin
- avis site + extraits Google
- section reels Instagram gérée par l’admin
- notifications e-mail via Resend
- persistance réelle via Supabase Postgres + Storage

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Auth, Postgres, Realtime et Storage
- Resend pour les e-mails transactionnels

## Lancer le projet

1. Copier `.env.example` vers `.env.local`
2. Renseigner les variables Supabase, Resend, `SESSION_SECRET` et `CRON_SECRET`
3. Installer si besoin: `npm install`
4. Créer le schéma Supabase avec [`supabase/schema.sql`](./supabase/schema.sql)
5. Lancer: `npm run dev`
6. Ouvrir `http://localhost:3000`

## Identifiants de démonstration

- Admin: `owner-glamlyn`
- Mot de passe: `GlamLyn2026!`

## Commandes utiles

- `npm run dev`
- `npm run lint`
- `npm run build`

## Notes d’implémentation

- Les pages publiques et la réservation sont optimisées d’abord pour mobile.
- Les médias uploadés par l’admin sont stockés dans `Supabase Storage`.
- Les confirmations, rappels, annulations, reports et demandes d’avis passent par e-mail.
- La tâche cron Vercel appelle `/api/cron/notifications` chaque heure.
- Les exports CSV sont disponibles depuis l’admin via :
  - `/api/exports/bookings`
  - `/api/exports/clients`
