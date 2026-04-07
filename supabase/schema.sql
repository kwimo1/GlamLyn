create extension if not exists pgcrypto;

create table if not exists service_categories (
  id text primary key,
  label text not null,
  description text not null
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text,
  points integer not null default 0,
  has_account boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_price_dzd integer not null,
  total_duration_minutes integer not null,
  status text not null check (status in ('confirmed', 'completed', 'cancelled')),
  source text not null check (source in ('guest', 'account')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_services (
  booking_id uuid not null references bookings(id) on delete cascade,
  service_id uuid not null references services(id),
  primary key (booking_id, service_id)
);

create table if not exists site_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles(id),
  booking_id uuid not null references bookings(id),
  rating integer not null check (rating between 1 and 5),
  text text not null,
  status text not null check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists google_review_snapshots (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  rating integer not null,
  text text not null,
  relative_time_description text not null,
  created_at timestamptz not null default now()
);

create table if not exists instagram_reels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  reel_url text not null,
  external_cover_url text,
  published boolean not null default true,
  display_order integer not null default 1
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  type text not null,
  channel text not null default 'sms',
  recipient text not null,
  message text not null,
  status text not null,
  provider text not null,
  created_at timestamptz not null default now()
);
