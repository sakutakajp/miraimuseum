import { PerspectiveCamera } from "three";
import { CAMERA } from "../config";
import { mix, smoothstep } from "../math";
import type { LandingRuntimeState } from "../types";
export class MuseumCamera {
  readonly camera = new PerspectiveCamera(37, 1, 0.1, 40);
  resize(s: LandingRuntimeState) {
    const preset =
      s.viewportWidth < 760 && s.viewportHeight > s.viewportWidth
        ? CAMERA.mobile
        : CAMERA.desktop;
    this.camera.fov = preset.fov;
    this.camera.aspect = s.viewportWidth / s.viewportHeight;
    this.camera.updateProjectionMatrix();
  }
  update(s: LandingRuntimeState) {
    const mobile = s.viewportWidth < 760 && s.viewportHeight > s.viewportWidth;
    const preset = mobile ? CAMERA.mobile : CAMERA.desktop;
    const advance = smoothstep(0.35, 1.25, s.scrollVh);
    const recede = smoothstep(2.75, 4.6, s.scrollVh);
    // Reduced motion uses a calm specimen distance, without the long camera dive.
    const z = s.reducedMotion
      ? preset.thresholdZ
      : mix(
          mix(preset.thresholdZ, preset.scaleZ, advance),
          preset.connectedZ,
          recede,
        );
    this.camera.position.set(s.pointerX * 0.03, s.pointerY * -0.02, z);
    this.camera.lookAt(0, 0, 0);
  }
}
