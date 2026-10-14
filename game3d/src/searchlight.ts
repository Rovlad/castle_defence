import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { SpotLight } from '@babylonjs/core/Lights/spotLight.js';
import type { V3 } from './model.ts';

export function pointSearchlight(light: SpotLight, direction: V3) {
    // Assign through Babylon's setter so the projected beam texture follows aim.
    // Mutating light.direction in place leaves its cached projection view stale.
    light.direction = new Vector3(direction.x, direction.y, direction.z);
}
