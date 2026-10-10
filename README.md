# ✏️ WritingPower

A spelling and writing game for kids in Kindergarten through 3rd grade.

**Hear it. Write it. Win prizes!** Press **🔊 Say it!** and the game reads a sentence out loud. You never see the words. You only see an empty box for each letter, and you fill the sentence in letter by letter.

## How to play

1. Pick your grade: **Kindergarten**, **First**, **Second** or **Third**.
2. Pick a mode:
   - **🗺️ Adventure Levels**: 30 levels per grade with 5 sentences each, getting harder as you go. Finish a level to unlock the next one.
   - **♾️ Endless Practice**: keep going for as long as you like. Every 5 perfect sentences in a row pays a streak bonus 🔥.
3. Listen, then type the letters on the big on-screen keyboard (a real keyboard works too).
   - A right letter turns green. A wrong letter wiggles, and the game counts an "oops".
   - Spaces, capital letters and the period fill in by themselves.
   - **🐢 Slow** says the sentence slowly, **💬 Word** says just the word you're on, and **👀 Peek** shows the next letter for a moment (it costs 5 ⭐, but is free in Kindergarten).
   - **Enter** says the sentence again.
4. Earn 1–3 stars for each sentence and each level.

## Points ⭐

| What you do | Points |
|---|---|
| Each correct letter | +1 |
| Finish a sentence | +10 (+5 more with no oops) |
| Finish a level (1 / 2 / 3 stars) | +25 / +50 / +75 (half when you replay it) |
| Endless streak of 5, 10, 15… | +20, +40, +60… |
| First game of the day | +30 |
| Badges (20 to earn) | +20 to +1000 |

## Shop & Zoo

Spend points in the **🛒 Shop**:

- **🥚 Eggs** hatch a random creature for your **🐾 Zoo**. There are 42 creatures in four groups: Common, Rare, Epic and Legendary.
  - Common Egg costs 150 ⭐, Rare Egg costs 400 ⭐ and Magic Egg costs 1000 ⭐. Better eggs hatch rarer creatures more often.
  - If you hatch a creature you already have, it levels up (★2, ★3…) and gives you a few points back.
- **🎹 Keyboard themes**: Rainbow, Space, Ocean and Candy.
- **🎉 Celebrations**: Confetti, Stars, Bubbles and Hearts.

Finish all 30 levels in a grade to win that grade's **trophy** 🥉🥈🥇🏆.

## Running it

It's a plain web page with no install and no build step:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

You can also open `index.html` directly, or host the folder on GitHub Pages.

Progress is saved in the browser on this device (`localStorage`).

The read-aloud voice uses the browser's built-in speech, which works in Chrome, Edge and Safari on computers, tablets and phones.

## Project layout

- `index.html` has all the screens.
- `styles.css` has the look, including the keyboard themes and the phone layout.
- `js/content.js` has the word lists, sentence templates and hand-written sentences for each grade.
- `js/sentences.js` builds each level's sentences and the endless supply.
- `js/creatures.js` has the creatures, eggs, themes, celebrations and trophies.
- `js/app.js` runs the game: speech, keyboard, points, shop, zoo and saving.
- `scripts/check-content.js` generates every level and checks the sentences. Run it with `node scripts/check-content.js`.

To add sentences or words, edit `js/content.js` and then run the check script.
