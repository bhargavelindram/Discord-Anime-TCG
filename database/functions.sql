-- Atomic card pack opening. Run after schema.sql and seed-starter.sql.
create or replace function open_card_pack(p_discord_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players%rowtype;
  v_card cards%rowtype;
begin
  select * into v_player
  from players
  where discord_id = p_discord_id
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;
  if v_player.coins < 100 then
    raise exception 'NOT_ENOUGH_COINS';
  end if;

  with eligible as (
    select c.id, sum(c.drop_weight) over () as total_weight,
           sum(c.drop_weight) over (order by c.id) as running_weight
    from cards c
    where c.active = true and c.image_rights_status <> 'blocked'
  )
  select c.* into v_card
  from eligible e
  join cards c on c.id = e.id
  where e.running_weight > random() * e.total_weight
  order by e.running_weight
  limit 1;

  if not found then
    raise exception 'NO_ACTIVE_CARDS';
  end if;

  update players
  set coins = coins - 100, updated_at = now()
  where discord_id = p_discord_id;

  insert into player_cards (discord_id, card_id, quantity)
  values (p_discord_id, v_card.id, 1)
  on conflict (discord_id, card_id)
  do update set quantity = player_cards.quantity + 1;

  insert into transactions (discord_id, currency, delta, reason, reference_id)
  values (p_discord_id, 'coins', -100, 'pack-open', v_card.id);

  return jsonb_build_object(
    'id', v_card.id,
    'character_name', v_card.character_name,
    'points', v_card.points,
    'rarity', v_card.rarity,
    'image_url', v_card.image_url,
    'image_rights_status', v_card.image_rights_status
  );
end;
$$;

revoke all on function open_card_pack(text) from public;
grant execute on function open_card_pack(text) to service_role;
