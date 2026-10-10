(globalThis.APP = globalThis.APP || {});
/* Creatures that hatch from eggs in the shop, and the eggs themselves. */
globalThis.APP.RARITY = {
  common: { name: "Common", color: "#8bc34a", refund: 10 },
  rare: { name: "Rare", color: "#29b6f6", refund: 30 },
  epic: { name: "Epic", color: "#ab47bc", refund: 60 },
  legendary: { name: "Legendary", color: "#ffb300", refund: 150 }
};

globalThis.APP.CREATURES = [
  // Common
  { id: "frog", emoji: "🐸", name: "Hoppy Frog", rarity: "common" },
  { id: "kitty", emoji: "🐱", name: "Whisker Kitty", rarity: "common" },
  { id: "pup", emoji: "🐶", name: "Puddle Pup", rarity: "common" },
  { id: "bunny", emoji: "🐰", name: "Bun-Bun", rarity: "common" },
  { id: "mouse", emoji: "🐭", name: "Squeaky Mouse", rarity: "common" },
  { id: "chick", emoji: "🐥", name: "Peep Chick", rarity: "common" },
  { id: "turtle", emoji: "🐢", name: "Slowpoke Turtle", rarity: "common" },
  { id: "bee", emoji: "🐝", name: "Buzzy Bee", rarity: "common" },
  { id: "ladybug", emoji: "🐞", name: "Dotty Ladybug", rarity: "common" },
  { id: "snail", emoji: "🐌", name: "Sir Snail", rarity: "common" },
  { id: "hamster", emoji: "🐹", name: "Nibbles Hamster", rarity: "common" },
  { id: "piglet", emoji: "🐷", name: "Oinky Piglet", rarity: "common" },
  { id: "calf", emoji: "🐮", name: "Moo Calf", rarity: "common" },
  { id: "duck", emoji: "🦆", name: "Quacky Duck", rarity: "common" },
  { id: "squirrel", emoji: "🐿️", name: "Nutty Squirrel", rarity: "common" },
  { id: "worm", emoji: "🐛", name: "Wiggle Worm", rarity: "common" },
  // Rare
  { id: "fox", emoji: "🦊", name: "Foxy Flash", rarity: "rare" },
  { id: "owl", emoji: "🦉", name: "Professor Hoot", rarity: "rare" },
  { id: "panda", emoji: "🐼", name: "Bamboo Panda", rarity: "rare" },
  { id: "koala", emoji: "🐨", name: "Sleepy Koala", rarity: "rare" },
  { id: "raccoon", emoji: "🦝", name: "Bandit Raccoon", rarity: "rare" },
  { id: "penguin", emoji: "🐧", name: "Waddles Penguin", rarity: "rare" },
  { id: "hedgehog", emoji: "🦔", name: "Prickles", rarity: "rare" },
  { id: "otter", emoji: "🦦", name: "Splash Otter", rarity: "rare" },
  { id: "dolphin", emoji: "🐬", name: "Flip Dolphin", rarity: "rare" },
  { id: "parrot", emoji: "🦜", name: "Chatter Parrot", rarity: "rare" },
  { id: "octopus", emoji: "🐙", name: "Inky Octopus", rarity: "rare" },
  { id: "butterfly", emoji: "🦋", name: "Flutter Butterfly", rarity: "rare" },
  // Epic
  { id: "lion", emoji: "🦁", name: "King Roar", rarity: "epic" },
  { id: "tiger", emoji: "🐯", name: "Stripes Tiger", rarity: "epic" },
  { id: "shark", emoji: "🦈", name: "Chomp Shark", rarity: "epic" },
  { id: "flamingo", emoji: "🦩", name: "Flora Flamingo", rarity: "epic" },
  { id: "whale", emoji: "🐳", name: "Big Blue Whale", rarity: "epic" },
  { id: "peacock", emoji: "🦚", name: "Shimmer Peacock", rarity: "epic" },
  { id: "croc", emoji: "🐊", name: "Snappy Croc", rarity: "epic" },
  { id: "sloth", emoji: "🦥", name: "Lazy Sloth", rarity: "epic" },
  // Legendary
  { id: "unicorn", emoji: "🦄", name: "Sparkle Unicorn", rarity: "legendary" },
  { id: "dragon", emoji: "🐉", name: "Ember Dragon", rarity: "legendary" },
  { id: "trex", emoji: "🦖", name: "Rex the Dino", rarity: "legendary" },
  { id: "bronto", emoji: "🦕", name: "Longneck Bronto", rarity: "legendary" },
  { id: "alien", emoji: "👾", name: "Zap the Alien", rarity: "legendary" },
  { id: "fairy", emoji: "🧚", name: "Twinkle Fairy", rarity: "legendary" }
];

// Chance (in percent) of each rarity for each egg.
globalThis.APP.EGGS = [
  { id: "common", name: "Common Egg", price: 150, hue: 0, odds: { common: 75, rare: 20, epic: 5, legendary: 0 } },
  { id: "rare", name: "Rare Egg", price: 400, hue: 180, odds: { common: 30, rare: 50, epic: 17, legendary: 3 } },
  { id: "magic", name: "Magic Egg", price: 1000, hue: 280, odds: { common: 0, rare: 40, epic: 45, legendary: 15 } }
];

globalThis.APP.THEMES = [
  { id: "sunny", name: "Sunny", icon: "🌞", price: 0 },
  { id: "rainbow", name: "Rainbow", icon: "🌈", price: 200 },
  { id: "space", name: "Space", icon: "🪐", price: 200 },
  { id: "ocean", name: "Ocean", icon: "🌊", price: 200 },
  { id: "candy", name: "Candy", icon: "🍭", price: 200 }
];

globalThis.APP.EFFECTS = [
  { id: "confetti", name: "Confetti", icon: "🎊", price: 0 },
  { id: "stars", name: "Stars", icon: "⭐", price: 150 },
  { id: "bubbles", name: "Bubbles", icon: "🫧", price: 150 },
  { id: "hearts", name: "Hearts", icon: "💖", price: 150 }
];

globalThis.APP.TROPHIES = {
  k: { emoji: "🥉", name: "Kindergarten Champion" },
  g1: { emoji: "🥈", name: "First Grade Champion" },
  g2: { emoji: "🥇", name: "Second Grade Champion" },
  g3: { emoji: "🏆", name: "Third Grade Champion" }
};
