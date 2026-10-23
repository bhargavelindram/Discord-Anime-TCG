create extension if not exists pgcrypto;

create table if not exists players (
  discord_id text primary key,
  username text not null default 'Player',
  coins bigint not null default 500 check (coins >= 0),
  xp bigint not null default 0 check (xp >= 0),
  last_daily_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists anime_series (
  id text primary key,
  name text not null unique,
  short_name text not null unique
);

create table if not exists cards (
  id text primary key,
  series_id text not null references anime_series(id),
  character_name text not null,
  variant_name text not null default 'Standard',
  points integer not null check (points > 0),
  rarity text not null check (rarity in ('Common','Rare','Epic','Legendary','Mythic')),
  drop_weight integer not null check (drop_weight > 0),
  image_url text,
  image_source text,
  image_rights_status text not null default 'needs-review'
    check (image_rights_status in ('needs-review','authorized','licensed','public-domain','blocked')),
  canon_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(series_id, character_name, variant_name)
);
create index if not exists cards_series_idx on cards(series_id);
create index if not exists cards_points_idx on cards(points desc);

create table if not exists player_cards (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null references players(discord_id) on delete cascade,
  card_id text not null references cards(id),
  quantity integer not null default 1 check (quantity > 0),
  acquired_at timestamptz not null default now(),
  unique(discord_id, card_id)
);
create index if not exists player_cards_owner_idx on player_cards(discord_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null references players(discord_id),
  currency text not null check (currency in ('coins','points')),
  delta bigint not null,
  reason text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id text not null references players(discord_id),
  recipient_id text not null references players(discord_id),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  proposer_card_id text references cards(id),
  proposer_quantity integer not null default 1 check (proposer_quantity > 0),
  recipient_card_id text references cards(id),
  recipient_quantity integer not null default 1 check (recipient_quantity > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  resolved_at timestamptz,
  check (proposer_id <> recipient_id)
);

create table if not exists admin_audit (
  id bigint generated always as identity primary key,
  actor_discord_id text not null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into anime_series (id,name,short_name) values
('naruto','Naruto','NARUTO'),('death-note','Death Note','DEATH NOTE'),
('jujutsu-kaisen','Jujutsu Kaisen','JJK'),('one-piece','One Piece','ONE PIECE'),
('vinland-saga','Vinland Saga','VINLAND'),('my-hero-academia','My Hero Academia','MHA'),
('demon-slayer','Demon Slayer','DEMON SLAYER'),('one-punch-man','One-Punch Man','OPM'),
('pokemon','Pokémon','POKEMON'),('attack-on-titan','Attack on Titan','AOT')
on conflict (id) do nothing;

-- Import audited character rows here. Keep image_rights_status at needs-review until verified.