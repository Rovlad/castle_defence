# Night Siege 3D

A separate, fixed-position first-person castle defence game. The original 2D game remains at the repository root.

The player stays at `(0, 5.8, 0)` on the turret. Aim rotates yaw and pitch; no input changes position. A searchlight reveals approaching enemies. The gun fires physical, swept-collision bullets, independently of visibility. Decorative ruins are scenery and do not block bullets.

## Play

The committed build is served at `/castle_defence/3d/` on GitHub Pages once merged and deployed. It must be served over HTTP; opening the module bundle through `file://` is unsupported.

- Desktop: drag the mouse or hold arrow keys to aim; click or hold Space to fire.
- Touch: drag the battlefield to aim, hold left/right buttons to rotate, and tap or hold FIRE. Aim and fire support simultaneous pointers.
- Each wave must finish spawning and every enemy must be killed or breach before it clears. Start with three castle health and three in-flight bullet slots. Armored enemies from wave 3 take two hits; heavies from wave 5 take three.
- Clear a wave to repair one health and choose one upgrade: searchlight width, rotation speed or ammunition. After four seconds, explicitly start the next wave. A new run resets upgrades.
- Settings pauses play and contains sound, a test chime, sensitivity and graphics quality. Hidden tabs pause simulation. Sound starts after a gesture and attempts the playback audio session on supported iOS versions. Actual iPhone audio output still needs a device test.
- The bottom HUD shows resolved enemies, remaining enemies and elapsed wave time. Best results stay on the opening screen and are local to this browser.
- The radar stays north-up with the castle at its centre. The gold sector follows the searchlight heading and width; coral markers show all live targets, including those outside the beam. Markers move inward as targets approach, pulse red nearby, and disappear after a kill or breach. Rings identify armored enemies and diamonds identify heavies.

## Develop and verify

Requires Node.js 22.18+ (or a newer LTS) and npm.

```sh
cd game3d
npm ci
npm test
npm run dev
npm run build
```

`npm run build` type-checks TypeScript and replaces the adjacent `3d/` deployment directory. Commit both source changes and rebuilt `3d/` files. No CDN or remote assets are needed at runtime. Babylon.js 9.30.0 powers the scene; Vite bundles the app. Meshes, terrain textures and sound are generated locally.

`check.ts` checks swept hits, the stationary player, pitch limits, projectile limits, armor, castle breaches, finite waves, upgrades, combat-only timing and firing after resupply. These model tests do not establish real GPU performance or audible output. Browser checks should cover portrait/landscape touch layouts, aiming/firing, settings pauses, restart and audio on Safari as well as Chrome.

`src/model.ts` owns combat state, `arena.ts` owns rendering, `audio.ts` owns synthesized sound and `main.ts` wires input and dialogs. The camera has no built-in movement inputs and is reset to the station each frame.
