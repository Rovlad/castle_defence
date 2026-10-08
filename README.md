# Castle Defense: Night Siege

A standalone browser game. Rotate a searchlight and gun to defend your castle from monsters approaching through the darkness.

## Play

Open `index.html` directly in a browser, or serve the folder with `python3 -m http.server 8000` and visit http://localhost:8000. No build step or dependencies are required to play.

- Start: Enter or **Start game**.
- Rotate: hold Left/Right arrow keys or the on-screen Left/Right buttons.
- Shoot: press Space or tap **Fire**. At most three bullets can be in flight.
- After defeat: choose **Record score** (Y) or **Play again**. N returns to the start screen.

Your castle has three health points. Each breach consumes one; the third ends the run. Cracks and a brief warning show damage. The first enemy appears inside the searchlight after 2.5 seconds, followed by enemies every six seconds initially.

Levels advance every 60 seconds and increase spawn rate and speed. From level 3, monsters follow curved paths and armored enemies appear; level 5 introduces slower heavies. Narrow runners take one hit, hexagonal armored enemies two, and broad heavies three. The searchlight reveals enemies but does not damage them; enemies fade from sight shortly after it moves away.

The night battlefield uses cached terrain, ruins, mist, a soft searchlight, bullet trails, muzzle flashes and impact fragments. No external artwork or runtime dependencies are needed.

The layout fits desktop and mobile screens. High scores are saved in this browser's local storage; they are not shared across devices. If storage is blocked, scores last only for the current session. Survival time stops at the final castle breach. Existing local high scores are retained.

## Verification

With Node.js installed, run `node check.cjs`. This dependency-free check verifies game logic, three-breach health, opening spawn timing, visibility fades, enemy tiers, combat effects, input handling, score persistence and safe name rendering using a simulated DOM. It does not test actual browser layout or hardware touch input; also play-test desktop and mobile browsers.
