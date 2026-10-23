// Small starter sample only; this is not an exhaustive character roster.
export const SERIES = [
  { id: "naruto", name: "Naruto", shortName: "NARUTO" },
  { id: "death-note", name: "Death Note", shortName: "DEATH NOTE" },
  { id: "jujutsu-kaisen", name: "Jujutsu Kaisen", shortName: "JJK" },
  { id: "one-piece", name: "One Piece", shortName: "ONE PIECE" },
  { id: "vinland-saga", name: "Vinland Saga", shortName: "VINLAND" },
  { id: "my-hero-academia", name: "My Hero Academia", shortName: "MHA" },
  { id: "demon-slayer", name: "Demon Slayer", shortName: "DEMON SLAYER" },
  { id: "one-punch-man", name: "One-Punch Man", shortName: "OPM" },
  { id: "pokemon", name: "Pokémon", shortName: "POKEMON" },
  { id: "attack-on-titan", name: "Attack on Titan", shortName: "AOT" }
];

export const STARTER_CARDS = [
  { id: "naruto-uzumaki", seriesId: "naruto", characterName: "Naruto Uzumaki", points: 950, rarity: "Mythic", dropWeight: 15 },
  { id: "sasuke-uchiha", seriesId: "naruto", characterName: "Sasuke Uchiha", points: 940, rarity: "Mythic", dropWeight: 15 },
  { id: "light-yagami", seriesId: "death-note", characterName: "Light Yagami", points: 760, rarity: "Legendary", dropWeight: 100 },
  { id: "ryuk", seriesId: "death-note", characterName: "Ryuk", points: 710, rarity: "Legendary", dropWeight: 100 },
  { id: "satoru-gojo", seriesId: "jujutsu-kaisen", characterName: "Satoru Gojo", points: 1000, rarity: "Mythic", dropWeight: 10 },
  { id: "yuji-itadori", seriesId: "jujutsu-kaisen", characterName: "Yuji Itadori", points: 960, rarity: "Mythic", dropWeight: 15 },
  { id: "monkey-d-luffy", seriesId: "one-piece", characterName: "Monkey D. Luffy", points: 990, rarity: "Mythic", dropWeight: 15 },
  { id: "roronoa-zoro", seriesId: "one-piece", characterName: "Roronoa Zoro", points: 900, rarity: "Legendary", dropWeight: 100 },
  { id: "thorfinn", seriesId: "vinland-saga", characterName: "Thorfinn", points: 820, rarity: "Legendary", dropWeight: 100 },
  { id: "izuku-midoriya", seriesId: "my-hero-academia", characterName: "Izuku Midoriya", points: 900, rarity: "Legendary", dropWeight: 100 },
  { id: "tanjiro-kamado", seriesId: "demon-slayer", characterName: "Tanjiro Kamado", points: 880, rarity: "Legendary", dropWeight: 100 },
  { id: "saitama", seriesId: "one-punch-man", characterName: "Saitama", points: 980, rarity: "Mythic", dropWeight: 15 },
  { id: "pikachu", seriesId: "pokemon", characterName: "Pikachu", points: 800, rarity: "Legendary", dropWeight: 100 },
  { id: "eren-yeager", seriesId: "attack-on-titan", characterName: "Eren Yeager", points: 930, rarity: "Mythic", dropWeight: 20 }
];

export function pickWeighted(items, random = Math.random) {
  const total = items.reduce((sum, item) => sum + Number(item.dropWeight), 0);
  if (total <= 0) throw new Error("No active cards available");
  let roll = random() * total;
  for (const item of items) {
    roll -= Number(item.dropWeight);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}