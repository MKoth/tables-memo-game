export type RoamingTarget = {
  x: number;
  y: number;
};

export const JELLYFISH_STATE_SWIMMING = 0;
export const JELLYFISH_STATE_IDLE = 1;

export type JellyfishState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  heading: number;
  state: number;
  stateTimer: number;
};

export type KeepOutDisk = {
  centerX: number;
  centerY: number;
  radius: number;
};

export type Zone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const JELLYFISH_SPEED = 17;
export const JELLYFISH_SEPARATION_RADIUS = 120;
export const JELLYFISH_SEPARATION_STEER = 5.0;
export const JELLYFISH_ARRIVAL_THRESHOLD = 5;
export const JELLYFISH_SPEED_VARIANCE = 4;
const JELLYFISH_SEPARATION_WEIGHT_CAP = 0.7;
const JELLYFISH_EDGE_PROXIMITY_PX = 30;
const JELLYFISH_SWIM_DURATION_MIN = 2.0;
const JELLYFISH_SWIM_DURATION_MAX = 8.0;
const JELLYFISH_IDLE_DURATION_MIN = 0;
const JELLYFISH_IDLE_DURATION_MAX = 0;

export function pickRoamingTarget(
  zone: Zone,
  keepOutDisk: KeepOutDisk | null,
  rng: () => number,
): RoamingTarget {
  'worklet';
  const pad = 40;
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = zone.x + pad + rng() * (zone.w - pad * 2);
    const y = zone.y + pad + rng() * (zone.h - pad * 2);

    if (
      keepOutDisk != null &&
      Math.hypot(x - keepOutDisk.centerX, y - keepOutDisk.centerY) <
        keepOutDisk.radius + 20
    ) {
      continue;
    }

    return { x, y };
  }

  return {
    x: zone.x + pad + rng() * (zone.w - pad * 2),
    y: zone.y + pad + rng() * (zone.h - pad * 2),
  };
}

export function stepJellyfish(
  state: JellyfishState,
  dt: number,
  speed: number,
  zone: Zone,
  keepOutDisk: KeepOutDisk | null,
  allStates: JellyfishState[],
  index: number,
  rng: () => number,
): JellyfishState {
  'worklet';
  const margin = 40;
  const minX = zone.x + margin;
  const maxX = zone.x + zone.w - margin;
  const minY = zone.y + margin;
  const maxY = zone.y + zone.h - margin;

  let targetX = state.targetX;
  let targetY = state.targetY;
  let newState = state.state;
  let newTimer = state.stateTimer - dt;
  let newX = state.x;
  let newY = state.y;
  let heading = state.heading;
  const wasClamped = false;

  if (state.state === JELLYFISH_STATE_IDLE) {
    if (newTimer <= 0) {
      newState = JELLYFISH_STATE_SWIMMING;
      newTimer =
        JELLYFISH_SWIM_DURATION_MIN +
        rng() * (JELLYFISH_SWIM_DURATION_MAX - JELLYFISH_SWIM_DURATION_MIN);
      const newTarget = pickRoamingTarget(zone, keepOutDisk, rng);
      targetX = newTarget.x;
      targetY = newTarget.y;
    }

    return {
      x: state.x,
      y: state.y,
      targetX,
      targetY,
      heading,
      state: newState,
      stateTimer: newTimer,
    };
  }

  let dx = targetX - state.x;
  let dy = targetY - state.y;
  let dist = Math.hypot(dx, dy);

  if (dist < 1e-6) {
    dx = rng() * 2 - 1;
    dy = rng() * 2 - 1;
    dist = 1;
  }

  const targetDx = dx / dist;
  const targetDy = dy / dist;

  let sepDx = 0;
  let sepDy = 0;
  for (let i = 0; i < allStates.length; i++) {
    if (i === index) {
      continue;
    }
    const other = allStates[i];
    if (other == null) {
      continue;
    }
    const sx = state.x - other.x;
    const sy = state.y - other.y;
    const sd = Math.hypot(sx, sy);
    if (sd < JELLYFISH_SEPARATION_RADIUS && sd > 0.1) {
      const overlap = 1 - sd / JELLYFISH_SEPARATION_RADIUS;
      const weight = overlap * overlap;
      sepDx += (sx / sd) * weight * JELLYFISH_SEPARATION_STEER;
      sepDy += (sy / sd) * weight * JELLYFISH_SEPARATION_STEER;
    }
  }

  const sepMag = Math.hypot(sepDx, sepDy);
  const sepWeight = Math.min(sepMag, JELLYFISH_SEPARATION_WEIGHT_CAP);

  const edgeProximityX = Math.min(
    Math.max(0, (state.x - minX) / JELLYFISH_EDGE_PROXIMITY_PX),
    Math.max(0, (maxX - state.x) / JELLYFISH_EDGE_PROXIMITY_PX),
    1,
  );
  const edgeProximityY = Math.min(
    Math.max(0, (state.y - minY) / JELLYFISH_EDGE_PROXIMITY_PX),
    Math.max(0, (maxY - state.y) / JELLYFISH_EDGE_PROXIMITY_PX),
    1,
  );
  const edgeDampen = Math.min(edgeProximityX, edgeProximityY);
  const dampenedSepWeight = sepWeight * edgeDampen;

  const moveDx = targetDx + sepDx * dampenedSepWeight;
  const moveDy = targetDy + sepDy * dampenedSepWeight;
  const moveMag = Math.hypot(moveDx, moveDy);
  const combinedAngle =
    moveMag > 0.001 ? Math.atan2(moveDy, moveDx) : Math.atan2(targetDy, targetDx);

  const moveDist = speed * dt;
  const desiredX = state.x + Math.cos(combinedAngle) * moveDist;
  const desiredY = state.y + Math.sin(combinedAngle) * moveDist;

  const clampedX = Math.min(maxX, Math.max(minX, desiredX));
  const clampedY = Math.min(maxY, Math.max(minY, desiredY));
  const hitWall = clampedX !== desiredX || clampedY !== desiredY;

  newX = clampedX;
  newY = clampedY;

  heading = combinedAngle;

  const dxActual = clampedX - state.x;
  const dyActual = clampedY - state.y;
  const movedDist = Math.hypot(dxActual, dyActual);

  const arrived =
    movedDist >= dist || dist < JELLYFISH_ARRIVAL_THRESHOLD;

  if (arrived || hitWall) {
    const newTarget = pickRoamingTarget(zone, keepOutDisk, rng);
    targetX = newTarget.x;
    targetY = newTarget.y;
  }

  if (
    targetX < minX ||
    targetX > maxX ||
    targetY < minY ||
    targetY > maxY
  ) {
    const newTarget = pickRoamingTarget(zone, keepOutDisk, rng);
    targetX = newTarget.x;
    targetY = newTarget.y;
  }

  if (newTimer <= 0) {
    newState = JELLYFISH_STATE_IDLE;
    newTimer =
      JELLYFISH_IDLE_DURATION_MIN +
      rng() * (JELLYFISH_IDLE_DURATION_MAX - JELLYFISH_IDLE_DURATION_MIN);
  }

  return {
    x: newX,
    y: newY,
    targetX,
    targetY,
    heading,
    state: newState,
    stateTimer: newTimer,
  };
}
