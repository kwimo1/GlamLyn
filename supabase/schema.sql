create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists service_categories (
  id text primary key,
  label text not null,
  description text not null
);

create table if not exists services (
  id text primary key,
  category_id text not null references service_categories(id),
  name text not null,
  description text not null default '',
  price_dzd integer not null,
  duration_minutes integer not null,
  active boolean not null default true,
  featured boolean not null default false,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_profiles (
  id text primary key default ('customer_' || gen_random_uuid()::text),
  auth_user_id uuid unique,
  name text not null,
  phone text unique,
  email text unique,
  points integer not null default 0,
  has_account boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  display_name text not null,
  active boolean not null default true,
  last_login_at timestamptz
);

create table if not exists bookings (
  id text primary key default ('booking_' || gen_random_uuid()::text),
  customer_id text not null references customer_profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_price_dzd integer not null,
  total_duration_minutes integer not null,
  status text not null check (status in ('confirmed', 'completed', 'cancelled')),
  source text not null check (source in ('guest', 'account')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_valid check (ends_at > starts_at)
);

create table if not exists booking_services (
  booking_id text not null references bookings(id) on delete cascade,
  service_id text not null references services(id),
  primary key (booking_id, service_id)
);

create table if not exists site_reviews (
  id text primary key default ('review_' || gen_random_uuid()::text),
  customer_id text not null references customer_profiles(id),
  booking_id text not null references bookings(id),
  rating integer not null check (rating between 1 and 5),
  text text not null,
  status text not null check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists google_review_snapshots (
  id text primary key,
  author_name text not null,
  rating integer not null,
  text text not null,
  relative_time_description text not null,
  created_at timestamptz not null default now()
);

create table if not exists instagram_reels (
  id text primary key,
  title text not null,
  caption text not null,
  cover_asset_id text,
  reel_url text not null,
  external_cover_url text,
  published boolean not null default true,
  display_order integer not null default 1
);

create table if not exists media_assets (
  id text primary key,
  label text not null,
  alt text not null,
  section text not null check (section in ('hero', 'gallery', 'instagram', 'reviews')),
  src text not null,
  kind text not null check (kind in ('seed', 'upload')),
  mime_type text,
  storage_path text,
  display_order integer not null default 1,
  uploaded_at timestamptz not null default now()
);

create table if not exists business_settings (
  id boolean primary key default true,
  salon_name text not null,
  tagline text not null,
  hero_eyebrow text not null,
  hero_title text not null,
  hero_description text not null,
  announcement text not null,
  phone text not null,
  whatsapp text not null,
  address text not null,
  city text not null,
  timezone text not null,
  booking_lead_hours integer not null default 2,
  self_service_change_hours integer not null default 12,
  loyalty_copy text not null,
  instagram_handle text not null,
  google_place_label text not null,
  closed_dates jsonb not null default '[]'::jsonb,
  opening_hours jsonb not null default '[]'::jsonb,
  constraint business_settings_singleton check (id)
);

create table if not exists notification_logs (
  id text primary key default ('notif_' || gen_random_uuid()::text),
  type text not null,
  channel text not null default 'email',
  recipient text not null,
  subject text not null,
  message text not null,
  status text not null,
  provider text not null,
  booking_id text references bookings(id) on delete cascade,
  customer_id text references customer_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists booking_events (
  id bigint generated always as identity primary key,
  booking_id text not null references bookings(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bookings_customer_id on bookings (customer_id);
create index if not exists idx_bookings_starts_at on bookings (starts_at);
create index if not exists idx_bookings_status on bookings (status);
create index if not exists idx_notification_logs_booking on notification_logs (booking_id, type);

alter table bookings
  drop constraint if exists bookings_no_overlap;

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
  where (status = 'confirmed');

create or replace function public.increment_customer_points(
  p_customer_id text,
  p_points integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update customer_profiles
  set points = points + greatest(p_points, 0),
      updated_at = now()
  where id = p_customer_id;
$$;

create or replace function public.create_booking_with_services(
  p_customer_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_ids text[],
  p_starts_at timestamptz,
  p_notes text,
  p_source text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
  v_total_price integer;
  v_total_duration integer;
  v_booking_id text;
  v_ends_at timestamptz;
begin
  if array_length(p_service_ids, 1) is null then
    raise exception 'Aucun service sélectionné.';
  end if;

  select
    coalesce(sum(price_dzd), 0),
    coalesce(sum(duration_minutes), 0)
  into v_total_price, v_total_duration
  from services
  where id = any(p_service_ids)
    and active = true;

  if v_total_duration = 0 then
    raise exception 'Aucun service sélectionné.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_total_duration);

  if p_customer_id is not null then
    update customer_profiles
    set name = p_customer_name,
        phone = coalesce(nullif(p_customer_phone, ''), phone),
        email = coalesce(nullif(lower(p_customer_email), ''), email),
        updated_at = now()
    where id = p_customer_id
    returning id into v_customer_id;
  elsif nullif(p_customer_phone, '') is not null then
    insert into customer_profiles (name, phone, email)
    values (p_customer_name, p_customer_phone, nullif(lower(p_customer_email), ''))
    on conflict (phone) do update
      set name = excluded.name,
          email = coalesce(excluded.email, customer_profiles.email),
          updated_at = now()
    returning id into v_customer_id;
  else
    insert into customer_profiles (name, email)
    values (p_customer_name, nullif(lower(p_customer_email), ''))
    returning id into v_customer_id;
  end if;

  if v_customer_id is null then
    raise exception 'Cliente introuvable.';
  end if;

  insert into bookings (
    customer_id,
    starts_at,
    ends_at,
    total_price_dzd,
    total_duration_minutes,
    status,
    source,
    notes
  )
  values (
    v_customer_id,
    p_starts_at,
    v_ends_at,
    v_total_price,
    v_total_duration,
    'confirmed',
    p_source,
    nullif(p_notes, '')
  )
  returning id into v_booking_id;

  insert into booking_services (booking_id, service_id)
  select v_booking_id, id
  from services
  where id = any(p_service_ids)
    and active = true;

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Ce créneau vient d''être réservé. Choisissez un autre horaire.';
end;
$$;

create or replace function public.touch_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into booking_events (booking_id, event_type)
  values (new.id, tg_op);
  return new;
end;
$$;

drop trigger if exists bookings_emit_events on bookings;
create trigger bookings_emit_events
after insert or update on bookings
for each row
execute function public.touch_booking_event();

alter table booking_events enable row level security;

drop policy if exists "Public can read booking events" on booking_events;
create policy "Public can read booking events"
on booking_events
for select
to anon, authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('glam-lyn-media', 'glam-lyn-media', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  alter publication supabase_realtime add table booking_events;
exception
  when duplicate_object then null;
end $$;

insert into service_categories (id, label, description)
values
  ('cheveux', 'Cheveux', 'Coupe, coiffage, couleur et soins brillants.'),
  ('beaute_bien_etre', 'Beauté et bien-être', 'Mise en beauté, manucure et moments de détente.')
on conflict (id) do update
set
  label = excluded.label,
  description = excluded.description;

insert into services (
  id,
  category_id,
  name,
  description,
  price_dzd,
  duration_minutes,
  active,
  featured,
  display_order
)
values
  ('service_hair_signature', 'cheveux', 'Brushing signature', 'Mise en forme souple avec finition glossy.', 3500, 45, true, true, 1),
  ('service_hair_color', 'cheveux', 'Couleur racines', 'Retouche propre et brillance homogène.', 6500, 90, true, true, 2),
  ('service_hair_care', 'cheveux', 'Soin profond', 'Nutrition complète pour longueurs sensibilisées.', 4200, 50, true, false, 3),
  ('service_cut_styling', 'cheveux', 'Coupe + brushing', 'Coupe sur mesure avec coiffage final.', 5200, 75, true, true, 4),
  ('service_makeup', 'beaute_bien_etre', 'Maquillage éclat', 'Teint lumineux et regard défini pour vos sorties.', 5500, 60, true, true, 5),
  ('service_manicure', 'beaute_bien_etre', 'Manucure premium', 'Soin des mains complet avec finition nette.', 2800, 35, true, false, 6),
  ('service_pedicure', 'beaute_bien_etre', 'Pédicure spa', 'Rituel douceur pour pieds fatigués.', 3200, 40, true, false, 7),
  ('service_brows', 'beaute_bien_etre', 'Sourcils dessinés', 'Ligne précise et harmonieuse.', 1800, 25, true, false, 8)
on conflict (id) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_dzd = excluded.price_dzd,
  duration_minutes = excluded.duration_minutes,
  active = excluded.active,
  featured = excluded.featured,
  display_order = excluded.display_order,
  updated_at = now();

insert into business_settings (
  id,
  salon_name,
  tagline,
  hero_eyebrow,
  hero_title,
  hero_description,
  announcement,
  phone,
  whatsapp,
  address,
  city,
  timezone,
  booking_lead_hours,
  self_service_change_hours,
  loyalty_copy,
  instagram_handle,
  google_place_label,
  closed_dates,
  opening_hours
)
values (
  true,
  'Glam Lyn',
  'Beauté locale, toucher premium, parcours simple au téléphone.',
  'Centre de beauté à Alger',
  'Le rendez-vous qui fait briller vos cheveux, votre peau et votre journée.',
  'Un parcours rapide, des prestations claires, une confirmation email et une équipe qui garde le planning parfaitement fluide.',
  'Paiement sur place. Compte client facultatif avec points de fidélité à la création du compte puis à chaque réservation terminée.',
  '+213550123456',
  '+213550123456',
  '12 Rue Didouche Mourad, Alger',
  'Alger',
  'Africa/Algiers',
  2,
  12,
  'Créez votre compte et gagnez 1 point maintenant, puis 1 point à chaque réservation.',
  '@glamlynbeauty',
  'Glam Lyn sur Google',
  '[]'::jsonb,
  '[
    {"day":0,"label":"Dimanche","open":null,"close":null},
    {"day":1,"label":"Lundi","open":"09:00","close":"18:00"},
    {"day":2,"label":"Mardi","open":"09:00","close":"18:00"},
    {"day":3,"label":"Mercredi","open":"09:00","close":"18:00"},
    {"day":4,"label":"Jeudi","open":"09:00","close":"18:00"},
    {"day":5,"label":"Vendredi","open":"09:30","close":"18:30"},
    {"day":6,"label":"Samedi","open":"10:00","close":"17:00"}
  ]'::jsonb
)
on conflict (id) do update
set
  salon_name = excluded.salon_name,
  tagline = excluded.tagline,
  hero_eyebrow = excluded.hero_eyebrow,
  hero_title = excluded.hero_title,
  hero_description = excluded.hero_description,
  announcement = excluded.announcement,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  address = excluded.address,
  city = excluded.city,
  timezone = excluded.timezone,
  booking_lead_hours = excluded.booking_lead_hours,
  self_service_change_hours = excluded.self_service_change_hours,
  loyalty_copy = excluded.loyalty_copy,
  instagram_handle = excluded.instagram_handle,
  google_place_label = excluded.google_place_label,
  closed_dates = excluded.closed_dates,
  opening_hours = excluded.opening_hours;

insert into media_assets (
  id,
  label,
  alt,
  section,
  src,
  kind,
  display_order,
  uploaded_at
)
values
  ('media_hero_1', 'Hero salon', 'Ambiance douce et lumineuse du salon Glam Lyn', 'hero', '/placeholders/hero-salon.svg', 'seed', 1, '2026-04-01T10:00:00+01:00'),
  ('media_hero_2', 'Hero detail', 'Détail d''une mise en beauté aux tons ivoire et or', 'hero', '/placeholders/hero-detail.svg', 'seed', 2, '2026-04-01T10:00:00+01:00'),
  ('media_gallery_1', 'Soin premium', 'Mise en scène d''un soin premium Glam Lyn', 'gallery', '/placeholders/gallery-care.svg', 'seed', 1, '2026-04-01T10:00:00+01:00'),
  ('media_gallery_2', 'Beauté mains', 'Visuel d''une finition soignée pour les mains', 'gallery', '/placeholders/gallery-polish.svg', 'seed', 2, '2026-04-01T10:00:00+01:00')
on conflict (id) do update
set
  label = excluded.label,
  alt = excluded.alt,
  section = excluded.section,
  src = excluded.src,
  kind = excluded.kind,
  display_order = excluded.display_order,
  uploaded_at = excluded.uploaded_at;

insert into instagram_reels (
  id,
  title,
  caption,
  reel_url,
  external_cover_url,
  published,
  display_order
)
values
  ('reel_1', 'Brushing glossy', 'Une finition lisse, lumineuse et rapide à vivre sur mobile.', 'https://www.instagram.com/reel/C9GLAMLyn01/', '/placeholders/hero-salon.svg', true, 1),
  ('reel_2', 'Avant / après couleur', 'Un rendu propre et régulier, pensé pour les clientes locales.', 'https://www.instagram.com/reel/C9GLAMLyn02/', '/placeholders/gallery-care.svg', true, 2),
  ('reel_3', 'Routine mains premium', 'Une section gérée par l''admin pour pousser les derniers contenus.', 'https://www.instagram.com/reel/C9GLAMLyn03/', '/placeholders/gallery-polish.svg', true, 3)
on conflict (id) do update
set
  title = excluded.title,
  caption = excluded.caption,
  reel_url = excluded.reel_url,
  external_cover_url = excluded.external_cover_url,
  published = excluded.published,
  display_order = excluded.display_order;

insert into google_review_snapshots (
  id,
  author_name,
  rating,
  text,
  relative_time_description,
  created_at
)
values
  ('google_1', 'Meriem B.', 5, 'Salon très propre, brushing impeccable et accueil très doux.', 'il y a 2 semaines', '2026-03-25T08:00:00+01:00'),
  ('google_2', 'Linda A.', 5, 'Ponctuelles, professionnelles et les prix sont affichés clairement.', 'il y a 1 mois', '2026-03-04T08:00:00+01:00'),
  ('google_3', 'Sara T.', 4, 'Le rappel avant le rendez-vous est pratique, surtout quand on réserve vite.', 'il y a 1 mois', '2026-03-01T08:00:00+01:00')
on conflict (id) do update
set
  author_name = excluded.author_name,
  rating = excluded.rating,
  text = excluded.text,
  relative_time_description = excluded.relative_time_description,
  created_at = excluded.created_at;

insert into admin_users (id, username, password_hash, display_name, active)
values
  ('admin_owner', 'owner-glamlyn', '62addf07d1153f2b43b4fed70e365ffc8d678afc1eba4cba9f00b89e1bf5593f', 'Owner Glam Lyn', true),
  ('admin_manager', 'manager-glamlyn', '62addf07d1153f2b43b4fed70e365ffc8d678afc1eba4cba9f00b89e1bf5593f', 'Manager Glam Lyn', true)
on conflict (id) do update
set
  username = excluded.username,
  password_hash = excluded.password_hash,
  display_name = excluded.display_name,
  active = excluded.active;

insert into customer_profiles (id, name, phone, email, points, has_account, created_at, updated_at)
values
  ('customer_nadia', 'Nadia K.', '+213660101010', 'nadia@example.com', 4, true, '2026-03-02T09:00:00+01:00', '2026-04-06T18:00:00+01:00'),
  ('customer_sonia', 'Sonia M.', '+213660202020', 'sonia@example.com', 2, true, '2026-03-20T10:15:00+01:00', '2026-04-05T13:30:00+01:00'),
  ('customer_fatima', 'Fatima R.', '+213660303030', null, 0, false, '2026-04-02T11:10:00+01:00', '2026-04-02T11:10:00+01:00')
on conflict (id) do update
set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  points = excluded.points,
  has_account = excluded.has_account,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into bookings (
  id,
  customer_id,
  starts_at,
  ends_at,
  total_price_dzd,
  total_duration_minutes,
  status,
  source,
  notes,
  created_at,
  updated_at
)
values
  ('booking_upcoming_1', 'customer_nadia', '2026-04-09T10:00:00+01:00', '2026-04-09T11:20:00+01:00', 6300, 80, 'confirmed', 'account', 'Préfère une finition souple.', '2026-04-06T11:20:00+01:00', '2026-04-06T11:20:00+01:00'),
  ('booking_upcoming_2', 'customer_sonia', '2026-04-09T13:30:00+01:00', '2026-04-09T14:30:00+01:00', 5500, 60, 'confirmed', 'account', '', '2026-04-06T13:00:00+01:00', '2026-04-06T13:00:00+01:00'),
  ('booking_upcoming_3', 'customer_fatima', '2026-04-10T11:00:00+01:00', '2026-04-10T12:15:00+01:00', 5200, 75, 'confirmed', 'guest', '', '2026-04-06T16:40:00+01:00', '2026-04-06T16:40:00+01:00'),
  ('booking_past_1', 'customer_nadia', '2026-04-03T15:00:00+01:00', '2026-04-03T15:50:00+01:00', 4200, 50, 'completed', 'account', '', '2026-04-01T12:30:00+01:00', '2026-04-03T16:10:00+01:00')
on conflict (id) do update
set
  customer_id = excluded.customer_id,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  total_price_dzd = excluded.total_price_dzd,
  total_duration_minutes = excluded.total_duration_minutes,
  status = excluded.status,
  source = excluded.source,
  notes = excluded.notes,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into booking_services (booking_id, service_id)
values
  ('booking_upcoming_1', 'service_hair_signature'),
  ('booking_upcoming_1', 'service_manicure'),
  ('booking_upcoming_2', 'service_makeup'),
  ('booking_upcoming_3', 'service_cut_styling'),
  ('booking_past_1', 'service_hair_care')
on conflict do nothing;

insert into site_reviews (id, customer_id, booking_id, rating, text, status, created_at)
values
  ('review_site_1', 'customer_nadia', 'booking_past_1', 5, 'Réservation simple sur téléphone, accueil soigné et cheveux vraiment brillants.', 'published', '2026-04-04T09:20:00+01:00'),
  ('review_site_2', 'customer_sonia', 'booking_upcoming_2', 5, 'Le salon répond vite, les horaires sont clairs et le rappel email rassure beaucoup.', 'published', '2026-04-05T10:05:00+01:00'),
  ('review_site_3', 'customer_sonia', 'booking_upcoming_2', 4, 'J''aimerais encore plus de photos réelles dans la galerie.', 'pending', '2026-04-06T17:10:00+01:00')
on conflict (id) do update
set
  customer_id = excluded.customer_id,
  booking_id = excluded.booking_id,
  rating = excluded.rating,
  text = excluded.text,
  status = excluded.status,
  created_at = excluded.created_at;
