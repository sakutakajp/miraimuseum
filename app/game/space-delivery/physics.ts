import type { Circle, Flight, FlightEvent, Shot, Stage, Vec } from "./types";
export const DT = 1 / 120;
export const SHIP_RADIUS = 7;
export const SOFTENING = 8;
export function acceleration(position: Vec, stage: Stage): Vec {
  let x = 0,
    y = 0;
  for (const p of stage.planets) {
    const dx = p.x - position.x,
      dy = p.y - position.y;
    const factor =
      p.mu / Math.pow(dx * dx + dy * dy + SOFTENING * SOFTENING, 1.5);
    x += dx * factor;
    y += dy * factor;
  }
  return { x, y };
}
export function velocityFor(shot: Shot): Vec {
  const radians = (shot.angle * Math.PI) / 180;
  return {
    x: Math.sin(radians) * shot.speed,
    y: -Math.cos(radians) * shot.speed,
  };
}
export function launch(stage: Stage, shot: Shot): Flight {
  return {
    position: { ...stage.launch },
    velocity: velocityFor(shot),
    time: 0,
    collected: [],
    outcome: "flying",
  };
}
/** First entry fraction on the swept segment; inclusive tangencies and initial overlap. */
export function circleEntry(
  a: Vec,
  b: Vec,
  circle: Circle,
  padding = 0,
): number | undefined {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    ox = a.x - circle.x,
    oy = a.y - circle.y;
  const c = ox * ox + oy * oy - (circle.radius + padding) ** 2;
  if (c <= 0) return 0;
  const length = dx * dx + dy * dy;
  if (!length) return;
  const dot = ox * dx + oy * dy,
    discriminant = dot * dot - length * c;
  if (discriminant < 0) return;
  const t = (-dot - Math.sqrt(discriminant)) / length;
  return t >= 0 && t <= 1 ? t : undefined;
}
export function step(
  stage: Stage,
  state: Flight,
): { state: Flight; events: FlightEvent[] } {
  if (state.outcome !== "flying") return { state, events: [] };
  const a = acceleration(state.position, stage),
    old = state.position;
  const next = {
    x: old.x + state.velocity.x * DT + (a.x * DT * DT) / 2,
    y: old.y + state.velocity.y * DT + (a.y * DT * DT) / 2,
  };
  const b = acceleration(next, stage);
  const velocity = {
    x: state.velocity.x + ((a.x + b.x) * DT) / 2,
    y: state.velocity.y + ((a.y + b.y) * DT) / 2,
  };
  const candidates: FlightEvent[] = [];
  const add = (
    kind: FlightEvent["kind"],
    fraction: number | undefined,
    index?: number,
  ) => {
    if (fraction !== undefined) candidates.push({ kind, fraction, index });
  };
  for (const p of [...stage.planets, ...stage.obstacles])
    add("collision", circleEntry(old, next, p, SHIP_RADIUS));
  add("success", circleEntry(old, next, stage.destination));
  stage.stars.forEach((star, index) => {
    if (!state.collected.includes(index))
      add("star", circleEntry(old, next, star, SHIP_RADIUS), index);
  });
  const { width, height } = stage.board;
  if (next.x < 0) add("outside", (0 - old.x) / (next.x - old.x));
  if (next.x > width) add("outside", (width - old.x) / (next.x - old.x));
  if (next.y < 0) add("outside", (0 - old.y) / (next.y - old.y));
  if (next.y > height) add("outside", (height - old.y) / (next.y - old.y));
  if (state.time + DT >= stage.maxTime)
    add("timeout", Math.max(0, (stage.maxTime - state.time) / DT));
  // Hazards win exact ties. Otherwise physical order, including stars before delivery, is preserved.
  const priority = {
    collision: 0,
    outside: 1,
    timeout: 2,
    star: 3,
    success: 4,
  };
  candidates.sort(
    (a, b) => a.fraction - b.fraction || priority[a.kind] - priority[b.kind],
  );
  const collected = [...state.collected],
    events: FlightEvent[] = [];
  for (const event of candidates) {
    events.push(event);
    if (event.kind === "star") {
      collected.push(event.index!);
      continue;
    }
    const position = {
      x: old.x + (next.x - old.x) * event.fraction,
      y: old.y + (next.y - old.y) * event.fraction,
    };
    return {
      state: {
        position,
        velocity,
        collected,
        time: state.time + DT * event.fraction,
        outcome: event.kind === "success" ? "success" : "failure",
        reason: event.kind === "success" ? undefined : event.kind,
      },
      events,
    };
  }
  return {
    state: {
      position: next,
      velocity,
      time: state.time + DT,
      collected,
      outcome: "flying",
    },
    events,
  };
}
export function predict(stage: Stage, shot: Shot, seconds = 2) {
  let state = launch(stage, shot);
  const points: Vec[] = [{ ...state.position }];
  for (
    let i = 0;
    i < Math.ceil(seconds / DT) && state.outcome === "flying";
    i++
  ) {
    state = step(stage, state).state;
    if (i % 8 === 0 || state.outcome !== "flying")
      points.push({ ...state.position });
  }
  return { points, state };
}
export function advanceFrame(
  stage: Stage,
  state: Flight,
  accumulator: number,
  elapsed: number,
) {
  let remaining = accumulator + Math.min(Math.max(0, elapsed), 0.1);
  const events: FlightEvent[] = [],
    points: Vec[] = [];
  let count = 0;
  while (remaining + 1e-10 >= DT && count < 12 && state.outcome === "flying") {
    const result = step(stage, state);
    state = result.state;
    events.push(...result.events);
    points.push(state.position);
    remaining -= DT;
    count++;
  }
  return { state, accumulator: Math.max(0, remaining), events, points };
}
