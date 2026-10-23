-- View a card only when the requesting player owns at least one copy.
create or replace function view_owned_card(p_discord_id text, p_card_slug text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_card cards%rowtype;
begin
  select c.* into v_card
  from cards c join player_cards pc on pc.card_id = c.id
  where pc.discord_id = p_discord_id
    and trim(both '_' from regexp_replace(lower(trim(c.character_name)), '[^a-z0-9]+', '_', 'g')) =
        trim(both '_' from regexp_replace(lower(trim(coalesce(p_card_slug,''))), '[^a-z0-9]+', '_', 'g'))
  order by pc.acquired_at desc limit 1;
  if not found then
    if exists (select 1 from cards c
      where trim(both '_' from regexp_replace(lower(trim(c.character_name)), '[^a-z0-9]+', '_', 'g')) =
        trim(both '_' from regexp_replace(lower(trim(coalesce(p_card_slug,''))), '[^a-z0-9]+', '_', 'g'))) then
      return jsonb_build_object('ok', false, 'reason', 'not-owned');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  return jsonb_build_object('ok', true, 'id', v_card.id, 'character_name', v_card.character_name,
    'points', v_card.points, 'rarity', v_card.rarity, 'image_url', v_card.image_url,
    'image_rights_status', v_card.image_rights_status);
end;
$$;
revoke all on function view_owned_card(text,text) from public;
grant execute on function view_owned_card(text,text) to service_role;
