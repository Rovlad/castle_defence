# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Castle Defense: Night Siege" — a browser canvas game contained entirely in `index.html`. HTML, CSS, and JS are in that one file; there is no build step, no package manager, no dependencies, a dependency-free Node regression check (`node check.cjs`), and no linter. `README.md` contains play and verification instructions.

## Running

```bash
open index.html                 # opens directly via file:// — works, no server needed
python3 -m http.server 8000     # optional: serve at http://localhost:8000
```

Run `node check.cjs` for game logic regression checks. Browser rendering and real touch interactions still need manual verification. The responsive grid scales the 800×800 canvas to the viewport, places statistics above it and controls/leaderboard below it. Pointer buttons support held rotation; Fire, Start, record score and restart use clickable buttons.

## Architecture

All script code lives inside a single `DOMContentLoaded` callback. Nothing is attached to `window`, so `gameState` is **not** reachable from the console for debugging — add a temporary `window.gameState = gameState` if you need to poke at it.

**Loop.** `gameLoop()` is a `requestAnimationFrame` recursion calling `updateGame()` then `draw()`. It starts immediately on load and never stops; `updateGame()` early-returns when `gameState.gameStarted` is false or `gameState.gameOver` is true, so the start screen and the game-over screens are just DOM overlays on a loop that keeps running.

**Time base.** `updateGame()` computes `deltaTime` in seconds from `Date.now()`. Everything that moves multiplies by `deltaTime * 60`, so the stored speed constants (`Bullet.vx = 8`, `Monster.speed = 0.65 + ...`) are still expressed as *pixels per frame at 60fps*. Keep that convention when adding motion — mixing raw per-frame increments back in will make the game framerate-dependent again (see commit `c6ff6f1`, which fixed exactly that). Countdown values (`Monster.hitFlash`, `BouncingBullet.lifetime`) follow the same convention: stored in frame units, decayed with `-= deltaTime * 60`.

`deltaTime` is clamped to `MAX_DELTA_TIME` (0.033s, one 30fps frame). `requestAnimationFrame` stops while a tab is backgrounded, and an unclamped resume step would move monsters hundreds of pixels and jump bullets clean through hitboxes in a single frame. Don't remove the clamp — a bullet travels 8px per 60fps frame against a 19px combined collision radius, so anything past ~0.04s starts tunnelling.

**Geometry.** Fixed 800×800 canvas; `gameRadius = 380` is the spawn ring and bullet despawn boundary, `castleRadius = 60` is the breach threshold. Monsters spawn at a random angle on the ring and steer toward the center. Everything is polar math around `centerX/centerY`.

**The beam is visibility only, not a weapon.** `Monster.update()` sets `this.visible` by comparing the monster's angle to `gameState.beamAngle` within `beamWidth / 2`. A `reveal` value fades enemies over 0.35s after they leave the beam. Bullet–monster collision is plain distance checking and ignores visibility entirely — you can kill what you can't see.

**Waves.** `level` is the wave index. Wave 1 has 5 enemies; each wave adds 2 up to 25. `waveSpawned` counts spawns within this wave. The first enemy of each wave arrives after 2.5s, and only the first enemy of the run is placed in the beam. Spawn spacing starts at 2.6s, decreases 0.15s per wave, and bottoms at 0.8s. Wave completion requires all planned enemies to have spawned and all monsters to be resolved. Enemy speed is 0.65 + 0.1 per additional wave (pixels per 60fps frame). Curved paths and armored enemies start at wave 3; heavies start at wave 5. Armored enemies have 2 HP and 85% speed; heavies 3 HP and 65% speed.

**Intermission and upgrades.** `phase` is combat or intermission. `finishWave()` clears projectiles and held keys, repairs one health (max 3), displays the upgrade dialog and starts a four-second resupply break. No enemies move/spawn and no firing occurs during intermission. `chooseUpgrade()` permits one choice per break: beam +5° (max 90°), rotation +0.4 radians/s (max 5.4), ammo +1 (max 6). `nextWave()` needs both elapsed resupply time and a choice, except when all upgrades are maxed. The player explicitly starts the next wave. Keyboard 1/2/3 select upgrades, and Tab stays inside the dialog. Upgrade values reset on a new run.

**Fire limit.** `bulletLimit` starts at 3. Both keyboard and button shooting compare the in-flight count to that field. `keys.spacePressed` is the keyboard edge-detect latch; holding SPACE fires once.

**Audio.** Synthesized Web Audio needs no assets. The context is created/resumed after a user gesture; unavailable audio does not prevent play. A master gain controls mute, which is persisted under castle-defense-muted. There are at most 12 active oscillators, each stopped and disconnected after its short sound. Footsteps pan horizontally toward the nearest approaching monster. Shot, impact, armor, breach, clear and upgrade sounds are bounded in duration.

**Backgrounding and score time.** visibilitychange clears held inputs, suspends audio and records the pause. Resume shifts spawn, break, defeat and score timestamps and resets lastUpdateTime. Hidden pages do not simulate combat. Starting the next wave also removes intermission time from gameStartTime, so survivalTime measures combat time only.

**Castle damage and death.** Start with 3 health. Each monster reaching the castle damages it once, emits particles and is removed by returning false from update(). Nonfatal breaches keep play running; the final breach freezes `survivalTime`, starts `blinkingPhase`, and stops combat. After 1.2s, gameOver and showGameOverOptions reveal the score/restart overlay. Castle cracks reflect damage. `updateHud()` refreshes health, ammo and statistics, including after a reset.

**Rendering.** Terrain is generated once on an offscreen canvas, then copied each frame. Five translucent wedges feather the beam. Bullet trails, muzzle flash, sparks and death fragments provide feedback. Particles are capped at 160 and cleaned up by updateEffects(); effects and damage flashes decay with deltaTime. Cosmetic drawing must not mutate combat state.

**State reset.** `createState(highScores)` is the one definition of the state shape — add new fields there. `resetToStartScreen()` **reassigns `gameState` to a fresh object** rather than mutating it, passing `highScores` through as the only thing that survives a game. Because the object is swapped wholesale, nothing may cache a long-lived reference to `gameState` itself; read it through the binding each time. Timestamps captured in `createState()` are page-load-relative, so the Enter handler re-stamps `lastSpawnTime` / `lastLevelTime` / `gameStartTime` / `lastUpdateTime` at the moment play actually begins.

**High scores** — stored locally under `castle-defense-scores-v1`, validated when loaded and capped at 100 entries. Storage errors fall back to session-only scores. `updateTopScores()` sorts by level desc → kills desc → time asc and renders the top 3 with HTML-escaped names. `survivalTime` freezes at the final castle breach, so the blink sequence and name entry do not increase it. New scores carry mode=waves and rank ahead of retained pre-wave scores, which are labeled Legacy level; these modes are not directly comparable. Input events leave name typing alone; blur, visibility changes and resets clear held keys.

## Conventions

Style matches what's already there: 4-space indent, `document.getElementById` with truthiness guards, classes with `update(deltaTime)` returning a boolean that `Array.filter` uses as "keep alive", and section comments above each block. Several `console.log` debug lines in the score-saving path are intentional leftovers.
