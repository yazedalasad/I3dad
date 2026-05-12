export function buildDefaultParams(level) {
  return Object.fromEntries((level?.controls || []).map((control) => [control.key, control.defaultValue]));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function roundToStep(value, step = 1, min = 0, max = 100) {
  const rounded = Math.round((value - min) / step) * step + min;
  return clamp(Number(rounded.toFixed(4)), min, max);
}

function simulateSimpleSpeedLevel(level, params) {
  const speed = Number(params.speed) || 0;
  const targetDistance = Number(level?.world?.targetDistance) || 0;
  const arrivalTimeSec = speed > 0 ? Number((targetDistance / speed).toFixed(2)) : Number.POSITIVE_INFINITY;
  const distance = targetDistance;

  return {
    distance,
    meta: {
      speed,
      arrivalTimeSec,
      durationMs: Number.isFinite(arrivalTimeSec)
        ? Math.max(1200, Math.round(arrivalTimeSec * 1000))
        : 6000,
      startVelocity: speed,
      endVelocity: speed,
    },
  };
}

function simulateDistanceLevel(level, params) {
  const speed = Number(params.speed) || 0;
  const time = Number(params.time) || 0;
  const rawDistance = speed * time;
  const distance = clamp(Number(rawDistance.toFixed(2)), 0, level.world.rulerLength || level.world.mapLength);
  const durationMs = Math.max(1200, Math.round(time * 1000));

  return {
    distance,
    meta: {
      speed,
      time,
      calculatedDistance: Number(rawDistance.toFixed(2)),
      durationMs,
      startVelocity: speed,
      endVelocity: speed,
    },
  };
}

function simulateSpeedLevel(level, params) {
  const speed = Number(params.speed) || 0;
  const angle = Number(params.angle) || 0;
  const rampDistance = 5.3;
  const airDistance = speed * 0.68 + angle * 0.055 + 1.35;
  const distance = clamp(Number((rampDistance + airDistance).toFixed(2)), 0, level.world.mapLength + 1);
  return {
    distance,
    meta: {
      speed,
      angle,
      durationMs: Math.max(700, Math.round((distance / Math.max(speed, 1)) * 800)),
    },
  };
}

function simulateAccelerationLevel(level, params) {
  const acceleration = Number(params.acceleration) || 0;
  const mass = Number(params.mass) || 0;
  const motionGain = acceleration * 1.5 - mass * 0.45;
  const distance = clamp(Number((5.2 + motionGain * 1.7).toFixed(2)), 0, level.world.mapLength + 1);
  return {
    distance,
    meta: {
      acceleration,
      mass,
      durationMs: Math.max(800, Math.round((distance / Math.max(acceleration, 1)) * 950)),
    },
  };
}

export function simulateLevel(level, params) {
  if (!level?.id) throw new Error('A valid level is required');

  let result;
  switch (level.id) {
    case 'physics_lab_level_1':
      result = simulateSimpleSpeedLevel(level, params);
      break;
    case 'physics_lab_level_2':
      result = simulateDistanceLevel(level, params);
      break;
    case 'physics_lab_level_3':
      result = simulateAccelerationLevel(level, params);
      break;
    default:
      result = { distance: 0, meta: { durationMs: 600 } };
  }

  const { targetDistance, successTolerance } = level.world;
  let delta;
  let success;
  let overshoot;
  let undershoot;
  let targetMin;
  let targetMax;

  if (level.id === 'physics_lab_level_1') {
    const targetTimeSec = Number(level?.world?.targetTimeSec) || 5;
    const timeToleranceSec = Number(level?.world?.timeToleranceSec) || 0.2;
    const arrivalTimeSec = Number(result?.meta?.arrivalTimeSec);

    delta = Number((arrivalTimeSec - targetTimeSec).toFixed(2));
    success = Math.abs(delta) <= timeToleranceSec;
    undershoot = delta > timeToleranceSec;
    overshoot = delta < -timeToleranceSec;
    targetMin = Number((targetTimeSec - timeToleranceSec).toFixed(2));
    targetMax = Number((targetTimeSec + timeToleranceSec).toFixed(2));
    result.meta.targetTimeSec = targetTimeSec;
  } else {
    delta = Number((result.distance - targetDistance).toFixed(2));
    success = Math.abs(delta) <= successTolerance;
    overshoot = delta > successTolerance;
    undershoot = delta < -successTolerance;
    targetMin = targetDistance - successTolerance;
    targetMax = targetDistance + successTolerance;
  }

  return {
    ...result,
    motion: {
      durationMs: result?.meta?.durationMs || 800,
      startVelocity: result?.meta?.startVelocity || 0,
      endVelocity: result?.meta?.endVelocity || 0,
      netAcceleration: result?.meta?.netAcceleration || 0,
    },
    success,
    delta,
    targetDistance,
    targetMin,
    targetMax,
    overshoot,
    undershoot,
  };
}
