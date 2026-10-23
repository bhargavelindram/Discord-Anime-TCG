const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8" }
});

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function verifySignature(request, body, publicKey) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !publicKey) return false;
  if (!/^[0-9a-f]{128}$/i.test(signature) || !/^[0-9a-f]{64}$/i.test(publicKey)) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  try {
    const key = await crypto.subtle.importKey("raw", hexToBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, hexToBytes(signature), new TextEncoder().encode(timestamp + body));
  } catch { return false; }
}

async function db(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Database secrets are not configured.");
  const headers = new Headers(options.headers || {});
  headers.set("apikey", env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set("authorization", "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set("content-type", "application/json");
  const response = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + path, { ...options, headers });
  const body = await response.text();
  if (!response.ok) throw new Error("Database request failed (" + response.status + "): " + body.slice(0, 160));
  return body ? JSON.parse(body) : [];
}

async function ensurePlayer(env, user) {
  const id = encodeURIComponent(user.id);
  const found = await db(env, "players?discord_id=eq." + id + "&select=discord_id,username,coins,xp,last_daily_at");
  if (found.length) return found[0];
  const inserted = await db(env, "players?on_conflict=discord_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ discord_id: user.id, username: user.global_name || user.username || "Player" })
  });
  if (inserted.length) return inserted[0];
  return (await db(env, "players?discord_id=eq." + id + "&select=discord_id,username,coins,xp,last_daily_at"))[0];
}

function safeName(value) {
  return String(value || "Player").replace(/[@*_~|]/g, "").slice(0, 70);
}
function reply(content, ephemeral = false) {
  return { type: 4, data: { content, flags: ephemeral ? 64 : 0, allowed_mentions: { parse: [] } } };
}

async function totalPoints(env, userId) {
  const rows = await db(env, "player_cards?discord_id=eq." + encodeURIComponent(userId) + "&select=quantity,cards(points)");
  return rows.reduce((sum, row) => sum + Number(row.cards && row.cards.points || 0) * Number(row.quantity || 0), 0);
}

async function discordMessage(env, channelId, payload) {
  if (!env.DISCORD_BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is not configured.");
  const response = await fetch("https://discord.com/api/v10/channels/" + channelId + "/messages", {
    method: "POST",
    headers: { authorization: "Bot " + env.DISCORD_BOT_TOKEN, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Discord message failed (" + response.status + "): " + text.slice(0, 160));
  return text ? JSON.parse(text) : {};
}

async function spawnHourlyCard(env) {
  if (!env.SPAWN_CHANNEL_ID) throw new Error("SPAWN_CHANNEL_ID is not configured.");
  const card = await db(env, "rpc/spawn_hourly_card", {
    method: "POST", body: JSON.stringify({ p_channel_id: env.SPAWN_CHANNEL_ID })
  });
  const payload = {
    content: "**A character has appeared!**\nBe the first to use /catch with their **exact full name** to add the card to your collection."
  };
  if (card.image_url && ["authorized", "licensed", "public-domain"].includes(card.image_rights_status)) {
    payload.embeds = [{ image: { url: card.image_url }, footer: { text: "Identify the character by their full name • Card expires in 1 hour" } }];
  } else {
    payload.content += "\n(Artwork will appear when an approved image is added to the catalogue.)";
  }
  const message = await discordMessage(env, env.SPAWN_CHANNEL_ID, payload);
  await db(env, "rpc/set_spawn_message", {
    method: "POST",
    body: JSON.stringify({ p_channel_id: env.SPAWN_CHANNEL_ID, p_message_id: message.id })
  });
}

async function handle(interaction, env) {
  const command = interaction.data && interaction.data.name;
  const user = interaction.member && interaction.member.user || interaction.user;
  if (!user || !user.id) return reply("I couldn't identify your Discord account.", true);
  const player = await ensurePlayer(env, user);
  const id = encodeURIComponent(user.id);

  if (command === "catch") {
    if (!interaction.channel_id) return reply("Use /catch in the channel where the character appeared.", true);
    const fullName = (interaction.data.options || []).find(option => option.name === "full_name")?.value || "";
    const result = await db(env, "rpc/catch_spawn", {
      method: "POST",
      body: JSON.stringify({
        p_channel_id: interaction.channel_id,
        p_discord_id: user.id,
        p_username: user.global_name || user.username || "Player",
        p_full_name: fullName
      })
    });
    if (!result.ok) {
      if (result.reason === "wrong-name") return reply("That isn't the exact full character name. Check the spawned card and try again.", true);
      if (result.reason === "already-caught") return reply("Someone has already collected this character.", true);
      return reply("There is no available character in this channel right now. Wait for the next hourly spawn.", true);
    }
    return reply("**" + safeName(result.character_name) + "** was collected by <@" + user.id + ">!\nCard value: **" + Number(result.points).toLocaleString("en-US") + " points**\nUse /profile to check your total collection score.");
  }

  if (command === "start") {
    return reply("**Anime TCG profile created.** Use /pack to collect a card, /collection to view your cards, and /profile to see your total points.", true);
  }

  if (command === "profile") {
    const points = await totalPoints(env, user.id);
    return reply("**" + safeName(player.username) + "'s collection**\nTotal points: **" + points.toLocaleString("en-US") + "**\nCoins: **" + Number(player.coins).toLocaleString("en-US") + "**\nXP: **" + Number(player.xp).toLocaleString("en-US") + "**");
  }

  if (command === "leaderboard") {
    const rows = await db(env, "rpc/leaderboard_points", { method: "POST", body: "{}" });
    if (!rows.length) return reply("No collectors have joined yet.");
    const lines = rows.map((row, index) => (index + 1) + ". **" + safeName(row.username) + "** — " + Number(row.total_points || 0).toLocaleString("en-US") + " points");
    return reply("**Anime TCG — Global Collection Leaderboard**\n" + lines.join("\n"));
  }

  if (command === "collection") {
    const rows = await db(env, "player_cards?discord_id=eq." + id + "&select=quantity,cards(character_name,points)&order=acquired_at.desc&limit=20");
    if (!rows.length) return reply("Your collection is empty. Use /pack to collect your first card.", true);
    const lines = rows.map(row => "• **" + safeName(row.cards && row.cards.character_name) + "** — " +
      Number(row.cards && row.cards.points || 0).toLocaleString("en-US") + " points ×" + Number(row.quantity || 0));
    return reply("**Your collection**\n" + lines.join("\n") + "\n\nShowing up to 20 card types. Use /profile for your total collection score.");
  }

  if (command === "pack") {
    if (Number(player.coins) < 100) return reply("You need 100 coins to open a pack. Claim /daily for more.", true);
    let card;
    try {
      card = await db(env, "rpc/open_card_pack", {
        method: "POST",
        body: JSON.stringify({ p_discord_id: user.id })
      });
    } catch (error) {
      const message = String(error && error.message || error);
      if (message.includes("NOT_ENOUGH_COINS")) return reply("You need 100 coins to open a pack. Claim /daily for more.", true);
      if (message.includes("NO_ACTIVE_CARDS")) return reply("The card catalogue has not been imported yet. Add audited card records to the database first.", true);
      throw error;
    }
    const label = safeName(card.character_name);
    const points = Number(card.points).toLocaleString("en-US");
    const out = reply("**" + label + "**\n" + points + " points");
    if (card.image_url && ["authorized", "licensed", "public-domain"].includes(card.image_rights_status)) {
      out.data.content = "";
      out.data.embeds = [{ title: label, description: points + " points", image: { url: card.image_url } }];
    }
    return out;
  }

  if (command === "daily") {
    const now = Date.now();
    const last = player.last_daily_at ? new Date(player.last_daily_at).getTime() : 0;
    const remaining = 86400000 - (now - last);
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.ceil((remaining % 3600000) / 60000);
      return reply("Daily reward already claimed. Try again in **" + hours + "h " + minutes + "m**.", true);
    }
    await db(env, "players?discord_id=eq." + id, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ coins: Number(player.coins) + 250, xp: Number(player.xp) + 50, last_daily_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() })
    });
    await db(env, "transactions", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ discord_id: user.id, currency: "coins", delta: 250, reason: "daily-reward" })
    });
    return reply("Daily reward claimed: **250 coins** and **50 XP**. Use /pack to collect a card.");
  }
  return reply("That command is not available yet.", true);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      try { await spawnHourlyCard(env); }
      catch (error) { console.error("Hourly card spawn failed:", error && error.message || error); }
    })());
  },
  async fetch(request, env) {
    if (request.method === "GET") return new Response("Discord Anime TCG worker is online.");
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const body = await request.text();
    if (!(await verifySignature(request, body, env.DISCORD_PUBLIC_KEY))) return new Response("Invalid request signature", { status: 401 });
    let interaction;
    try { interaction = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }
    if (interaction.type === 1) return json({ type: 1 });
    if (interaction.type !== 2) return json(reply("Unsupported interaction.", true));
    try { return json(await handle(interaction, env)); }
    catch (error) {
      console.error("Interaction failed:", error && error.message || error);
      return json(reply("Something went wrong. Check Worker logs and try again.", true));
    }
  }
};