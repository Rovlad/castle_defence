# Night Siege 3D

A separate, fixed-position first-person castle defence game. The original 2D game remains at the repository root.

The player stays at `(0, 5.8, 0)` on the turret. Aim rotates yaw and pitch; no input changes position. A searchlight reveals approaching enemies. The gun fires physical, swept-collision bullets, independently of visibility. Decorative ruins are scenery and do not block bullets.

## Play

The committed build is served at `/castle_defence/3d/` on GitHub Pages once merged and deployed. It must be served over HTTP; opening the module bundle through `file://` is unsupported.

- Desktop: drag the mouse or hold arrow keys to aim; click or hold Space to fire. Once equipped, press P or tap the radar's JAM button to activate the jammer.
- Touch: drag the battlefield to aim, hold left/right buttons to rotate, and tap or hold FIRE. Aim and fire support simultaneous pointers. Touch drags ease over 25ms and firing applies any pending drag first. Optional gentle assistance nudges toward visible targets within four degrees of the crosshair; it is enabled by default on touch devices.
- Each wave must finish spawning and every target must be shot down or breach before it clears. Start with three castle health and three in-flight bullet slots. Targets are low-flying drones with spinning rotors, gentle altitude changes and engine glow: scouts take one hit, armored drones from wave 3 take two, and six-rotor heavies from wave 5 take three. Flight heights range from about 2.8 to 4 metres, below the turret. Aim at the drone body; hits and impacts follow its actual altitude. Nearby engine sounds pan toward approaching targets.
- From wave 2, scouts zigzag; armored drones fly steadily and heavies make brief attack runs. All paths keep closing on the castle. Impacts briefly flash the hull, surviving damaged drones show scorched armor and smoke, and destroyed drones burst into sparks, debris and smoke. Effects are capped at 160 and cleaned up after expiry or restart. The mounted cannon has cooling rings, a shield, recoil and bright elongated tracers; a generated radial texture feathers the searchlight over atmospheric fog.
- Clear a wave to repair one health and choose one upgrade. After four seconds, explicitly start the next wave. A new run resets upgrades. Existing searchlight, turret and ammo upgrades are joined by stronger shots (up to 3 damage), faster rounds (up to 100m/s), explosive shells (1 splash damage within 4m of the hit drone, excluding the direct target), and a radar jammer (slows all incoming drones to 45% speed for 4s, recharges over 18 combat seconds). Shell damage/speed are captured when fired; explosions can hit drones outside the beam. Ability timers pause with combat. All-maxed loadouts can still continue.
- Settings pauses play and contains sound, a test chime, sensitivity, aim assistance and graphics quality. The aim-assistance selection applies to every input device, including mouse and hybrid touch/trackpad devices. Hidden tabs pause simulation. Sound starts after a gesture and attempts the playback audio session on supported iOS versions. Actual iPhone audio output still needs a device test.
- The bottom HUD shows resolved enemies, remaining enemies and elapsed wave time. Best results stay on the opening screen and are local to this browser.
- The radar stays north-up with the castle at its centre. The gold sector follows the searchlight heading and width; coral markers show all live targets, including those outside the beam. Markers move inward as targets approach, pulse red nearby, and disappear after a kill or breach. Rings identify armored enemies and diamonds identify heavies.
- Within 24m, a directional badge and radar rim arc warn about the drone with the shortest estimated time to breach, including drones behind the player. The arrow turns relative to your aim; warning sounds pan toward the threat. A cyan radar ring shows an active jammer. Ammo status shows READY, CYCLING or IN FLIGHT.

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

`check.ts` checks swept hits, the stationary player, pitch limits, projectile limits, armor, castle breaches, finite waves, all upgrade choices/caps, firing after resupply, touch smoothing, assistance boundaries, threat selection, flight patterns, splash damage and combat-only jammer timers. These model tests do not establish real GPU performance or audible output. Browser checks should cover portrait/landscape touch layouts, aiming/firing, settings pauses, restart and audio on Safari as well as Chrome.

`src/model.ts` owns combat state, `arena.ts` owns rendering, `audio.ts` owns synthesized sound and `main.ts` wires input and dialogs. The camera has no built-in movement inputs and is reset to the station each frame.
