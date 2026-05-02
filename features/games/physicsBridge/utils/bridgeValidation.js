function getNodeMap(level) {
  return level.nodes.reduce((accumulator, node) => {
    accumulator[node.id] = node;
    return accumulator;
  }, {});
}

export function normalizeBeam(a, b) {
  return [a, b].filter(Boolean).sort().join('-');
}

export function isBeamAllowed(level, beam) {
  const normalizedBeam = beam.includes('-')
    ? normalizeBeam(...beam.split('-'))
    : beam;

  return level.allowedBeams
    .map((allowedBeam) => normalizeBeam(...allowedBeam.split('-')))
    .includes(normalizedBeam);
}

function getBeamCost(level, beam) {
  const [fromId, toId] = beam.split('-');
  const nodeMap = getNodeMap(level);
  const fromNode = nodeMap[fromId];
  const toNode = nodeMap[toId];

  if (!fromNode || !toNode) return 0;

  const dx = fromNode.x - toNode.x;
  const dy = fromNode.y - toNode.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return Math.max(10, Math.ceil(distance / 6));
}

export function calculateBudget(level, beams) {
  return beams.reduce((total, beam) => total + getBeamCost(level, beam), 0);
}

function isDiagonal(level, beam) {
  const [fromId, toId] = beam.split('-');
  const nodeMap = getNodeMap(level);
  const fromNode = nodeMap[fromId];
  const toNode = nodeMap[toId];

  if (!fromNode || !toNode) return false;

  return fromNode.x !== toNode.x && fromNode.y !== toNode.y;
}

function isBottomSupportConnection(level, beam) {
  const [fromId, toId] = beam.split('-');
  const nodeMap = getNodeMap(level);
  const fromNode = nodeMap[fromId];
  const toNode = nodeMap[toId];

  if (!fromNode || !toNode) return false;

  const bottomTypes = ['ground', 'support'];
  return bottomTypes.includes(fromNode.type) && bottomTypes.includes(toNode.type);
}

export function calculateStability(level, beams) {
  const normalizedBeams = beams.map((beam) => normalizeBeam(...beam.split('-')));
  const uniqueBeams = [...new Set(normalizedBeams)];

  let stability = 0;

  level.requiredBeams.forEach((beam) => {
    if (uniqueBeams.includes(normalizeBeam(...beam.split('-')))) {
      stability += 10;
    }
  });

  uniqueBeams.forEach((beam) => {
    if (isDiagonal(level, beam)) {
      stability += 4;
    }

    if (isBottomSupportConnection(level, beam)) {
      stability += 5;
    }
  });

  return Math.min(100, stability);
}

export function validateBridge(level, beams) {
  const normalizedBeams = [...new Set(beams.map((beam) => normalizeBeam(...beam.split('-'))))];
  const missingRequiredBeams = level.requiredBeams
    .map((beam) => normalizeBeam(...beam.split('-')))
    .filter((beam) => !normalizedBeams.includes(beam));
  const budgetUsed = calculateBudget(level, normalizedBeams);
  const overBudget = budgetUsed > level.maxBudget;
  const stabilityScore = calculateStability(level, normalizedBeams);

  let message = 'ممتاز! الجسر ثابت والسيارة عبرت بنجاح.';
  let reasonCode = 'success';
  let success = true;

  if (missingRequiredBeams.length > 0) {
    success = false;
    message = 'الجسر ناقص، أضف دعامات أكثر.';
    reasonCode = 'missingRequiredBeams';
  } else if (overBudget) {
    success = false;
    message = 'تجاوزت الميزانية.';
    reasonCode = 'overBudget';
  } else if (stabilityScore < level.requiredStability) {
    success = false;
    message = 'الثبات غير كافٍ.';
    reasonCode = 'lowStability';
  }

  return {
    success,
    stabilityScore,
    budgetUsed,
    missingRequiredBeams,
    overBudget,
    reasonCode,
    message,
  };
}
