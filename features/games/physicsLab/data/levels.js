export const physicsLabGame = {
  id: 'physics_lab',
  title: 'Physics Lab',
  domain: 'physics',
  language: 'en',
  status: 'active',
};

export const physicsLabLevels = [
  {
    id: 'physics_lab_level_1',
    gameId: 'physics_lab',
    title: 'Level 1 - Speed',
    subtitle: 'Set the speed that makes the ball travel 10 m in exactly 5 s.',
    concept: 'speed',
    objectType: 'ball',
    themeColor: '#3FA7FF',
    world: {
      mapLength: 12,
      rulerLength: 12,
      targetDistance: 10,
      successTolerance: 0.4,
      timeToleranceSec: 0.2,
      obstacleType: 'none',
      targetZoneWidth: 0.8,
      markerUnit: 'm',
      targetTimeSec: 5,
    },
    controls: [
      { key: 'speed', label: 'Speed', unit: 'm/s', min: 0.5, max: 4, step: 0.1, defaultValue: 2, primary: true },
    ],
    teaching: {
      title: 'How to win',
      winCondition:
        'Question: What speed makes the ball reach the 10 m goal line in exactly 5 s? You win when the ball reaches the green line after 5 s.',
      physicsRule:
        'Physics rule: speed = distance / time. There is no friction and no air resistance in this level, so the ball keeps moving at constant speed until it reaches the goal line.',
      strategy:
        'Compute the speed first. If the travel time is longer than 5 s, increase speed. If the travel time is shorter than 5 s, lower speed.',
      formulas: ['v = d / t', 'd = v x t', 't = d / v'],
      symbols: 'v: speed, d: distance, t: time',
      generalRules: ['v = d / t', 'd = v x t', 't = d / v'],
      generalSymbols: 'v: speed, d: distance, t: time',
    },
    subjectWeights: { physics: 5, english: 2, engineering: 2, math: 1 },
    successMessage: 'Great. The ball reached the 10 m goal line at the correct time.',
    summary: 'With no friction or air resistance, constant speed means the travel time to the goal depends only on distance and speed.',
  },
  {
    id: 'physics_lab_level_2',
    gameId: 'physics_lab',
    title: 'Level 2 - Force and Friction',
    subtitle: 'Push the box into the target zone.',
    concept: 'force + friction',
    objectType: 'box',
    themeColor: '#FFB039',
    world: {
      mapLength: 12,
      rulerLength: 15,
      targetDistance: 9.6,
      successTolerance: 0.7,
      obstacleType: 'none',
      targetZoneWidth: 0.9,
      markerUnit: 'm',
    },
    controls: [
      { key: 'force', label: 'Force', unit: 'N', min: 10, max: 80, step: 5, defaultValue: 40, primary: true },
      { key: 'friction', label: 'Friction', unit: '', min: 0.0, max: 0.8, step: 0.05, defaultValue: 0.25 },
    ],
    teaching: {
      title: 'How to win',
      winCondition:
        'Stop the box inside the goal zone around 9.6 m. You win only if the box ends inside the target zone, not before it and not far past it.',
      physicsRule:
        'Physics rule: F = m a, and friction resists motion. More force sends the box farther, while more friction slows it down sooner.',
      strategy:
        'If the box stops too early, increase force or reduce friction. If it goes too far, reduce force or increase friction.',
      formulas: ['F = m a', 'F_net = F - F_f', 'F_f = mu m g', 'a_net = (F - F_f) / m'],
      symbols: 'F: force, m: mass, a: acceleration, F_f: friction force, mu: friction coefficient, g: gravity',
    },
    subjectWeights: { physics: 5, english: 2, engineering: 1, math: 2 },
    successMessage: 'Great. You matched force and friction well.',
    summary: 'Force drives the motion, while friction resists it. The balance between them decides the final distance.',
  },
  {
    id: 'physics_lab_level_3',
    gameId: 'physics_lab',
    title: 'Level 3 - Acceleration',
    subtitle: 'Build enough motion to climb the slope.',
    concept: 'acceleration',
    objectType: 'capsule',
    themeColor: '#55D38A',
    world: {
      mapLength: 16,
      targetDistance: 13.2,
      successTolerance: 0.9,
      obstacleType: 'mountain',
      targetZoneWidth: 1.0,
      markerUnit: 'm',
    },
    controls: [
      { key: 'acceleration', label: 'Acceleration', unit: 'm/s^2', min: 1, max: 9, step: 0.5, defaultValue: 6, primary: true },
      { key: 'mass', label: 'Mass', unit: 'kg', min: 1, max: 5, step: 0.5, defaultValue: 2 },
    ],
    teaching: {
      title: 'How to win',
      winCondition:
        'Give the object enough motion to climb the slope and stop inside the goal zone near 13.2 m.',
      physicsRule:
        'Physics rule: acceleration changes speed over time. More acceleration helps the object gain motion, while mass affects how strongly that motion builds.',
      strategy:
        'If the object cannot climb far enough, increase acceleration or reduce mass. If it passes the goal, lower acceleration or increase mass slightly.',
      formulas: ['a = Delta v / Delta t', 'F = m a'],
      symbols: 'a: acceleration, Delta v: change in speed, Delta t: change in time, m: mass',
    },
    subjectWeights: { physics: 6, english: 2, engineering: 2, math: 1 },
    successMessage: 'Excellent. You built enough motion to beat the climb.',
    summary: 'Acceleration is how quickly speed changes. More acceleration helped the object gain motion before the uphill section.',
  },
];
