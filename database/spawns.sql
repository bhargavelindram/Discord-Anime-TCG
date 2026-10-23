-- Hourly public card spawns. Run after schema.sql.
create table if not exists active_spawns (
  channel_id text primary key,
  card_id text not null references cards(id),
  spawned_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  caught_by text references players(discord_id),
  caught_at timestamptz,
  message_id text
);

create or replace function spawn_hourly_card(p_channel_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card cards%rowtype;
  v_spawn active_spawns%rowtype;
begin
  select c.* into v_card
  from cards c
  where c.active = true
  order by -ln(greatest(random(), 0.0000001)) / c.drop_weight
  limit 1;

  if not found then raise exception 'NO_ACTIVE_CARDS'; end if;

  insert into active_spawns(channel_id, card_id, spawned_at, expires_at, caught_by, caught_at, message_id)
  values (p_channel_id, v_card.id, now(), now() + interval '1 hour', null, null, null)
  on conflict (channel_id) do update
    set card_id = excluded.card_id,
        spawned_at = excluded.spawned_at,
        expires_at = excluded.expires_at,
        caught_by = null,
        caught_at = null,
        message_id = null
  returning * into v_spawn;

  return jsonb_build_object(
    'channel_id', v_spawn.channel_id,
    'card_id', v_card.id,
    'character_name', v_card.character_name,
    'points', v_card.points,
    'rarity', v_card.rarity,
    'image_url', v_card.image_url,
    'image_rights_status', v_card.image_rights_status,
    'expires_at', v_spawn.expires_at
  );
end;
$$;

create or replace function set_spawn_message(p_channel_id text, p_message_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update active_spawns set message_id = p_message_id
  where channel_id = p_channel_id and caught_by is null;
$$;

create or replace function catch_spawn(p_channel_id text, p_discord_id text, p_username text, p_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spawn active_spawns%rowtype;
  v_card cards%rowtype;
begin
  insert into players(discord_id, username)
  values (p_discord_id, coalesce(nullif(p_username,''), 'Player'))
  on conflict (discord_id) do update
    set username = excluded.username, updated_at = now();

  select * into v_spawn from active_spawns
  where channel_id = p_channel_id
  for update;

  if not found or v_spawn.caught_by is not null or v_spawn.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'no-active-spawn');
  end if;

  select * into v_card from cards where id = v_spawn.card_id;
  if lower(regexp_replace(trim(coalesce(p_full_name,'')), '\s+', ' ', 'g'))
     <> lower(regexp_replace(trim(v_card.character_name), '\s+', ' ', 'g')) then
    return jsonb_build_object('ok', false, 'reason', 'wrong-name');
  end if;

  update active_spawns set caught_by = p_discord_id, caught_at = now()
  where channel_id = p_channel_id and caught_by is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already-caught');
  end if;

  insert into player_cards(discord_id, card_id, quantity)
  values (p_discord_id, v_card.id, 1)
  on conflict (discord_id, card_id)
  do update set quantity = player_cards.quantity + 1;

  return jsonb_build_object(
    'ok', true, 'character_name', v_card.character_name,
    'points', v_card.points, 'rarity', v_card.rarity
  );
end;
$$;

revoke all on function spawn_hourly_card(text) from public;
revoke all on function set_spawn_message(text,text) from public;
revoke all on function catch_spawn(text,text,text,text) from public;
grant execute on function spawn_hourly_card(text) to service_role;
grant execute on function set_spawn_message(text,text) to service_role;
grant execute on function catch_spawn(text,text,text,text) to service_role;
