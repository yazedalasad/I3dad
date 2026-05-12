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
    title: 'Level 2 - Distance',
    subtitle: 'Use speed and time to calculate how far the box travels.',
    concept: 'distance',
    objectType: 'box',
    themeColor: '#FFB039',
    world: {
      mapLength: 12,
      rulerLength: 15,
      targetDistance: 9.6,
      successTolerance: 0.05,
      obstacleType: 'none',
      targetZoneWidth: 0.2,
      markerUnit: 'm',
    },
    controls: [
      { key: 'speed', label: 'Speed', unit: 'm/s', min: 0.5, max: 5, step: 0.1, defaultValue: 2.4, primary: true },
      { key: 'time', label: 'Time', unit: 's', min: 1, max: 8, step: 0.5, defaultValue: 4 },
    ],
    teaching: {
      title: 'How to win',
      winCondition:
        'Choose speed and time values that make the box travel 9.6 m. You win when distance = speed x time lands inside the goal zone.',
      physicsRule:
        'Physics rule: distance = speed x time. If the speed is constant, the object travels farther when speed or time gets bigger.',
      strategy:
        'Multiply speed by time. For example, 2.4 m/s x 4 s = 9.6 m. If the box stops early, increase speed or time. If it goes too far, lower one of them.',
      formulas: ['d = v x t', 'v = d / t', 't = d / v'],
      symbols: 'd: distance, v: speed, t: time',
    },
    subjectWeights: { physics: 5, english: 2, engineering: 1, math: 2 },
    successMessage: 'Great. You used speed x time to reach the correct distance.',
    summary: 'When speed is constant, distance is speed multiplied by time.',
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
