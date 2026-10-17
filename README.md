# ✏️ WritingPower

**Hear it. Write it. Win prizes!** A spelling game for kindergarten to third grade. Press **🔊 Say it!**: the app reads a sentence aloud, the words are never shown, and the child types it letter by letter into empty boxes.

Website: **https://appleinfire.github.io/WritingPower/** (works on iPad, phones and computers; install it with Safari → Share → *Add to Home Screen*, and it works offline).

Built on the family app shell from [Math Expedition](https://github.com/appleinfire/Math) (`templates/app-shell/`).

## How to play

- **Who's writing?** Every child has a profile with a name, a picture and a grade: **Kindergarten**, **First**, **Second** or **Third grade**. Each profile has its own levels, points and creatures.
- **🗺️ Levels.** Each grade has 30 levels of 5 sentences, getting longer and harder. Finishing a level opens the next one. The child's own grade is shown first; the other grades are one tap away.
- **♾️ Endless Practice.** New sentences for as long as the child likes. Every 5 perfect sentences in a row pay a 🔥 streak bonus.
- **🧩 Reading Puzzles.** The other way round: read a short word or phrase, tap its picture, and a puzzle of a zoo creature comes together (see below).
- **Typing.** A big on-screen keyboard (ABC order or QWERTY), or a real keyboard.
  - A right letter turns green. A wrong one wiggles and counts an "oops".
  - Spaces, capital letters and punctuation fill in by themselves.
  - **🐢 Slow** reads the sentence slowly, **💬 Word** reads just the current word, and **👀 Peek** shows the next letter for a moment (5 ⭐; free in Kindergarten).
- **Stars.** No oops gives 3 stars, 1–2 oopses give 2 stars, more give 1 star.
- **Sentences.** About 1,000 different sentences per grade, built from about 150 to 350 different words per grade.

## 🧩 Reading Puzzles

The other half of writing: here the child **reads** a short word or phrase and finds its picture, and every right answer brings a piece of a picture of one of the zoo's creatures. Made for kindergarten, like Puzzle Time in Math Expedition (same board, jigsaw cut and scenes). The home screen has a tile; the album page has the three puzzles, the album of 42 pictures, and two settings: what to read and how many pieces (4, 6, 9 or 12).

| Puzzle | How it goes | At the end |
|---|---|---|
| 🧲 **Snap!** | Read the word, tap its picture (one of three): a piece flies into place. | *You made Hoppy Frog!* |
| ✋ **Find the piece** | The word is written in a hole of the picture. Three pieces with pictures lie in the tray; drag the right one into the hole (a tap works too). Always single words, so the word fits in the hole. | the same |
| ☁️ **Who's hiding?** | The picture is under clouds; every word read blows one away. After the first cloud *I know who it is!* offers three creatures; a wrong guess waits for the next cloud. | A right guess blows all the clouds away: +1 ⭐ for every cloud still there. |

**What to read** (a setting on the album page):
- **🔤 Words:** 40 short words to sound out (cat, pig, sun, bed, fox…), each with one clear picture.
- **📝 Phrases:** *a big cat*, *two dogs*, *three little hens*, mixed with words. Besides the picture word they use only *a, an, two, three, big, little*, words kindergartners learn by sight.

**So that it is reading, not guessing:**
- The word is shown, **never read aloud**: the voice says only what to do (🔊 *What to do*). The font has the a and g children learn to write.
- The wrong pictures are words **one letter away** (cat → cap, hat), in different places of the word, and one starts with the same letter whenever the list has one, so the first letter is not enough. Pictures that the other word could also name (🎩/🧢, 🥫/🗑️, 🚐/🚌, 🚐/🚕) are never in the same problem.
- In a phrase each wrong picture changes **one thing**: how many, the size, or the word.
- **👆 Sound it out** lights up the letters one after another (a phrase: word by word). A first miss does it by itself; a second miss reads the word aloud and makes the right picture glow.
- A word read wrong comes back in about every fourth problem (🔁 *Again*) until it is read right on the first try.

**Points:** +1 ⭐ for each word read right on the first try, +15 ⭐ for a finished puzzle. The album shows Common creatures first, Legendary last; a picture already made can be made again. Badges: Puzzle Reader, Bookworm (100 words read), Puzzle Master (all 42 pictures). *For grown-ups* shows the words read, how many were right on the first try, and **Words to read** (still to be read right again).

The words, problems, pictures and cut are in `js/reading.js`, the screens in `js/reading-ui.js`. To add a word, add it to `RD.WORDS` with a picture only that word names, and run `node tests/reading.test.js`.

## Points ⭐, shop and zoo

| What the child does | Points |
|---|---|
| Each correct letter | +1 |
| Finish a sentence | +10 (+5 with no oops) |
| Finish a level with 1 / 2 / 3 stars | +25 / +50 / +75 (half on a replay) |
| Endless: 5, 10, 15… perfect in a row | +20, +40, +60… |
| Reading Puzzles: a word read right on the first try / a finished puzzle | +1 / +15 |
| First visit of the day | +30 |
| 23 badges | +20 to +1000 |

The **🛒 Shop** sells three kinds of things:
- **🥚 Eggs:** Common 150 ⭐, Rare 400 ⭐, Magic 1000 ⭐. Each hatches one of 42 creatures (Common, Rare, Epic, Legendary). A creature the child already has levels up (★2, ★3…) and gives a few points back.
- **Keyboard themes:** Rainbow, Space, Ocean, Candy.
- **Celebration effects:** Confetti, Stars, Bubbles, Hearts.

**🐾 My Zoo** shows the creatures found so far, the grade trophies 🥉🥈🥇🏆 (for finishing all 30 levels of a grade), and the badges.

## For grown-ups

Behind a multiplication question:
- **Report:** sentences written, letters right the first time, active days, best streak, a 14-day chart, levels and stars per grade.
- **Words to practice:** words the child mistyped, with a button to hear each one.
- **Reading Puzzles:** words and phrases read, right on the first try, the album, and words to read again.
- **Settings:** sound, slower reading voice, unlock every level, keyboard layout, name.
- **Family sync:** status, and disconnecting this device.
- **Save code:** a backup, or a way to move progress without the cloud.
- **Profiles:** change a child's grade, or delete a profile (it takes a second tap).
- **Erase progress.**
- **👀 Preview:** every level is open, nothing is saved, and the shop is closed.

**Our other apps.** The bottom of the "Who's writing?" and home screens links to our other apps (now Math Expedition). The list is `apps` in `js/config.js`; keep it the same in every app, and the app skips its own entry by `id`. With a child open, the link carries the name (`#who=Mia`): the other app opens the profile with that name, or offers to add it with the name filled in.

## Same progress on every device

1. On the first device choose **Create a family**. Pick a family code (at least 6 letters, for example `smith-tigers`) and a 4–6 digit PIN, and write them down.
2. On every other device open the website and choose **I already have a family**, then type the same code and PIN.

**One family for all our apps.** Use the same family code and PIN as in Math Expedition. If Math Expedition is already connected on the device, the family screen offers **Use family …**: one tap, no PIN.

Progress syncs through Firebase (the project shared with Math Expedition). The PIN never leaves the device: the browser turns the code and PIN into the family root, which is the same in all our apps. Each app keeps its data under its own key derived from the root, so the apps' progress never mixes. Never change `FAMILY_SALT` or `ROOT_APP` in `js/cloud.js`.

Each device keeps a full copy and works offline. When a child plays on two devices offline, the copies are merged without losing anything earned:

| What | When two copies differ |
|---|---|
| Levels, creatures, badges, trophies, bought themes and effects, Endless records, words to practice and to read, the puzzle album | Kept from both copies; the best value wins |
| Totals (letters, sentences, points ever earned…) | The higher value wins |
| Points to spend, equipped theme and effect, settings, puzzle pieces and what to read | The newer copy wins |

## Publishing

Every push to `main` runs the tests and publishes the site to GitHub Pages in about a minute (Actions → *Deploy to GitHub Pages*).

One-time setup:
- Settings → Pages → Source: **GitHub Actions**.
- `main` must be the default branch.

## Files

```
index.html             the page; every script is a plain <script> tag (no build step, no npm)
css/style.css          all styles: the shell first, then the game (keyboard themes, levels, shop, zoo)
js/config.js           app name, storage id 'writing-power' (never change), grades, avatars, Firebase config
js/schema.js           what a profile holds and how two copies merge
js/content.js          word lists, sentence templates and hand-written sentences for each grade
js/sentences.js        builds each level's 5 sentences (always the same) and the endless supply
js/creatures.js        creatures, eggs, keyboard themes, celebrations, trophies
js/reading.js          Reading Puzzles rules: picture words, problems, creature pictures in scenes, jigsaw cut, album
js/reading-ui.js       Reading Puzzles screens: album page, Snap!, Find the piece, Who's hiding?
js/fx.js               read-aloud voice, sounds, celebration effects
js/app.js              screens and routing: profiles, family, home map, play, shop, zoo, grown-ups
js/util.js, js/store.js, js/cloud.js, js/vendor/   the app shell: helpers, profiles, Firebase sync, Firebase SDK 10.14.1
sw.js                  offline cache (every file is listed in FILES)
manifest.webmanifest, icons/   name and icons for "Add to Home Screen"
firestore.rules        Firestore security rules (already set in the shared project)
.github/workflows/pages.yml    tests + deploy to GitHub Pages
tests/shell.test.js    merging two copies (every rule above), storage, preview, save code, family key, offline file list
tests/content.test.js  every level of every grade: 5 different, valid sentences, getting harder
tests/reading.test.js  Reading Puzzles: one picture per word, wrong pictures one letter or one thing away, review, cut, album
tests/smoke.mjs        in Chromium: a level, Endless, shop, zoo, three reading puzzles, grown-ups, preview, back gesture, two profiles, reload
tests/cloud-e2e.mjs    two "devices" syncing through the real Firebase project
```

How the code is organized: every file attaches itself to the global `APP` object. A screen is a function that calls `render(html)`. Buttons carry `data-act="<action>" data-arg="<argument>"`, and their handlers live in `ACTIONS`. `go('<screen>')` changes screen and records it for the back gesture. After changing `APP.state`, the code calls `APP.store.save()`, which saves locally and uploads to the family.

To add sentences or words, edit `js/content.js` and run `node tests/content.test.js`.

## Running the tests

```sh
node tests/shell.test.js
node tests/content.test.js
node tests/reading.test.js
node tests/smoke.mjs        # needs Playwright with Chromium
node tests/cloud-e2e.mjs    # needs Playwright and internet
```

To try the app locally, open `index.html`, or run `python3 -m http.server` and open http://localhost:8000. Family sync needs `http(s)://`.
