# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Castle Defense: Night Siege" — a browser canvas game contained entirely in `index.html`. HTML, CSS, and JS are in that one file; there is no build step, no package manager, no dependencies, a dependency-free Node regression check (`node check.cjs`), and no linter. `README.md` is a one-line stub.

## Running

```bash
open index.html                 # opens directly via file:// — works, no server needed
python3 -m http.server 8000     # optional: serve at http://localhost:8000
```

Run `node check.cjs` for game logic regression checks. Browser rendering and real touch interactions still need manual verification. The responsive grid scales the 800×800 canvas to the viewport, places statistics above it and controls/leaderboard below it. Pointer buttons support held rotation; Fire, Start, record score and restart use clickable buttons.

## Architecture

All script code lives inside a single `DOMContentLoaded` callback. Nothing is attached to `window`, so `gameState` is **not** reachable from the console for debugging — add a temporary `window.gameState = gameState` if you need to poke at it.

**Loop.** `gameLoop()` is a `requestAnimationFrame` recursion calling `updateGame()` then `draw()`. It starts immediately on load and never stops; `updateGame()` early-returns when `gameState.gameStarted` is false or `gameState.gameOver` is true, so the start screen and the game-over screens are just DOM overlays on a loop that keeps running.

**Time base.** `updateGame()` computes `deltaTime` in seconds from `Date.now()`. Everything that moves multiplies by `deltaTime * 60`, so the stored speed constants (`Bullet.vx = 8`, `Monster.speed = 0.3 + ...`) are still expressed as *pixels per frame at 60fps*. Keep that convention when adding motion — mixing raw per-frame increments back in will make the game framerate-dependent again (see commit `c6ff6f1`, which fixed exactly that). Countdown values (`Monster.hitFlash`, `BouncingBullet.lifetime`) follow the same convention: stored in frame units, decayed with `-= deltaTime * 60`.

`deltaTime` is clamped to `MAX_DELTA_TIME` (0.033s, one 30fps frame). `requestAnimationFrame` stops while a tab is backgrounded, and an unclamped resume step would move monsters hundreds of pixels and jump bullets clean through hitboxes in a single frame. Don't remove the clamp — a bullet travels 8px per 60fps frame against a 19px combined collision radius, so anything past ~0.04s starts tunnelling.

**Geometry.** Fixed 800×800 canvas; `gameRadius = 380` is the spawn ring and bullet despawn boundary, `castleRadius = 60` is the breach threshold. Monsters spawn at a random angle on the ring and steer toward the center. Everything is polar math around `centerX/centerY`.

**The beam is visibility only, not a weapon.** `Monster.update()` sets `this.visible` by comparing the monster's angle to `gameState.beamAngle` within `beamWidth / 2`, and `draw()` skips invisible monsters. Bullet–monster collision is plain distance checking and ignores visibility entirely — you can kill what you can't see.

**Difficulty ramp.** Levels advance every 60s of wall time. Per level: `monsterSpawnInterval` drops 0.5s (floor 1s) and monster speed rises 0.1. From level 3 monsters gain sinusoidal curved drift. Monster tiers key off `gameState.monsterCount`, a lifetime spawn counter, not a per-level one: level ≥7 and every 3rd spawn → 3 HP `heavy` (green), level ≥5 and every 2nd spawn → 2 HP `armored` (purple), else 1 HP `normal` (red). Multi-HP monsters bounce the bullet off as a decorative `BouncingBullet` instead of dying.

**Fire limit.** Max 3 bullets in flight, enforced by `gameState.bullets.length <= 2` at push time. `keys.spacePressed` is a manual edge-detect latch so holding SPACE fires once.

**Death sequence** spans several fields and is easy to break piecemeal: a monster reaching the castle sets `atCastle` and flips `blinkingPhase`; `updateGame()` then returns early for 5 seconds of red blinking before setting `gameOver` + `showGameOverOptions` and revealing `#gameOver`. From there the keydown handler routes `Y` → `#nameEntry` and `N` → `resetToStartScreen()`.

**State reset.** `createState(highScores)` is the one definition of the state shape — add new fields there. `resetToStartScreen()` **reassigns `gameState` to a fresh object** rather than mutating it, passing `highScores` through as the only thing that survives a game. Because the object is swapped wholesale, nothing may cache a long-lived reference to `gameState` itself; read it through the binding each time. Timestamps captured in `createState()` are page-load-relative, so the Enter handler re-stamps `lastSpawnTime` / `lastLevelTime` / `gameStartTime` / `lastUpdateTime` at the moment play actually begins.

**High scores** — stored locally under `castle-defense-scores-v1`, validated when loaded and capped at 100 entries. Storage errors fall back to session-only scores. `updateTopScores()` sorts by level desc → kills desc → time asc and renders the top 3 with HTML-escaped names. `survivalTime` freezes at the first castle breach, so the blink sequence and name entry do not increase it. Input events leave name typing alone; blur, visibility changes and resets clear held keys.

## Conventions

Style matches what's already there: 4-space indent, `document.getElementById` with truthiness guards, classes with `update(deltaTime)` returning a boolean that `Array.filter` uses as "keep alive", and section comments above each block. Several `console.log` debug lines in the score-saving path are intentional leftovers.
