const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
if (!appId || !token) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN first.");
  process.exit(1);
}
const commands = [
  { name: "start", description: "Create your Anime TCG profile" },
  { name: "profile", description: "View your player stats and collection score" },
  { name: "pack", description: "Spend 100 coins to collect a random character card" },
  { name: "card", description: "Open a card you already own by character-name slug", options: [{ name: "name", description: "Full character name as a slug, e.g. gojo_satoru", type: 3, required: true }] },
  { name: "collection", description: "View your character cards and point values" },
  { name: "inventory", description: "View the cards in your storage" },
  { name: "leaderboard", description: "View the top collectors by total collection points" },
  { name: "daily", description: "Claim daily coins and XP" }
];
const url = guildId
  ? "https://discord.com/api/v10/applications/" + appId + "/guilds/" + guildId + "/commands"
  : "https://discord.com/api/v10/applications/" + appId + "/commands";
const response = await fetch(url, {
  method: "PUT",
  headers: { authorization: "Bot " + token, "content-type": "application/json" },
  body: JSON.stringify(commands)
});
const body = await response.text();
if (!response.ok) {
  console.error("Registration failed (" + response.status + "): " + body);
  process.exit(1);
}
console.log("Registered " + commands.length + " commands.");
