# ✏️ WritingPower

**Hear it. Write it. Win prizes!** A spelling game for kindergarten to third grade. Press **🔊 Say it!**: the app reads a sentence aloud, the words are never shown, and the child types it letter by letter into empty boxes.

Website: **https://appleinfire.github.io/WritingPower/** (works on iPad, phones and computers; install it with Safari → Share → *Add to Home Screen*, and it works offline).

Built on the family app shell from [Math Expedition](https://github.com/appleinfire/Math) (`templates/app-shell/`).

## How to play

- **Who's writing?** Every child has a profile with a name, a picture and a grade: **Kindergarten**, **First**, **Second** or **Third grade**. Each profile has its own levels, points and creatures.
- **🗺️ Levels.** Each grade has 30 levels of 5 sentences, getting longer and harder. Finishing a level opens the next one. The child's own grade is shown first; the other grades are one tap away.
- **♾️ Endless Practice.** New sentences for as long as the child likes. Every 5 perfect sentences in a row pay a 🔥 streak bonus.
- **Typing.** A big on-screen keyboard (ABC order or QWERTY), or a real keyboard.
  - A right letter turns green. A wrong one wiggles and counts an "oops".
  - Spaces, capital letters and punctuation fill in by themselves.
  - **🐢 Slow** reads the sentence slowly, **💬 Word** reads just the current word, and **👀 Peek** shows the next letter for a moment (5 ⭐; free in Kindergarten).
- **Stars.** No oops gives 3 stars, 1–2 oopses give 2 stars, more give 1 star.
- **Sentences.** About 1,000 different sentences per grade, built from about 150 to 350 different words per grade.

## Points ⭐, shop and zoo

| What the child does | Points |
|---|---|
| Each correct letter | +1 |
| Finish a sentence | +10 (+5 with no oops) |
| Finish a level with 1 / 2 / 3 stars | +25 / +50 / +75 (half on a replay) |
| Endless: 5, 10, 15… perfect in a row | +20, +40, +60… |
| First visit of the day | +30 |
| 20 badges | +20 to +1000 |

The **🛒 Shop** sells three kinds of things:
- **🥚 Eggs:** Common 150 ⭐, Rare 400 ⭐, Magic 1000 ⭐. Each hatches one of 42 creatures (Common, Rare, Epic, Legendary). A creature the child already has levels up (★2, ★3…) and gives a few points back.
- **Keyboard themes:** Rainbow, Space, Ocean, Candy.
- **Celebration effects:** Confetti, Stars, Bubbles, Hearts.

**🐾 My Zoo** shows the creatures found so far, the grade trophies 🥉🥈🥇🏆 (for finishing all 30 levels of a grade), and the badges.

## For grown-ups

Behind a multiplication question:
- **Report:** sentences written, letters right the first time, active days, best streak, a 14-day chart, levels and stars per grade.
- **Words to practice:** words the child mistyped, with a button to hear each one.
- **Settings:** sound, slower reading voice, unlock every level, keyboard layout, name.
- **Family sync:** status, and disconnecting this device.
- **Save code:** a backup, or a way to move progress without the cloud.
- **Profiles:** change a child's grade, or delete a profile (it takes a second tap).
- **Erase progress.**
- **👀 Preview:** every level is open, nothing is saved, and the shop is closed.

**Our other apps.** The bottom of the "Who's writing?" and home screens links to our other apps (now Math Expedition). The list is `apps` in `js/config.js`; keep it the same in every app, and the app skips its own entry by `id`.

## Same progress on every device

1. On the first device choose **Create a family**. Pick a family code (at least 6 letters, for example `smith-tigers`) and a 4–6 digit PIN, and write them down.
2. On every other device open the website and choose **I already have a family**, then type the same code and PIN.

Progress syncs through Firebase (the project shared with Math Expedition). The PIN never leaves the device: the browser turns the code and PIN into a key, salted with this app's id (`writing-power`). Families of the two apps never mix, even with the same code and PIN.

Each device keeps a full copy and works offline. When a child plays on two devices offline, the copies are merged without losing anything earned:

| What | When two copies differ |
|---|---|
| Levels, creatures, badges, trophies, bought themes and effects, Endless records, words to practice | Kept from both copies; the best value wins |
| Totals (letters, sentences, points ever earned…) | The higher value wins |
| Points to spend, equipped theme and effect, settings | The newer copy wins |

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
js/fx.js               read-aloud voice, sounds, celebration effects
js/app.js              screens and routing: profiles, family, home map, play, shop, zoo, grown-ups
js/util.js, js/store.js, js/cloud.js, js/vendor/   the app shell: helpers, profiles, Firebase sync, Firebase SDK 10.14.1
sw.js                  offline cache (every file is listed in FILES)
manifest.webmanifest, icons/   name and icons for "Add to Home Screen"
firestore.rules        Firestore security rules (already set in the shared project)
.github/workflows/pages.yml    tests + deploy to GitHub Pages
tests/shell.test.js    merging two copies (every rule above), storage, preview, save code, family key, offline file list
tests/content.test.js  every level of every grade: 5 different, valid sentences, getting harder
tests/smoke.mjs        in Chromium: a level, Endless, shop, zoo, grown-ups, preview, back gesture, two profiles, reload
tests/cloud-e2e.mjs    two "devices" syncing through the real Firebase project
```

How the code is organized: every file attaches itself to the global `APP` object. A screen is a function that calls `render(html)`. Buttons carry `data-act="<action>" data-arg="<argument>"`, and their handlers live in `ACTIONS`. `go('<screen>')` changes screen and records it for the back gesture. After changing `APP.state`, the code calls `APP.store.save()`, which saves locally and uploads to the family.

To add sentences or words, edit `js/content.js` and run `node tests/content.test.js`.

## Running the tests

```sh
node tests/shell.test.js
node tests/content.test.js
node tests/smoke.mjs        # needs Playwright with Chromium
node tests/cloud-e2e.mjs    # needs Playwright and internet
```

To try the app locally, open `index.html`, or run `python3 -m http.server` and open http://localhost:8000. Family sync needs `http(s)://`.
