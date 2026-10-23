create or replace function leaderboard_points()
returns table (discord_id text, username text, total_points bigint)
language sql
security definer
set search_path = public
as $$
  select p.discord_id, p.username,
         coalesce(sum(pc.quantity::bigint * c.points::bigint), 0)::bigint as total_points
  from players p
  left join player_cards pc on pc.discord_id = p.discord_id
  left join cards c on c.id = pc.card_id
  group by p.discord_id, p.username
  order by total_points desc, p.username asc
  limit 10;
$$;
revoke all on function leaderboard_points() from public;
grant execute on function leaderboard_points() to service_role;
