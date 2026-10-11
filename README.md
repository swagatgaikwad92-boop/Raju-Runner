# Mumbai Mayhem Runner

A complete, offline, no-account endless runner (Subway Surfers-style, Mumbai comedy theme). Pure HTML5 Canvas + vanilla JS, no build step, no API keys.

## Play it
- **Desktop:** double-click `index.html`. Arrow keys / WASD to move, Up/Space to jump, Down to slide, P to pause.
- **Android phone (quick test):** see "Test on Android" below.

## Files
| File | What it is |
|---|---|
| `index.html`, `style.css` | Menus, HUD, panels, responsive layout |
| `art.js` | **All visuals** and replaceable content: hero, chaser, obstacles, scenery, costumes, dialogue lines |
| `audio.js` | Procedural sound (SFX, street ambience, horns, Indian-scale music loop). No audio files |
| `game.js` | Gameplay, collision, spawning, missions, shop, achievements, save system |
| `sw.js`, `manifest.json`, `icon.svg` | Optional offline cache + "Add to Home screen" support |

## Test on Android
1. **Easiest:** deploy to GitHub Pages (below) and open the URL in Chrome on the phone. After the first load it works offline.
2. **Same Wi-Fi, no deploy:** on your computer run `python3 -m http.server 8000` inside this folder, find your computer's local IP (e.g. 192.168.1.20), and open `http://192.168.1.20:8000` in Chrome on the phone.
3. In Chrome, menu (⋮) → **Add to Home screen** to launch it full-screen like an app.
4. Opening `index.html` straight from the phone's Files app also works for the game itself (the offline cache needs http/https, but isn't required).

## Deploy to GitHub Pages
1. Create a new public repo on github.com (e.g. `mumbai-mayhem-runner`).
2. Upload **all files in this folder** (drag them onto the repo page, or `git add . && git commit -m "game" && git push`).
3. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`, Save.
4. After about a minute your game is live at `https://<your-username>.github.io/<repo-name>/`.
5. If you edit files later, bump `CACHE = 'mmr-v1'` in `sw.js` to `mmr-v2` so phones pick up the update.

## Game guide
- Swipe left/right = change lane, up = jump, down = slide (also works mid-air). On-screen arrows can be switched off in Settings.
- **Obstacles:** jump low ones (scooters, cones, barriers, handcarts, potholes), slide under *KAAM CHALU* frames, switch lanes around buses, auto-rickshaws and vendor stalls.
- **First hit** = stumble: the angry money-lender *Seth Motilal* starts chasing you. Hit again within 10 s and he catches you. Survive 10 s and he drops back.
- **Power-ups** (each has a timer bar): Magnet, Shield (absorbs one hit), Coin ×2, Zoom (fast + smash through everything), Slow-mo.
- **Progression:** coins buy costumes, the Railway-Side theme, Chai Boost (start with a shield) and power-up duration upgrades. Three daily missions are generated offline from the date. Achievements pay +50 coins. Everything saves in the browser (`localStorage`).
- **Accessibility:** sound toggle, optional spoken voice lines, big text, high contrast, calm mode (no screen shake or speed lines), keyboard play.

## Customising art and jokes
Characters are original placeholders (Gullu and Seth Motilal), not film likenesses. Everything replaceable is at the top of `art.js` in the `Assets` object: costume colours, hero and chaser dialogue, game-over quips and theme colours. To use your own character art, set `Assets.heroSprite` / `Assets.chaserSprite` to an `Image` (see `drawHero` / `drawChaser`); no game logic needs to change. Only use artwork and audio you have the rights to.
