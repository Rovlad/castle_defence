# Castle Defense: Night Siege

A night-defence browser game with a searchlight, finite waves and upgrades. The original 2D game lives in index.html with no build step or runtime dependencies.

A separate **[Night Siege 3D](https://rovlad.github.io/castle_defence/3d/)** adds a fixed first-person turret: rotate your gun and searchlight, aim up/down and shoot approaching enemies. Desktop and touch controls, finite waves, upgrades and sound settings are included. The player cannot walk. See [game3d/README.md](game3d/README.md) for source/build instructions; `3d/` is the committed GitHub Pages build.

## Play

Open index.html in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

- Start with Enter or **Start game**.
- Hold Left/Right arrow keys or touch buttons to rotate.
- Press Space or tap **Fire**. You begin with three in-flight bullet slots.
- Clear every enemy in the wave to reach resupply. Each breach destroys the nearest intact piece of refinery equipment. You start with five; losing all five ends the run.
- Between waves, buy a repair for 50 points to restore one destroyed piece of equipment, or spend earned points on wider searchlight (30), faster turret (40), or an additional bullet slot (50). Buy multiple affordable upgrades or save your points.
- After the four-second resupply break, tap **Start next wave**. There is no automatic countdown into combat. Keyboard 1–7 buy the listed upgrades.
- Record your score after defeat (Y), play again, or return to the start screen (N).
- Use **Sound on/off** to mute. Sound is synthesized locally and starts after a user gesture. A synthesized rotor buzz starts as drones enter the battlefield, pans toward the nearest threat and grows louder as it approaches. The mute preference survives reloads; play still works when audio is unavailable.

Wave 1 has five enemies; later waves add two up to 25, with shorter spawn intervals and faster movement. Scouts begin zigzagging at wave 2; armored drones arrive from wave 3 and fly steadily; heavies arrive from wave 5 and accelerate for two seconds of every six-second flight cycle. Scout, armored and heavy drones take one, two and three hits respectively. Scouts and armored drones have four spinning rotors; heavies have six. The searchlight reveals enemies but does not damage them; enemies fade shortly after leaving the beam.

Beam upgrades add 5° up to 90°, the turret can be upgraded six times, and ammunition upgrades reach six bullet slots. Scouts, armored drones and heavies award 10, 20 and 30 points per kill, and clearing a wave adds 20 points. A completed wave with no breaches adds another 50 points. The results show kills, breaches, direct-hit accuracy, combat time and earned points. Purchases are optional, with no one-purchase limit; unspent points carry between waves. The weapon shop also offers stronger shots for 100 points (up to 3 direct damage), faster rounds for 60 points (two levels), and explosive shells for 150 points (1 splash damage within 55 world pixels, excluding the directly hit drone). Each fired bullet retains its damage, speed and explosive payload. Collision checks sweep its travelled path to prevent fast rounds skipping targets. Continue after resupply even without a purchase.

## Scores and mobile use

The circular battlefield scales up to 960px wide on desktop screens of at least 900px, keeping the same combat coordinates and timing. The layout scales to desktop and mobile, with touch controls and health/ammunition indicators. Below the battlefield, a wave panel shows progress, enemies remaining, elapsed wave time and the next-enemy countdown. Waves end when all enemies are resolved, so there is no fixed countdown to the wave end. High scores appear on the start screen. Terrain, ruins, mist, searchlight, trails and particles are drawn locally on canvas. Damaged drones flash and emit smoke; destroyed drones scatter sparks, debris and smoke, with a shared cap of 160 effects. A north-up radar shows every drone, including those outside the beam, with a sector matching your searchlight. Nearby threats trigger a directional breach warning and a panned alert; the highlighted radar target has the shortest estimated time to breach within 180 world pixels. The refinery has five industrial units connected by pipes around a central turret cannon: a domed storage tank, a rectification column with tray bands and a ladder, a horizontal heat exchanger, a motor-driven pump station, and a tapered cooling tower with steam. Operational units have green indicators; destroyed units become charred wreckage. The cannon has cooling rings, a turret bearing and visible recoil.

Scores are stored in this browser, not shared across devices. Blocked storage falls back to session-only scores. Survival time stops at the final breach and excludes resupply and hidden-page pauses. New wave-mode scores rank ahead of retained older scores, which are labeled Legacy level because the modes are not directly comparable. Points and upgrades reset for a new run.

The game pauses when the page is hidden and resumes without advancing enemies or inflating score time. Audio also suspends while hidden.

## Verification

Run `node check.cjs` with Node.js. The dependency-free simulated-DOM checks cover controls, combat, health, score storage, finite waves, repairs, resupply gating, upgrade limits, ammunition capacity, pause accounting and synthesized-audio lifecycle/mute behavior.

These checks do not verify actual canvas rendering, physical touch interaction or audible sound quality. Play-test desktop and mobile browsers for those.
