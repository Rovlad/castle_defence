# Castle Defense: Night Siege

A standalone browser game. Rotate a searchlight and gun to defend your castle from monsters approaching through the darkness.

## Play

Open `index.html` directly in a browser, or serve the folder with `python3 -m http.server 8000` and visit http://localhost:8000. No build step or dependencies are required to play.

- Start: Enter or **Start game**.
- Rotate: hold Left/Right arrow keys or the on-screen Left/Right buttons.
- Shoot: press Space or tap **Fire**. At most three bullets can be in flight.
- After defeat: choose **Record score** (Y) or **Play again**. N returns to the start screen.

Levels advance every 60 seconds. From level 3, monsters follow curved paths; later levels introduce armored and heavy monsters. The searchlight reveals enemies but does not damage them.

The layout fits desktop and mobile screens. High scores are saved in this browser's local storage; they are not shared across devices. If storage is blocked, scores last only for the current session. Survival time stops at the castle breach.

## Verification

With Node.js installed, run `node check.cjs`. This dependency-free check verifies game logic, input handling, score persistence and safe name rendering using a simulated DOM. It does not test actual browser layout or hardware touch input; also play-test desktop and mobile browsers.
