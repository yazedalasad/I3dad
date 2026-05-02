export const bridgeLevels = [
  {
    id: 'physics_bridge_level_1',
    title: {
      ar: 'المستوى 1: جسر بسيط',
      he: 'שלב 1: גשר פשוט',
    },
    difficulty: 'easy',
    maxBudget: 100,
    requiredStability: 60,
    learningMessage: {
      ar: 'المثلث يساعد الجسر على توزيع الوزن.',
      he: 'המשולש עוזר לגשר לחלק את המשקל.',
    },
    nodes: [
      { id: 'A', x: 40, y: 250, type: 'ground' },
      { id: 'B', x: 160, y: 170, type: 'joint' },
      { id: 'C', x: 280, y: 250, type: 'ground' },
      { id: 'D', x: 160, y: 300, type: 'support' },
    ],
    allowedBeams: ['A-B', 'B-C', 'A-D', 'D-C', 'B-D'],
    requiredBeams: ['A-B', 'B-C', 'A-D', 'D-C'],
  },
  {
    id: 'physics_bridge_level_2',
    title: {
      ar: 'المستوى 2: جسر فوق الوادي',
      he: 'שלב 2: גשר מעל העמק',
    },
    difficulty: 'medium',
    maxBudget: 140,
    requiredStability: 75,
    learningMessage: {
      ar: 'الدعامة السفلية تقلل الانحناء في منتصف الجسر.',
      he: 'התמיכה התחתונה מפחיתה את הכיפוף במרכז הגשר.',
    },
    nodes: [
      { id: 'A', x: 30, y: 260, type: 'ground' },
      { id: 'B', x: 110, y: 200, type: 'joint' },
      { id: 'C', x: 190, y: 200, type: 'joint' },
      { id: 'D', x: 270, y: 260, type: 'ground' },
      { id: 'E', x: 110, y: 310, type: 'support' },
      { id: 'F', x: 190, y: 310, type: 'support' },
    ],
    allowedBeams: ['A-B', 'B-C', 'C-D', 'A-E', 'E-F', 'F-D', 'B-E', 'C-F', 'B-F', 'C-E'],
    requiredBeams: ['A-B', 'B-C', 'C-D', 'A-E', 'E-F', 'F-D', 'B-E', 'C-F'],
  },
  {
    id: 'physics_bridge_level_3',
    title: {
      ar: 'المستوى 3: جسر طويل',
      he: 'שלב 3: גשר ארוך',
    },
    difficulty: 'medium',
    maxBudget: 190,
    requiredStability: 85,
    learningMessage: {
      ar: 'الجسور الطويلة تحتاج تكرار المثلثات حتى تبقى ثابتة.',
      he: 'גשרים ארוכים צריכים חזרה על משולשים כדי להישאר יציבים.',
    },
    nodes: [
      { id: 'A', x: 20, y: 260, type: 'ground' },
      { id: 'B', x: 80, y: 210, type: 'joint' },
      { id: 'C', x: 140, y: 210, type: 'joint' },
      { id: 'D', x: 200, y: 210, type: 'joint' },
      { id: 'E', x: 260, y: 260, type: 'ground' },
      { id: 'F', x: 80, y: 310, type: 'support' },
      { id: 'G', x: 140, y: 310, type: 'support' },
      { id: 'H', x: 200, y: 310, type: 'support' },
    ],
    allowedBeams: ['A-B', 'B-C', 'C-D', 'D-E', 'A-F', 'F-G', 'G-H', 'H-E', 'B-F', 'C-G', 'D-H', 'B-G', 'C-F', 'C-H', 'D-G'],
    requiredBeams: ['A-B', 'B-C', 'C-D', 'D-E', 'A-F', 'F-G', 'G-H', 'H-E', 'B-F', 'C-G', 'D-H', 'B-G', 'D-G'],
  },
];

export function getBridgeLevelById(levelId) {
  return bridgeLevels.find((level) => level.id === levelId) || bridgeLevels[0];
}
