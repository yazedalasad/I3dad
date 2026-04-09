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

function simulateForceLevel(level, params) {
  const force = Number(params.force) || 0;
  const friction = Number(params.friction) || 0;
  const rawDistance = force * 0.22 - friction * 7.2 + 1.1;
  const distance = clamp(Number(rawDistance.toFixed(2)), 0, level.world.mapLength + 1);
  return { distance, meta: { force, friction } };
}

function simulateSpeedLevel(level, params) {
  const speed = Number(params.speed) || 0;
  const angle = Number(params.angle) || 0;
  const rampDistance = 5.3;
  const airDistance = speed * 0.68 + angle * 0.055 + 1.35;
  const distance = clamp(Number((rampDistance + airDistance).toFixed(2)), 0, level.world.mapLength + 1);
  return { distance, meta: { speed, angle } };
}

function simulateAccelerationLevel(level, params) {
  const acceleration = Number(params.acceleration) || 0;
  const mass = Number(params.mass) || 0;
  const motionGain = acceleration * 1.5 - mass * 0.45;
  const distance = clamp(Number((5.2 + motionGain * 1.7).toFixed(2)), 0, level.world.mapLength + 1);
  return { distance, meta: { acceleration, mass } };
}

export function simulateLevel(level, params) {
  if (!level?.id) throw new Error('A valid level is required');

  let result;
  switch (level.id) {
    case 'physics_lab_level_1':
      result = simulateForceLevel(level, params);
      break;
    case 'physics_lab_level_2':
      result = simulateSpeedLevel(level, params);
      break;
    case 'physics_lab_level_3':
      result = simulateAccelerationLevel(level, params);
      break;
    default:
      result = { distance: 0, meta: {} };
  }

  const { targetDistance, successTolerance } = level.world;
  const delta = Number((result.distance - targetDistance).toFixed(2));
  const success = Math.abs(delta) <= successTolerance;

  return {
    ...result,
    success,
    delta,
    targetDistance,
    targetMin: targetDistance - successTolerance,
    targetMax: targetDistance + successTolerance,
    overshoot: delta > successTolerance,
    undershoot: delta < -successTolerance,
  };
}
