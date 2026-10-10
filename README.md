# Castle Defense: Night Siege

A night-defence browser game with a searchlight, finite waves and upgrades. The original 2D game lives in index.html with no build step or runtime dependencies.

A separate **[Night Siege 3D](https://rovlad.github.io/castle_defence/3d/)** adds a fixed first-person turret: rotate your gun and searchlight, aim up/down and shoot approaching enemies. Desktop and touch controls, finite waves, upgrades and sound settings are included. The player cannot walk. See [game3d/README.md](game3d/README.md) for source/build instructions; `3d/` is the committed GitHub Pages build.

## Play

Open index.html in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

- Start with Enter or **Start game**.
- Hold Left/Right arrow keys or touch buttons to rotate.
- Press Space or tap **Fire**. You begin with three in-flight bullet slots.
- Clear every enemy in the wave to reach resupply. Each breach consumes one of three castle health; the third ends the run.
- Between waves, recover one health and choose one upgrade: wider searchlight, faster turret or an additional bullet slot.
- After the four-second resupply break, tap **Start next wave**. There is no automatic countdown into combat. Keyboard 1/2/3 choose upgrades.
- Record your score after defeat (Y), play again, or return to the start screen (N).
- Use **Sound on/off** to mute. Sound is synthesized locally and starts after a user gesture. A synthesized rotor buzz starts as drones enter the battlefield, pans toward the nearest threat and grows louder as it approaches. The mute preference survives reloads; play still works when audio is unavailable.

Wave 1 has five enemies; later waves add two up to 25, with shorter spawn intervals and faster movement. Armored enemies arrive from wave 3 and heavies from wave 5. Scout, armored and heavy drones take one, two and three hits respectively. Scouts and armored drones have four spinning rotors; heavies have six. The searchlight reveals enemies but does not damage them; enemies fade shortly after leaving the beam.

Beam upgrades add 5° up to 90°, the turret can be upgraded six times, and ammunition upgrades reach six bullet slots. You choose only once per wave. If every upgrade is at maximum, continue after resupply without a choice.

## Scores and mobile use

The circular battlefield scales up to 960px wide on desktop screens of at least 900px, keeping the same combat coordinates and timing. The layout scales to desktop and mobile, with touch controls and health/ammunition indicators. Below the battlefield, a wave panel shows progress, enemies remaining, elapsed wave time and the next-enemy countdown. Waves end when all enemies are resolved, so there is no fixed countdown to the wave end. High scores appear on the start screen. Terrain, ruins, mist, searchlight, trails and particles are drawn locally on canvas. The tower has stonework, battlements and lit windows; its cannon has cooling rings, a turret bearing and visible recoil.

Scores are stored in this browser, not shared across devices. Blocked storage falls back to session-only scores. Survival time stops at the final breach and excludes resupply and hidden-page pauses. New wave-mode scores rank ahead of retained older scores, which are labeled Legacy level because the modes are not directly comparable. All upgrades reset for a new run.

The game pauses when the page is hidden and resumes without advancing enemies or inflating score time. Audio also suspends while hidden.

## Verification

Run `node check.cjs` with Node.js. The dependency-free simulated-DOM checks cover controls, combat, health, score storage, finite waves, repairs, resupply gating, upgrade limits, ammunition capacity, pause accounting and synthesized-audio lifecycle/mute behavior.

These checks do not verify actual canvas rendering, physical touch interaction or audible sound quality. Play-test desktop and mobile browsers for those.
