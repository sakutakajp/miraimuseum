import { Camera, Color3, Color4, DirectionalLight, FreeCamera, HemisphericLight, Mesh, MeshBuilder, Quaternion, ShadowGenerator, StandardMaterial, TransformNode, Vector3, VertexData } from "@babylonjs/core";
import { SceneRuntime } from "../../three-d/runtime";
import { SceneAssets, instantiateModel } from "../../three-d/assets";
import { bindJumpInput } from "../../three-d/input";
import { qualityProfile, readSettings, type Quality } from "../../three-d/settings";
import { obstacleTop } from "../../game/dinosaur/systems/FixedStepWorld";
import { CameraDirector } from "../../game/dinosaur/systems/CameraDirector";
import { AudioDirector } from "../../game/dinosaur/systems/AudioDirector";
import { RunController } from "./RunController";
import { DINOSAUR_STAGE_1, type RunStage } from "./stage";
import type { Cue, DeepTimeRecord, ClearResult, RunMode } from "../../game/dinosaur/types";

interface Hooks { ready(): void; mode(value: RunMode): void; record(value: DeepTimeRecord): void; failed(progress: number): void; cleared(result: ClearResult): void; fatal(error: unknown): void; warning(message: "audio" | "model"): void }
type Ground = { mesh: Mesh; start: number; end: number; top: number; gap: boolean; collapseAt?: number };
export class RunWorld {
  readonly runtime: SceneRuntime;
  readonly controller: RunController;
  readonly audio = new AudioDirector();
  readonly assets: SceneAssets;
  private camera: FreeCamera;
  private composition: CameraDirector;
  private player?: ReturnType<typeof instantiateModel>;
  private hips: { node: TransformNode; pose: Quaternion; phase: number }[] = [];
  private ground: Ground[] = [];
  private obstacles: { mesh: Mesh; data: RunStage["rules"]["obstacles"][number] }[] = [];
  private decorations: { mesh: Mesh; seed: number; depth: number }[] = [];
  private herd: TransformNode[] = [];
  private rex: TransformNode;
  private dust: Mesh[] = [];
  private shadow?: ShadowGenerator;
  private material: StandardMaterial;
  private quality: Quality;
  private reduced: boolean;
  private flashAt = -100;
  private disposed = false;
  private ready = false;
  private startPending = false;
  private step = -1;
  private hudProgress = -1;
  private beforeMode: RunMode = "ready";
  static async create(canvas: HTMLCanvasElement, record: DeepTimeRecord, hooks: Hooks, progress: HTMLElement, signal: AbortSignal, stage = DINOSAUR_STAGE_1) {
    const world = new RunWorld(canvas, record, hooks, progress, stage);
    const cancel = () => world.dispose(); signal.addEventListener("abort", cancel, { once: true });
    world.runtime.own(() => signal.removeEventListener("abort", cancel));
    try {
      const model = await world.assets.load("/floating-earth/dinosaur.glb"); world.runtime.abort.signal.throwIfAborted();
      world.player = instantiateModel(model, "Brachiosaurus player", 54, Math.PI / 3, true);
      for (const mesh of world.player.meshes) { mesh.receiveShadows = true; mesh.isPickable = false; world.shadow?.addShadowCaster(mesh); }
      // Existing hip transforms support a restrained procedural gait; the source GLB has no walk clip.
      const hips = world.player.visual.getDescendants().filter(node => /Bone_(026|031|006|011)$/.test(node.name));
      world.hips = hips.filter((node): node is TransformNode => node instanceof TransformNode).map((node, index) => ({ node, pose: node.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(node.rotation), phase: index % 2 ? Math.PI : 0 }));
      await world.audio.load().catch(() => { if (!world.disposed) hooks.warning("audio"); });
      world.runtime.abort.signal.throwIfAborted();
      world.ready = true; hooks.ready();
      world.runtime.run(dt => world.update(dt));
      return world;
    } catch (error) { world.dispose(); throw error; }
  }
  private constructor(private canvas: HTMLCanvasElement, record: DeepTimeRecord, private hooks: Hooks, private progress: HTMLElement, readonly stage: RunStage) {
    const settings = readSettings(); this.quality = settings.quality; this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.runtime = new SceneRuntime(canvas, this.quality, error => { this.dispose(); hooks.fatal(error); });
    this.runtime.own(() => this.audio.dispose()); this.audio.setMuted(settings.muted); this.audio.setVolume(settings.volume);
    const scene = this.runtime.scene; scene.clearColor = Color4.FromHexString("#e9e4d8ff");
    scene.fogMode = 3; scene.fogStart = 650; scene.fogEnd = 1800; scene.fogColor = Color3.FromHexString("#e9e4d8");
    this.assets = new SceneAssets(scene, this.runtime.abort.signal); this.runtime.own(() => this.assets.dispose());
    this.camera = new FreeCamera("Side camera", new Vector3(0, 0, 850), scene); this.camera.setTarget(Vector3.Zero()); this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 1; this.camera.maxZ = 3000; this.composition = new CameraDirector(this.reduced, stage.camera);
    const hemi = new HemisphericLight("Bone skylight", Vector3.Up(), scene); hemi.intensity = 0.65; hemi.groundColor = Color3.FromHexString("#5a5246");
    const sun = new DirectionalLight("Late Cretaceous sun", new Vector3(...stage.lighting.sun), scene); sun.position.set(-300, 600, 350); sun.intensity = 0.95;
    this.shadow = new ShadowGenerator(512, sun); this.shadow.usePercentageCloserFiltering = true; this.shadow.darkness = 0.22;
    this.material = this.makeMaterial("Fossil soil", "#b7a68a");
    this.buildGround(); this.buildObstacles(); this.buildEnvironment();
    this.rex = this.makeDinosaur("rex", this.makeMaterial("Rex iron", "#686156"));
    this.rex.scaling.setAll(2); this.rex.setEnabled(false);
    const herdMat = this.makeMaterial("Herd fossil", "#899080");
    for (let i = 0; i < 3; i++) { const d = this.makeDinosaur("triceratops", herdMat); d.setEnabled(false); this.herd.push(d); }
    const dustMat = this.makeMaterial("Ash", "#756e62"); dustMat.alpha = 0.32;
    const template = MeshBuilder.CreateIcoSphere("Ash prototype", { radius: 1, subdivisions: 1 }, scene); template.material = dustMat;
    for (let i = 0; i < 30; i++) { const mesh = i === 0 ? template : template.clone(`Ash ${i}`)!; mesh.isPickable = false; this.dust.push(mesh); }
    this.controller = new RunController(stage, record, {
      mode: value => this.modeChanged(value), record: value => hooks.record(value), failed: p => { this.audio.stopMusic(); this.audio.play("death"); hooks.failed(p); },
      cleared: result => { this.audio.stopMusic(); this.audio.play("clear"); hooks.cleared(result); }, cue: cue => this.cue(cue),
      jump: () => this.audio.play("jump", 0.75), land: () => this.audio.play("land", 0.7),
      retry: () => { this.flashAt = -100; this.step = -1; this.audio.stopAll(); this.audio.start(); },
    });
    bindJumpInput(this.runtime, () => this.controller.jump(), () => this.controller.mode === "paused" ? this.resume() : this.controller.pause());
    this.runtime.listen(document, "visibilitychange", () => { if (document.hidden) this.controller.pause(); });
    this.runtime.listen(window, "blur", () => this.controller.pause());
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    this.runtime.listen(media, "change", () => { this.reduced = media.matches; this.composition = new CameraDirector(this.reduced, stage.camera); });
    this.setQuality(this.quality);
  }
  private makeMaterial(name: string, color: string) {
    const mat = new StandardMaterial(name, this.runtime.scene); mat.diffuseColor = Color3.FromHexString(color).toLinearSpace(); mat.specularColor = Color3.Black(); return mat;
  }
  private buildGround() {
    const { rules, goal } = this.stage;
    const boundaries = [...new Set([-1200, goal + 2000, ...rules.terrain.flatMap(t => [t.start, t.end])])].sort((a, b) => a - b);
    const geometry = MeshBuilder.CreateBox("Ground prototype", { size: 1 }, this.runtime.scene); geometry.material = this.material;
    for (let i = 1; i < boundaries.length; i++) {
      const start = boundaries[i - 1]!, end = boundaries[i]!, center = (start + end) / 2;
      const terrain = rules.terrain.find(t => center >= t.start && center < t.end);
      const mesh = i === 1 ? geometry : geometry.clone(`Ground section ${i}`)!;
      const top = -(terrain?.y ?? 0); mesh.scaling.set(end - start, 180, 125); mesh.position.y = top - 90; mesh.receiveShadows = true; mesh.isPickable = false;
      this.ground.push({ mesh, start, end, top, gap: terrain?.gap === true, collapseAt: terrain?.collapseAt });
    }
  }
  private buildObstacles() {
    const scene = this.runtime.scene;
    const rock = MeshBuilder.CreateIcoSphere("Rock prototype", { radius: 0.5, subdivisions: 1, flat: true }, scene); rock.material = this.makeMaterial("Readable obsidian rock", "#403f38"); rock.setEnabled(false);
    const root = MeshBuilder.CreateBox("Root prototype", { size: 1 }, scene); root.material = this.makeMaterial("Fallen wood", "#615542"); root.setEnabled(false);
    const orange = this.makeMaterial("Fallout rock", "#875143");
    for (const section of this.stage.sections) for (const place of section.placements) {
      const data = this.stage.rules.obstacles.find(o => o.id === place.id)!;
      const mesh = (place.modelId === "root" || place.modelId === "branch" ? root : rock).clone(place.id)!;
      mesh.scaling.set(...place.size); mesh.position.set(...place.position); mesh.rotation.set(...place.rotation); mesh.isPickable = false;
      if (data.kind === "falling") mesh.material = orange;
      mesh.receiveShadows = true; this.shadow?.addShadowCaster(mesh); this.obstacles.push({ mesh, data });
    }
  }
  private buildEnvironment() {
    const scene = this.runtime.scene;
    const colors = ["#c0bba7", "#979984", "#53654b"];
    for (let depth = 0; depth < 3; depth++) {
      const mat = this.makeMaterial(`Landscape depth ${depth}`, colors[depth]!);
      const template = depth === 2 ? this.makeFern() : this.makeRidge(depth); template.material = mat;
      for (let i = 0; i < 10; i++) {
        const mesh = i === 0 ? template : template.clone(`Landscape ${depth}/${i}`)!;
        const height = depth === 2 ? 40 + i % 4 * 20 : 140 + i % 5 * 40;
        mesh.scaling.set(depth === 2 ? 55 : 450, height, depth === 2 ? 30 : 240);
        mesh.position.set(0, depth === 2 ? -3 : -5, -180 - (2 - depth) * 240); mesh.rotation.y = i * 0.8; mesh.isPickable = false;
        this.decorations.push({ mesh, seed: i * (depth === 2 ? 185 : 500), depth });
      }
    }
    // Thin geological beds remain visible in 3D below the path and at the ending.
    const bedMat = this.makeMaterial("K-Pg charcoal stratum", "#37362f");
    for (const y of [-25, -90, -155]) {
      const bed = MeshBuilder.CreateBox(`Geological bed ${y}`, { width: 4000, height: y === -25 ? 3 : 2, depth: 130 }, scene);
      bed.position.set(800, y, 0); bed.material = bedMat; bed.isPickable = false;
    }
  }
  private makeFern() {
    const parts: Mesh[] = [];
    const scene = this.runtime.scene;
    const stem = MeshBuilder.CreateCylinder("Fern stem", { height: 1, diameter: 0.025, tessellation: 5 }, scene); stem.position.y = 0.5; parts.push(stem);
    for (let i = 0; i < 10; i++) {
      const leaf = MeshBuilder.CreateCylinder("Fern frond", { height: 0.48, diameterTop: 0, diameterBottom: 0.2, tessellation: 3 }, scene);
      const a = i * 2.39996, h = 0.3 + (i % 5) * 0.11;
      leaf.rotation.set(Math.sin(a) * 0.8, a, Math.cos(a) * 0.8);
      leaf.position.set(Math.cos(a) * 0.16, h, Math.sin(a) * 0.16); leaf.scaling.z = 0.16; parts.push(leaf);
    }
    const fern = Mesh.MergeMeshes(parts, true, true)!; fern.name = "Fern prototype"; return fern;
  }
  private makeRidge(seed: number) {
    const mesh = new Mesh("Weathered ridge", this.runtime.scene), positions: number[] = [], indices: number[] = [], normals: number[] = [];
    const profile = [0.12, 0.3, 0.32, 0.5, 0.47, 0.74, 0.69, 0.83, 0.62, 0.45, 0.52, 0.28, 0.18];
    for (let i=0;i<profile.length;i++) {
      const x=i/(profile.length-1)-0.5, y=profile[(i+seed*3)%profile.length]!;
      positions.push(x,0,-0.5,x,y,-0.5,x,0,0.5,x,y,0.5);
      if(i>0) { const a=(i-1)*4,b=i*4; indices.push(a,b,a+1,b,b+1,a+1,a+2,a+3,b+2,b+2,a+3,b+3,a+1,b+1,a+3,a+3,b+1,b+3); }
    }
    VertexData.ComputeNormals(positions,indices,normals); const data=new VertexData(); data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(mesh);return mesh;
  }
  private makeDinosaur(kind: "rex" | "triceratops", material: StandardMaterial) {
    const scene = this.runtime.scene, root = new TransformNode(kind, scene), parts: Mesh[] = [];
    const part = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const mesh = MeshBuilder.CreateIcoSphere(kind + " part", { radius: 0.5, subdivisions: 1, flat: true }, scene);
      mesh.position.set(x, y, z); mesh.scaling.set(sx, sy, sz); parts.push(mesh); return mesh;
    };
    if (kind === "rex") {
      part(0, 70, 0, 74, 45, 30); part(37, 95, 0, 25, 48, 25); part(58, 115, 0, 49, 29, 28);
      part(-55, 69, 0, 92, 17, 17).rotation.z = -0.17;
      for (const z of [-11, 11]) { part(-8, 26, z, 19, 54, 15).rotation.z = -0.18; part(18, 65, z, 26, 8, 6).rotation.z = -0.5; }
    } else {
      part(0, 37, 0, 96, 52, 38); part(56, 36, 0, 42, 36, 30); part(42, 54, 0, 12, 51, 49);
      part(-69, 36, 0, 74, 13, 13).rotation.z = -0.12;
      for (const x of [-29, 29]) for (const z of [-14, 14]) part(x, 13, z, 15, 30, 14);
      for (const z of [-9, 9]) { const horn = MeshBuilder.CreateCylinder("Horn", { height: 26, diameterTop: 0, diameterBottom: 6, tessellation: 5 }, scene); horn.rotation.z = -0.95; horn.position.set(67, 62, z); parts.push(horn); }
    }
    const merged = Mesh.MergeMeshes(parts, true, true)!; merged.material = material; merged.parent = root; merged.isPickable = false;
    this.shadow?.addShadowCaster(merged);
    const eyes = (scene.getMaterialByName("Dinosaur eyes") as StandardMaterial) ?? this.makeMaterial("Dinosaur eyes", "#171c17");
    for (const z of kind === "rex" ? [-14,14] : [-15,15]) {
      const eye = MeshBuilder.CreateSphere("Dinosaur eye", { diameter: kind === "rex" ? 3.8 : 2.4, segments: 6 }, scene);
      eye.position.set(kind === "rex" ? 62 : 60, kind === "rex" ? 121 : 43, z); eye.material = eyes; eye.parent = root; eye.isPickable = false;
    }
    const hornMat = (scene.getMaterialByName("Dinosaur ivory") as StandardMaterial) ?? this.makeMaterial("Dinosaur ivory", "#c5c0a8");
    if (kind === "triceratops") {
      const horn = MeshBuilder.CreateCylinder("Nose horn", { height: 13, diameterTop: 0, diameterBottom: 5, tessellation: 5 }, scene);
      horn.position.set(72,50,0);horn.rotation.z=-0.6;horn.material=hornMat;horn.parent=root;horn.isPickable=false;
    } else {
      for (let i=0;i<4;i++) {
        const tooth = MeshBuilder.CreateCylinder("Rex tooth", { height: 5, diameterTop: 0, diameterBottom: 3, tessellation: 3 }, scene);
        tooth.position.set(65+i*5,104,11);tooth.rotation.z=Math.PI;tooth.material=hornMat;tooth.parent=root;tooth.isPickable=false;
      }
    }
    return root;
  }
  private cue(cue: Cue) {
    if (cue.value === "impact-flash") { this.flashAt = this.controller.runtime.world.clock.elapsedSeconds; this.audio.play("impact"); }
    if (cue.type === "audio" && ["rex", "rock"].includes(cue.value)) this.audio.play(cue.value as "rex" | "rock");
  }
  private modeChanged(value: RunMode) {
    if (value === "paused") this.audio.pause();
    else if (this.beforeMode === "paused" && value === "running") this.audio.resume(this.controller.runtime.world.clock.elapsedSeconds);
    this.beforeMode = value; this.hooks.mode(value);
  }
  async start(immediate = false) {
    if (!this.ready || this.startPending || this.disposed) return;
    this.startPending = true;
    try { await this.audio.unlock(); } catch { this.hooks.warning("audio"); }
    if (!this.disposed) this.controller.start(immediate);
    this.startPending = false;
  }
  resume() { void this.audio.unlock().catch(() => this.hooks.warning("audio")); this.controller.resume(); }
  setQuality(value: Quality) {
    this.quality = value; this.runtime.setQuality(value);
    this.runtime.scene.shadowsEnabled = qualityProfile[value].shadows;
  }
  private update(dt: number) {
    this.controller.tick(dt);
    const { world } = this.controller.runtime, { state, clock } = world, t = clock.elapsedSeconds, section = this.controller.runtime.section.id;
    this.progress.closest<HTMLElement>(".deep-time-host")!.dataset.mode = this.controller.mode;
    const progress = Math.floor(clock.progress * 100);
    if (progress !== this.hudProgress) { this.hudProgress = progress; this.progress.textContent = `${progress}%`; }
    if (this.controller.mode === "running") {
      this.audio.monitor(t);
      const foot = Math.floor(clock.beat * (section === "predator" ? 0.5 : 2));
      if (foot !== this.step && ["herd", "predator"].includes(section)) { this.step = foot; this.audio.play("step", 0.28); }
    }
    const c = this.composition.compose(this.canvas.clientWidth, this.canvas.clientHeight, t, section);
    this.camera.orthoLeft = -c.playerX / c.scale; this.camera.orthoRight = (c.width - c.playerX) / c.scale;
    this.camera.orthoTop = c.floor / c.scale; this.camera.orthoBottom = -(c.height - c.floor) / c.scale;
    const ahead = (this.camera.orthoRight ?? 1200) + 200, behind = (this.camera.orthoLeft ?? -400) - 200;
    for (const part of this.ground) {
      const gap = part.gap && (part.collapseAt === undefined || t >= part.collapseAt);
      part.mesh.setEnabled(!gap && part.end - state.worldX > behind && part.start - state.worldX < ahead);
      part.mesh.position.x = (part.start + part.end) / 2 - state.worldX;
    }
    for (const { mesh, data } of this.obstacles) {
      const x = data.x - state.worldX; mesh.setEnabled(x > behind && x < ahead); mesh.position.x = x;
      mesh.position.y = -obstacleTop(data, t) - data.height / 2;
      if (data.kind === "falling") mesh.rotation.z = t * 0.8;
    }
    for (let i = 0; i < this.decorations.length; i++) {
      const part = this.decorations[i]!, span = part.depth === 2 ? 1850 : 5000;
      part.mesh.setEnabled(i % 10 < Math.floor(qualityProfile[this.quality].decorations / 3));
      part.mesh.position.x = ((part.seed - state.worldX * [0.06, 0.16, 0.34][part.depth]! + span * 100) % span) - span * 0.3;
    }
    const animate = this.controller.mode === "running" && state.grounded;
    if (this.player) {
      this.player.root.position.y = -state.playerY + (animate ? Math.sin(t * 18) * 0.55 : 0);
      this.player.root.rotation.z = this.controller.mode === "dead" ? -0.25 : state.grounded ? 0 : Math.max(-0.12, Math.min(0.12, -state.playerVelocityY / 5000));
      for (const hip of this.hips) hip.node.rotationQuaternion = hip.pose.multiply(Quaternion.RotationAxis(Vector3.Right(), animate ? Math.sin(t * 15 + hip.phase) * 0.16 : 0));
    }
    this.herd.forEach((d, i) => { const active = t >= 11.2 && t < 25.6 || t >= 41.6 && t < 51.2; d.setEnabled(active && i < (this.quality === "low" ? 1 : 3)); d.position.set(160 + i * 200 - (t % 12.8) * 16, 6 + Math.sin(t * 10 + i) * 1.4, -160 - i * 100); d.scaling.setAll(1 + i * 0.2); });
    this.rex.setEnabled(t >= 25.6 && t < 41.2);
    this.rex.position.set(t < 31.2 ? 450 - (t - 25.6) * 55 : -160 + Math.sin(t * 1.8) * 12, t < 31.2 ? 20 : 10, t < 31.2 ? -400 : -90);
    this.rex.rotation.z = this.reduced ? 0 : Math.sin(t * 9) * 0.012;
    const fallout = section === "fallout", end = Math.max(0, Math.min(1, (t - 70) / 5));
    const color = Color3.FromHexString(fallout ? "#aca699" : "#e9e4d8").scale(1 - end).add(Color3.White().scale(end));
    const flash = this.reduced ? 0.1 : Math.max(0, 1 - (t - this.flashAt) / 0.32) * 0.45;
    this.runtime.scene.clearColor = new Color4(Math.min(1, color.r + flash), Math.min(1, color.g + flash * 0.35), color.b, 1);
    this.runtime.scene.fogColor = color;
    this.material.diffuseColor = Color3.FromHexString(fallout ? "#817466" : "#b7a68a").toLinearSpace();
    for (let i = 0; i < this.dust.length; i++) {
      const mesh = this.dust[i]!; mesh.setEnabled(fallout && i < qualityProfile[this.quality].decorations && !this.reduced);
      mesh.position.set(((i * 93 - t * 22 + 10000) % 1300) - 200, ((i * 117 - t * 38 + 10000) % 520), 40 + i % 5 * 12); mesh.scaling.setAll(1 + i % 3);
    }
  }
  diagnostics() {
    return { ...this.runtime.metrics(), audioSources: this.audio.activeSources, quality: this.quality, hips: this.hips.length };
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.runtime.dispose(); }
}
