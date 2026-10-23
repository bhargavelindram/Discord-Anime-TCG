# Discord Anime TCG

A Discord-first anime character trading-card game where total collection points determine rankings. Cards should use real anime-moment artwork from sources you are authorized to use—never AI-generated character art. Card faces stay simple: image, character name, and points only.

## Current foundation
- Discord HTTP interactions on Cloudflare Workers.
- Supabase/PostgreSQL schema for players, cards, ownership, trades, and audit history.
- Slash commands include /start, /profile, /pack, /card, /inventory, /collection, /leaderboard, and /daily. A scheduled Cloudflare Worker posts a character spawn every hour whether or not anyone is online. Players click the spawn button labelled Catch me!, enter the character full name in a modal, and the first correct submission wins.
- Ten supported series: Naruto, Death Note, Jujutsu Kaisen, One Piece, Vinland Saga, My Hero Academia, Demon Slayer, One-Punch Man, Pokémon, Attack on Titan.
- Starter examples only. This is not yet an exhaustive roster of every character.

## Setup
1. Create a Discord application and bot in the Discord Developer Portal.
2. Create a Supabase project and run these files in order in its SQL editor: database/schema.sql, database/seed-starter.sql, database/functions.sql, database/leaderboard.sql, then database/spawns.sql and database/card-lookup.sql.
3. Install and deploy: npm install, then configure Cloudflare Worker secrets DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY. Set the Worker variable SPAWN_CHANNEL_ID to the Discord text-channel ID where spawns should appear, then run npx wrangler deploy. The Worker cron is set to the top of every hour. Use /card name: gojo_satoru to open a card you own; use /inventory to list owned cards.
4. Set the Discord Interactions Endpoint URL to the deployed Worker URL.
5. Register slash commands with DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and optionally DISCORD_GUILD_ID, then run npm run register.

## Game rules
Points are the main collection score. Rarity controls drop frequency, not a separate score. Starting tiers are Common, Rare, Epic, Legendary, and Mythic. Iconic characters such as Gojo, Yuji, Naruto, and Sasuke should be among the hardest to pull. Point values in the starter catalogue are initial balance proposals and must be tuned after a full roster audit.

## Artwork and completeness
The repository does not scrape or bundle episode frames. Add only authorized or licensed image URLs; keep rights status as needs-review until verified. The requested exhaustive roster needs a data-import and audit pass, including aliases, alternate forms, supporting characters, and canon coverage. Do not claim it is complete until verified.

## Security
All rewards and trades must be server-side. Add atomic trade transactions, request idempotency, cooldowns, backups, and monitoring before public launch. Never expose service-role keys or bot tokens in client-side code.

This code does not grant rights to anime characters, logos, names, or episode images. Check applicable rights and platform rules before distribution or monetization.