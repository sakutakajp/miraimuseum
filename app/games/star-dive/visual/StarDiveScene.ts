import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { StarDiveRuntime } from "../StarDiveRuntime";
import { VisualDirector } from "./VisualDirector";
import { makeShip, makeTarget, disposeObject } from "./models";
import { tiers, type Quality } from "../performance/PerformanceManager";

const seed = (i: number) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export class StarDiveScene {
  readonly group = new T.Group();
  readonly visual = new VisualDirector();
  private ship = makeShip();
  private shipQuality: Quality = "medium";
  private targets = new Map<number, T.Group>();
  private stars: T.Points;
  private rocks: T.InstancedMesh;
  private debris: T.InstancedMesh;
  private shots: T.InstancedMesh;
  private tunnel = new T.Group();
  private tunnelRocks: T.InstancedMesh;
  private tunnelVeins: T.InstancedMesh;
  private tunnelCrystals: T.InstancedMesh[] = [];
  private ambient = new T.HemisphereLight("#b5dbff", "#1c103c", 1.2);
  private sun = new T.DirectionalLight("#ffffff", 2.1);
  private gate = new T.Group();
  private climax = new T.Group();
  private beam: T.Mesh;
  private sign: T.Group;
  private exitLight: T.Mesh;
  private nebula: T.Mesh<T.PlaneGeometry, T.ShaderMaterial>;
  private helper = new T.Object3D();
  private color = new T.Color();
  private environment: T.WebGLRenderTarget;
  private previousEnvironment: T.Scene["environment"];
  private collider = new T.Group();
  private colliderIds = "";
  private collisionVisible = false;
  private previousBackground: T.Scene["background"];
  private rockLOD = [
    new T.IcosahedronGeometry(1, 0),
    new T.IcosahedronGeometry(1, 1),
    new T.IcosahedronGeometry(1, 2),
  ];

  constructor(
    private scene: T.Scene,
    renderer: T.WebGLRenderer,
    private camera: T.PerspectiveCamera,
  ) {
    this.previousEnvironment = scene.environment;
    this.previousBackground = scene.background;
    const generator = new T.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    this.environment = generator.fromScene(room, 0.04, 0.1, 100, { size: 64 });
    room.dispose();
    generator.dispose();
    scene.environment = this.environment.texture;
    scene.background = new T.Color("#050b24");
    this.group.add(this.ship);
    this.group.add(this.ambient);
    this.sun.position.set(-5, 8, 4);
    this.group.add(this.sun);
    const rim = new T.PointLight("#51dfff", 40, 30);
    rim.position.set(4, 2, -5);
    this.group.add(rim);

    const positions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      positions[i * 3] = (seed(i) - 0.5) * 150;
      positions[i * 3 + 1] = (seed(i + 1000) - 0.5) * 100;
      positions[i * 3 + 2] = -seed(i + 2000) * 150;
    }
    const starsGeometry = new T.BufferGeometry();
    starsGeometry.setAttribute("position", new T.BufferAttribute(positions, 3));
    this.stars = new T.Points(
      starsGeometry,
      new T.PointsMaterial({
        color: "#c4e9ff",
        size: 0.14,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.group.add(this.stars);
    this.nebula = new T.Mesh(
      new T.PlaneGeometry(400, 300),
      new T.ShaderMaterial({
        uniforms: { time: { value: 0 }, inside: { value: 0 } },
        depthWrite: false,
        vertexShader:
          "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: `varying vec2 vUv;uniform float time;uniform float inside;void main(){vec2 p=vUv-.5;float f=sin(p.x*9.+sin(p.y*12.+time*.03))*sin(p.y*7.-p.x*5.);float haze=exp(-length(p-vec2(.18,.02))*3.);vec3 c=mix(vec3(.014,.025,.08),vec3(.12,.065,.32),haze*(.5+f*.25));c+=vec3(.015,.1,.17)*pow(max(0.,f),3.);gl_FragColor=vec4(mix(c,vec3(.008,.07,.095),inside*.8),1.);}`,
      }),
    );
    this.nebula.position.z = -140;
    this.group.add(this.nebula);

    const rockMaterial = new T.MeshStandardMaterial({
      color: "#526278",
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    });
    this.rocks = new T.InstancedMesh(this.rockLOD[1]!, rockMaterial, 100);
    this.rocks.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.rocks.frustumCulled = false;
    this.group.add(this.rocks);
    this.debris = new T.InstancedMesh(
      new T.TetrahedronGeometry(0.1),
      new T.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#8cdaff",
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.85,
      }),
      160,
    );
    this.debris.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.debris.frustumCulled = false;
    this.group.add(this.debris);
    this.shots = new T.InstancedMesh(
      new T.CylinderGeometry(0.035, 0.035, 0.9, 5),
      new T.MeshBasicMaterial({ color: "#aaffff", toneMapped: false }),
      64,
    );
    this.shots.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.shots.frustumCulled = false;
    this.group.add(this.shots);

    this.tunnelRocks = new T.InstancedMesh(
      new T.TorusGeometry(7.5, 2.2, 5, 12),
      new T.MeshStandardMaterial({ color: "#203340", roughness: 0.95 }),
      18,
    );
    this.tunnelVeins = new T.InstancedMesh(
      new T.TorusGeometry(5.27, 0.045, 4, 36),
      new T.MeshStandardMaterial({
        color: "#124653",
        emissive: "#21bcd8",
        emissiveIntensity: 1.5,
      }),
      18,
    );
    this.tunnel.add(this.tunnelRocks, this.tunnelVeins);
    for (let kind = 0; kind < 2; kind++) {
      const crystals = new T.InstancedMesh(
        new T.ConeGeometry(0.4, 1.9, 5),
        new T.MeshStandardMaterial({
          color: kind ? "#392853" : "#1c4d4b",
          emissive: kind ? "#7047d1" : "#1bbaab",
          emissiveIntensity: 1.5,
          metalness: 0.45,
          roughness: 0.2,
        }),
        36,
      );
      this.tunnelCrystals.push(crystals);
      this.tunnel.add(crystals);
    }
    for (const mesh of [
      this.tunnelRocks,
      this.tunnelVeins,
      ...this.tunnelCrystals,
    ]) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    }
    this.group.add(this.tunnel);
    for (let i = 0; i < 2; i++) {
      const half = new T.Mesh(new T.IcosahedronGeometry(5, 1), rockMaterial);
      half.scale.set(0.55, 1.1, 0.45);
      half.position.x = i ? 2.5 : -2.5;
      this.gate.add(half);
      const seam = new T.Mesh(
        new T.BoxGeometry(0.055, 7, 0.09),
        new T.MeshBasicMaterial({ color: "#a7f7ff", toneMapped: false }),
      );
      seam.position.set(i ? 0.16 : -0.16, 0, 2.2);
      this.gate.add(seam);
    }
    this.group.add(this.gate);
    for (let i = 0; i < 10; i++) {
      const chunk = new T.Mesh(new T.IcosahedronGeometry(2, 0), rockMaterial);
      chunk.userData.index = i;
      this.climax.add(chunk);
    }
    this.group.add(this.climax);
    this.beam = new T.Mesh(
      new T.CylinderGeometry(0.35, 0.15, 60, 12),
      new T.MeshBasicMaterial({
        color: "#9dfaff",
        transparent: true,
        opacity: 0.75,
        blending: T.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.beam.rotation.x = Math.PI / 2;
    this.group.add(this.beam);
    this.sign = new T.Group();
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(
        new T.TorusGeometry(1.2 + i * 0.6, 0.025, 4, 32),
        new T.MeshBasicMaterial({ color: "#ffabdf", toneMapped: false }),
      );
      ring.rotation.z = i * 0.5;
      this.sign.add(ring);
    }
    const glyph = new T.Mesh(
      new T.OctahedronGeometry(0.55),
      new T.MeshStandardMaterial({
        color: "#ffc3ee",
        emissive: "#ff66c9",
        emissiveIntensity: 3,
      }),
    );
    this.sign.add(glyph);
    this.group.add(this.sign);
    this.exitLight = new T.Mesh(
      new T.CircleGeometry(7, 24),
      new T.MeshBasicMaterial({
        color: "#dcffff",
        transparent: true,
        opacity: 0.7,
        toneMapped: false,
      }),
    );
    this.exitLight.position.z = -80;
    this.group.add(this.exitLight);
    this.group.add(this.collider);
    scene.add(this.group);
  }

  showCollisions(value: boolean) {
    this.collisionVisible = value;
    this.collider.visible = value;
  }

  update(runtime: StarDiveRuntime, reduced: boolean, quality: Quality) {
    if (this.shipQuality !== quality) {
      this.group.remove(this.ship);
      disposeObject(this.ship);
      this.ship = makeShip(tiers[quality].segments);
      this.group.add(this.ship);
      this.shipQuality = quality;
    }
    const time = runtime.clock.time,
      p = runtime.player;
    this.visual.update(runtime, reduced);
    this.ship.position.set(p.x, p.y + Math.sin(time * 2) * 0.025, 0);
    this.ship.rotation.set(reduced ? 0 : p.pitch, 0, reduced ? 0 : p.roll);
    this.ship.visible =
      p.shield > 0 && !(p.invulnerable > 0 && Math.floor(time * 12) % 2);
    this.ship.traverse((part) => {
      if (part.name === "muzzle")
        part.visible = runtime.events.some(
          (e) => e.kind === "shot" && time - e.time < 0.055,
        );
      if (part.name === "exhaust" && part instanceof T.Mesh) {
        part.scale.y =
          1 +
          Math.min(p.speed, 8) * 0.07 +
          Math.sin(time * 35) * 0.06 +
          (runtime.score.risk - 1) * 0.3;
        (part.material as T.MeshStandardMaterial).emissive.set(
          runtime.score.risk >= 2.5
            ? "#ffc25a"
            : runtime.score.risk >= 1.5
              ? "#b875ff"
              : "#28cfff",
        );
      }
    });
    this.rocks.geometry =
      this.rockLOD[quality === "low" ? 0 : quality === "medium" ? 1 : 2]!;
    this.camera.position.set(
      runtime.camera.x + Math.sin(time * 97) * this.visual.shake,
      runtime.camera.y + Math.cos(time * 83) * this.visual.shake,
      12,
    );
    this.camera.lookAt(p.x * 0.18, p.y * 0.12, -10);
    this.camera.rotation.z += runtime.camera.roll;
    if (Math.abs(this.camera.fov - runtime.camera.fov) > 0.01) {
      this.camera.fov = runtime.camera.fov;
      this.camera.updateProjectionMatrix();
    }
    this.nebula.material.uniforms.time!.value = time;
    const inside = runtime.gateOpen && time >= 55 && time < 66.7;
    this.nebula.material.uniforms.inside!.value = inside ? 1 : 0;
    this.stars.visible = !inside;
    this.stars.position.z = (time * 6) % 30;
    this.stars.position.x = -p.x * 0.3;
    this.tunnel.visible = inside;
    this.exitLight.visible = inside && time > 63.5;
    this.exitLight.scale.setScalar(0.6 + Math.max(0, time - 63.5) * 0.4);
    this.ambient.intensity = inside ? 0.4 : 1.2;
    this.sun.intensity = inside ? 0.6 : 2.1;
    let rings = 0;
    for (let i = 0; i < 18; i++) {
      if (quality === "low" && i % 2) continue;
      const z = 12 - ((i * 6 + 120 - (time - 55) * 18) % 108);
      this.helper.position.set(0, 0, z);
      this.helper.rotation.set(0, 0, seed(i) * 3);
      this.helper.scale.setScalar(1);
      this.helper.updateMatrix();
      this.tunnelRocks.setMatrixAt(rings, this.helper.matrix);
      this.tunnelVeins.setMatrixAt(rings, this.helper.matrix);
      for (let j = 0; j < 4; j++) {
        const angle = (j * Math.PI) / 2 + seed(i) * 2;
        this.helper.position.set(
          Math.cos(angle) * 5.5,
          Math.sin(angle) * 5.5,
          z,
        );
        this.helper.rotation.set(0, 0, angle + Math.PI / 2);
        this.helper.updateMatrix();
        this.tunnelCrystals[j % 2]!.setMatrixAt(
          rings * 2 + Math.floor(j / 2),
          this.helper.matrix,
        );
      }
      rings++;
    }
    this.tunnelRocks.count = this.tunnelVeins.count = rings;
    this.tunnelRocks.instanceMatrix.needsUpdate =
      this.tunnelVeins.instanceMatrix.needsUpdate = true;
    for (const mesh of this.tunnelCrystals) {
      mesh.count = rings * 2;
      mesh.instanceMatrix.needsUpdate = true;
    }
    // The split rock frames the two risk routes before becoming the closed
    // entrance rock later. Decorative faces stay outside the playable bounds.
    const riskRift = time >= 40 && time < 47;
    this.gate.visible = riskRift || (time >= 50 && time < 60);
    this.gate.position.z = riskRift
      ? -45 + (time - 40) * 10
      : -36 + (time - 50) * 6;
    const opening = riskRift
      ? 3.5
      : runtime.gateOpen
        ? Math.min(5, Math.max(0, time - 56) * 2)
        : 0;
    this.gate.children[0]!.position.x = -2.5 - opening;
    this.gate.children[2]!.position.x = 2.5 + opening;
    this.gate.children[1]!.position.x = -0.16 - opening;
    this.gate.children[3]!.position.x = 0.16 + opening;
    this.gate.children[1]!.scale.x = this.gate.children[3]!.scale.x =
      1 + runtime.gateKills * 2;
    this.beam.visible = this.visual.beam > 0;
    this.beam.position.set(p.x, p.y, -29);
    this.beam.scale.setScalar(Math.max(0.05, this.visual.beam));
    this.sign.visible =
      (time >= 66.7 && time < 73) || (time >= 75.4 && time < 78);
    this.sign.position.set(0, 1, time >= 75.4 ? -12 : -35 + (time - 66.7) * 2);
    this.sign.rotation.z = time * 0.2;
    this.climax.visible = time >= 69 && time < 78;
    for (let i = 0; i < this.climax.children.length; i++) {
      const angle = (i * Math.PI * 2) / 10,
        split = Math.max(0, time - 72);
      const chunk = this.climax.children[i]!;
      chunk.position.set(
        Math.cos(angle) * (2.2 + split * 3),
        Math.sin(angle) * (2.2 + split * 3),
        -30 + (time - 69) * 8,
      );
      chunk.rotation.set(split * seed(i), split * 0.2, angle);
      chunk.scale.setScalar(1 + seed(i));
    }
    let rockCount = 0;
    const rock = (
      x: number,
      y: number,
      z: number,
      scale: number,
      id: number,
      hazard: boolean,
    ) => {
      this.helper.position.set(x, y, z);
      this.helper.rotation.set(time * 0.12 + id, id * 0.7, time * 0.08);
      this.helper.scale.set(scale, scale * 0.85, scale * 1.05);
      this.helper.updateMatrix();
      this.rocks.setMatrixAt(rockCount, this.helper.matrix);
      this.rocks.setColorAt(
        rockCount++,
        this.color.set(hazard ? "#dc9569" : "#667887"),
      );
    };
    // Three depth layers are decorative; only authored entities can damage.
    if (!inside)
      for (let i = 0; i < (quality === "low" ? 25 : 55); i++) {
        const side = i % 2 ? -1 : 1,
          z = 15 - ((seed(i + 20) * 150 + time * (6 + (i % 3) * 7)) % 150);
        rock(
          side * (6 + seed(i) * 28),
          (seed(i + 100) - 0.5) * 22,
          z,
          0.4 + seed(i + 40) * 1.8,
          i,
          false,
        );
      }
    for (const entity of runtime.entities)
      if (entity.kind === "asteroid")
        rock(entity.x, entity.y, entity.z, entity.radius, entity.id, true);
    this.rocks.count = rockCount;
    this.rocks.instanceMatrix.needsUpdate = true;
    if (this.rocks.instanceColor) this.rocks.instanceColor.needsUpdate = true;
    const liveIds = new Set(runtime.entities.map((e) => e.id));
    for (const [id, target] of this.targets)
      if (!liveIds.has(id)) {
        this.group.remove(target);
        disposeObject(target);
        this.targets.delete(id);
      }
    for (const entity of runtime.entities) {
      if (entity.kind === "asteroid") continue;
      let target = this.targets.get(entity.id);
      if (!target) {
        target = makeTarget(entity.kind);
        this.targets.set(entity.id, target);
        this.group.add(target);
      }
      target.position.set(entity.x, entity.y, entity.z);
      target.rotation.set(time * 0.6, time * 0.8, time * 0.35);
      target.scale.setScalar(
        entity.hp === 1 && entity.kind !== "shard" ? 0.85 : 1,
      );
    }
    this.shots.count = Math.min(64, runtime.shots.length);
    for (let i = 0; i < this.shots.count; i++) {
      const shot = runtime.shots[i]!;
      this.helper.position.set(shot.x, shot.y, shot.z);
      this.helper.rotation.set(Math.PI / 2, 0, 0);
      this.helper.scale.set(1, time >= 70 ? 2 : 1, 1);
      this.helper.updateMatrix();
      this.shots.setMatrixAt(i, this.helper.matrix);
    }
    this.shots.instanceMatrix.needsUpdate = true;
    let count = 0;
    for (const event of runtime.events) {
      if (!["hit", "destroy", "damage", "near", "gate"].includes(event.kind))
        continue;
      const age = time - event.time;
      if (age > 0.65) continue;
      const n = event.kind === "hit" ? 3 : event.big ? 18 : 10;
      for (let i = 0; i < n && count < tiers[quality].particles; i++) {
        const angle = seed(event.id + i) * Math.PI * 2,
          distance = age * (event.big ? 12 : 6);
        this.helper.position.set(
          event.x + Math.cos(angle) * distance,
          event.y + Math.sin(angle) * distance,
          event.z + age * 3,
        );
        this.helper.rotation.set(age * 3, i, angle);
        this.helper.scale.setScalar(
          Math.max(0.01, 1 - age / 0.65) * (event.big ? 1.6 : 0.8),
        );
        this.helper.updateMatrix();
        this.debris.setMatrixAt(count, this.helper.matrix);
        this.debris.setColorAt(
          count++,
          this.color.set(
            event.kind === "damage"
              ? "#ff8c58"
              : event.kind === "near"
                ? "#ffd884"
                : "#a3f8ff",
          ),
        );
      }
    }
    // MIRAI BURST: debris remains visible as the camera flies through the hole.
    if (time > 72 && time < 77)
      for (let i = 0; i < 35 && count < tiers[quality].particles; i++) {
        const angle = i * 2.4,
          spread = time - 72;
        this.helper.position.set(
          Math.cos(angle) * (2 + spread * 4),
          Math.sin(angle) * (2 + spread * 4),
          -25 + spread * 10 + seed(i) * 7,
        );
        this.helper.scale.setScalar(0.8);
        this.helper.updateMatrix();
        this.debris.setMatrixAt(count, this.helper.matrix);
        this.debris.setColorAt(count++, this.color.set("#ffe2bd"));
      }
    this.debris.count = count;
    this.debris.instanceMatrix.needsUpdate = true;
    if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
    if (this.collisionVisible) {
      const key = runtime.entities
        .filter((e) => e.kind === "asteroid")
        .map((e) => e.id)
        .join(",");
      if (key !== this.colliderIds) {
        disposeObject(this.collider);
        this.collider.clear();
        this.colliderIds = key;
        for (const e of runtime.entities.filter((e) => e.kind === "asteroid")) {
          for (const [radius, color] of [
            [e.radius + 0.22, "#ff7766"],
            [e.nearRadius + 0.22, "#68ffdd"],
          ] as const) {
            const wire = new T.Mesh(
              new T.SphereGeometry(radius, 8, 6),
              new T.MeshBasicMaterial({ color, wireframe: true }),
            );
            wire.userData.id = e.id;
            this.collider.add(wire);
          }
        }
      }
      for (const mesh of this.collider.children) {
        const e = runtime.entities.find((e) => e.id === mesh.userData.id);
        if (e) mesh.position.set(e.x, e.y, e.z);
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    disposeObject(this.group);
    this.rockLOD.forEach((g) => g.dispose());
    this.scene.environment = this.previousEnvironment;
    this.scene.background = this.previousBackground;
    this.environment.dispose();
    this.targets.clear();
  }
}
