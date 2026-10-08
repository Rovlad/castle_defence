# Castle Defense: Night Siege

A standalone night-defence browser game with a searchlight, finite waves and upgrades. All gameplay, artwork and audio live in index.html; no build step or runtime dependencies.

## Play

Open index.html in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

- Start with Enter or **Start game**.
- Hold Left/Right arrow keys or touch buttons to rotate.
- Press Space or tap **Fire**. You begin with three in-flight bullet slots.
- Clear every enemy in the wave to reach resupply. Each breach consumes one of three castle health; the third ends the run.
- Between waves, recover one health and choose one upgrade: wider searchlight, faster turret or an additional bullet slot.
- After the four-second resupply break, tap **Start next wave**. There is no automatic countdown into combat. Keyboard 1/2/3 choose upgrades.
- Record your score after defeat (Y), play again, or return to the start screen (N).
- Use **Sound on/off** to mute. Sound is synthesized locally and starts after a user gesture. Footsteps pan toward approaching threats. The mute preference survives reloads; play still works when audio is unavailable.

Wave 1 has five enemies; later waves add two up to 25, with shorter spawn intervals and faster movement. Armored enemies arrive from wave 3 and heavies from wave 5. Runner, armored and heavy silhouettes take one, two and three hits respectively. The searchlight reveals enemies but does not damage them; enemies fade shortly after leaving the beam.

Beam upgrades add 5° up to 90°, the turret can be upgraded six times, and ammunition upgrades reach six bullet slots. You choose only once per wave. If every upgrade is at maximum, continue after resupply without a choice.

## Scores and mobile use

The layout scales to desktop and mobile, with touch controls and health/ammunition indicators. Terrain, ruins, mist, searchlight, trails and particles are drawn locally on canvas.

Scores are stored in this browser, not shared across devices. Blocked storage falls back to session-only scores. Survival time stops at the final breach and excludes resupply and hidden-page pauses. New wave-mode scores rank ahead of retained older scores, which are labeled Legacy level because the modes are not directly comparable. All upgrades reset for a new run.

The game pauses when the page is hidden and resumes without advancing enemies or inflating score time. Audio also suspends while hidden.

## Verification

Run `node check.cjs` with Node.js. The dependency-free simulated-DOM checks cover controls, combat, health, score storage, finite waves, repairs, resupply gating, upgrade limits, ammunition capacity, pause accounting and synthesized-audio lifecycle/mute behavior.

These checks do not verify actual canvas rendering, physical touch interaction or audible sound quality. Play-test desktop and mobile browsers for those.
