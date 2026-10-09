import { describe, expect, it, vi } from "vitest";
import { Quaternion, Vector3 } from "@babylonjs/core";
import { RunController, type RunEvents } from "../app/games/dinosaur/RunController";
import { DINOSAUR_STAGE_1 } from "../app/games/dinosaur/stage";
import { emptyRecord } from "../app/game/dinosaur/systems/records";
import { games } from "../app/games/catalog";
import { parseGameProgress, recordGameResult, savedGameResult } from "../app/games/progress";
import { parseSettings, readSettings, SETTINGS_KEY } from "../app/three-d/settings";
import { CYBERTRUCK, DINOSAUR, STATUE, INITIAL_EARTH_POSE } from "../app/experiences/floating-earth/entities";
import { revealAt } from "../app/experiences/floating-earth/reveal";
import { EarthInteraction } from "../app/experiences/floating-earth/interaction";
import { CameraDirector } from "../app/game/dinosaur/systems/CameraDirector";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const events = (): RunEvents => ({ mode: vi.fn(), record: vi.fn(), failed: vi.fn(), cleared: vi.fn(), cue: vi.fn(), jump: vi.fn(), land: vi.fn(), retry: vi.fn() });
describe("Babylon migration: rules and saved data", () => {
  it("composes all fifty challenges in six typed sections, with a single implemented game", () => {
    expect(games).toHaveLength(11); expect(new Set(games.map(g => g.id)).size).toBe(11);
    expect(games.filter(g => g.status === "playable").map(g => g.route)).toEqual(["/dinosaur"]);
    expect(games.filter(g => g.status === "planned").every(g => !g.route && !g.stages.length)).toBe(true);
    const placements = DINOSAUR_STAGE_1.sections.flatMap(s => s.placements);
    expect(new Set(placements.map(p => p.id)).size).toBe(DINOSAUR_STAGE_1.rules.obstacles.length);
    expect(DINOSAUR_STAGE_1.music).toMatchObject({ duration: 76.8, bpm: 150 });
  });
  it("preserves old general record scores, cleared stages and separate deep-time records", () => {
    const old = parseGameProgress(JSON.stringify({ "dinosaur-run": { best: 90000, stages: { "1": { best: 84000, cleared: true }, "2": { best: 85000, cleared: true } } } }));
    const next = recordGameResult(old, { game: "dinosaur-run", stage: 1, cleared: true, score: 80000, health: 1, elapsed: 76.8 });
    expect(next["dinosaur-run"]).toMatchObject({ best: 90000, stages: { "1": { best: 84000, cleared: true }, "2": { best: 85000, cleared: true } }, unlocked: 3 });
  });
  it("keeps 760ms auto retry and stops both the run and pending retry while paused", () => {
    const hook = events(), run = new RunController(DINOSAUR_STAGE_1, emptyRecord(), hook);
    run.start(true); while (run.mode === "running") run.tick(1/60);
    expect(run.mode).toBe("dead"); expect(hook.failed).toHaveBeenCalledOnce();
    run.tick(0.5); run.pause(); const state = { ...run.runtime.world.state }; run.tick(10);
    expect(run.runtime.world.state).toEqual(state); expect(run.attempts).toBe(1);
    run.resume(); run.tick(0.259); expect(run.mode).toBe("dead"); run.tick(0.002);
    expect(run.mode).toBe("running"); expect(run.attempts).toBe(2); expect(run.runtime.world.clock.ticks).toBe(0);
  });
  it("keeps unknown legacy saves and extra fields, and recovers when general storage is corrupt", () => {
    const result = { game: "dinosaur-run" as const, stage: 1, cleared: true, score: 92000, health: 1, elapsed: 76.8 };
    const saved = JSON.parse(savedGameResult('{"star-dive":{"best":1234},"dinosaur-run":{"custom":"retained"}}', result));
    expect(saved["star-dive"]).toEqual({ best: 1234 }); expect(saved["dinosaur-run"].custom).toBe("retained");
    expect(JSON.parse(savedGameResult("{broken", result))["dinosaur-run"].stages["1"].cleared).toBe(true);
    expect(parseGameProgress('{"dinosaur-run":{"unlocked":5}}')["dinosaur-run"].unlocked).toBe(5);
  });
  it("clears through the real deterministic rules, saves score and fires clear once", () => {
    const hook = events(), run = new RunController(DINOSAUR_STAGE_1, emptyRecord(), hook);
    run.start(true); for (const c of run.stage.rules.challenges) run.runtime.world.queueJump(c.at);
    for (let i=0;i<4609;i++) run.tick(1/60);
    expect(run.mode).toBe("complete"); expect(run.result).toMatchObject({ score:100000, rank:"S", sync:1 });
    expect(run.record).toMatchObject({ cleared:true, bestProgress:1, attempts:1 }); expect(hook.cleared).toHaveBeenCalledOnce();
    run.tick(10); expect(hook.cleared).toHaveBeenCalledOnce(); run.retry(); expect(run.runtime.world.clock.ticks).toBe(0);
  });
  it("preserves in-air state and queued input over explicit pause", () => {
    const run = new RunController(DINOSAUR_STAGE_1, emptyRecord(), events()); run.start(true); run.jump(); run.tick(0.12);
    run.pause(); const state = { ...run.runtime.world.state }; run.tick(3); expect(run.runtime.world.state).toEqual(state);
    run.resume(); run.tick(0.01); expect(run.runtime.world.clock.elapsedSeconds).toBeCloseTo(0.125);
  });
  it("applies stage camera layout while retaining the Stage 1 composition", () => {
    const original = new CameraDirector(false).compose(390, 844, 0, "calm");
    expect(new CameraDirector(false, DINOSAUR_STAGE_1.camera).compose(390, 844, 0, "calm")).toEqual(original);
    const alternate = new CameraDirector(false, { height: 1000, playerFraction: 0.35, floorFraction: 0.7 }).compose(390, 844, 0, "calm");
    expect(alternate.playerX).toBeGreaterThan(original.playerX);
    expect(alternate.floor).toBeLessThan(original.floor);
    expect(alternate.scale).toBeLessThan(original.scale);
  });
  it("migrates only the old mute setting without changing v1 data", () => {
    const data = new Map([["mirai-museum:v1", '{"muted":true,"visits":{"rex":4}}']]);
    vi.stubGlobal("localStorage", { getItem: (key:string) => data.get(key) ?? null });
    expect(readSettings().muted).toBe(true); expect(data.has(SETTINGS_KEY)).toBe(false); vi.unstubAllGlobals();
    expect(parseSettings('{"volume":999,"quality":"bad"}')).toMatchObject({ volume:1, quality:"high" });
    expect(parseSettings("null").quality).toBe("high");
  });
});
describe("Earth placement, intro and source preservation", () => {
  it("places the same dinosaur and silver car size with a collision-free orthogonal path", () => {
    expect(CYBERTRUCK.size).toBe(DINOSAUR.size);
    expect(DINOSAUR.normal.applyRotationQuaternion(INITIAL_EARTH_POSE).z).toBeGreaterThan(0);
    for (let i=0;i<360;i++) {
      const normal = CYBERTRUCK.initialNormal.applyRotationQuaternion(Quaternion.RotationAxis(CYBERTRUCK.orbitAxis,i*Math.PI/180));
      expect(Math.abs(Vector3.Dot(normal,DINOSAUR.normal))).toBeLessThan(1e-6);
      expect(Math.acos(Vector3.Dot(normal,STATUE.normal))).toBeGreaterThan(0.65);
    }
  });
  it("uses a light-first shared intro and removes the column for reduced motion", () => {
    expect(revealAt(1.8,false)).toMatchObject({ phase:"light", opacity:0 });
    expect(revealAt(2.4,false).opacity).toBeGreaterThan(0); expect(revealAt(3.6,false)).toMatchObject({ phase:"settled", opacity:1 });
    expect(revealAt(1.2,true)).toMatchObject({ phase:"settled", opacity:1, scale:1 });
  });
  it("separates dragging from taps and restores the original pose", () => {
    const interaction = new EarthInteraction(); interaction.begin(0,0,0); interaction.move(30,20,.1,400);
    expect(interaction.end(.1)).toBe("drag"); expect(interaction.yaw).not.toBe(0); interaction.reset(); expect(interaction.yaw).toBe(0);
    interaction.begin(0,0,0); expect(interaction.end(.1)).toBe("tap");
  });
  it("leaves all supplied GLB files byte-identical", () => {
    const hashes = { "earth-vivid.glb":"99aa5a81862006d7bfcdcf1212da351d7f65b136110263970cb7733a3c5b2dd3", "dinosaur.glb":"4f935d37aa3d5d07cf6da3c40bacf710f29d437f2d12c04ef64c9402871e8d24", "cybertruck.glb":"1838b4bea2a2024a0ff67a46ddad5308cad9234fea7818924a5fe73d3d321e18", "statue-of-liberty-optimized.glb":"85e893c00645e230c88ab4a432752f011c8bebefa86878b4c6a004927fb5c614" };
    for (const [file,hash] of Object.entries(hashes)) expect(createHash("sha256").update(readFileSync(`public/floating-earth/${file}`)).digest("hex")).toBe(hash);
  });
});
import { assetBytes } from '../app/three-d/fetch';
import { afterEach } from 'vitest';
describe('bounded asset downloads',()=>{
  afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
  it('forwards an exit abort and removes its pending timeout',async()=>{
    vi.useFakeTimers();const owner=new AbortController();
    vi.stubGlobal('fetch',vi.fn((_url:string, options:RequestInit)=>new Promise((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(options.signal!.reason),{once:true}))));
    const pending=assetBytes('/model.glb',owner.signal);const check=expect(pending).rejects.toMatchObject({name:'AbortError'});owner.abort();await check;expect(vi.getTimerCount()).toBe(0);
  });
  it('ends a stalled optional download after thirty seconds',async()=>{
    vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn((_url:string, options:RequestInit)=>new Promise((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(options.signal!.reason),{once:true}))));
    const pending=assetBytes('/slow.glb',new AbortController().signal);const check=expect(pending).rejects.toMatchObject({name:'TimeoutError'});await vi.advanceTimersByTimeAsync(30000);await check;expect(vi.getTimerCount()).toBe(0);
  });
});
