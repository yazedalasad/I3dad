/**
 * Seed ONE personality variant ("Default") for ALL degrees
 *
 * Personality dimensions:
 * O = Openness
 * C = Conscientiousness
 * E = Extraversion
 * A = Agreeableness
 * N = Neuroticism
 *
 * All targets are 1–100
 * Weights are normalized per degree
 *
 * Run:
 *   node scripts/seedDegreePersonality.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- helpers ----------
function normalize(traits) {
  const sum = traits.reduce((s, t) => s + t.weight, 0);
  return traits.map(t => ({
    ...t,
    weight: Number((t.weight / sum).toFixed(4)),
  }));
}

const clamp = v => Math.max(1, Math.min(100, v));

// ---------- DEGREE → PERSONALITY ----------
const DEGREE_PERSONALITY = {
  ACC_BA: normalize([
    { trait: 'C', target: 85, weight: 0.40 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'O', target: 45, weight: 0.15 },
    { trait: 'E', target: 40, weight: 0.15 },
    { trait: 'A', target: 50, weight: 0.10 },
  ]),

  BUS_BA: normalize([
    { trait: 'E', target: 65, weight: 0.30 },
    { trait: 'C', target: 70, weight: 0.30 },
    { trait: 'O', target: 55, weight: 0.15 },
    { trait: 'A', target: 55, weight: 0.15 },
    { trait: 'N', target: 40, weight: 0.10 },
  ]),

  COM_BA: normalize([
    { trait: 'E', target: 75, weight: 0.35 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'A', target: 60, weight: 0.20 },
    { trait: 'C', target: 50, weight: 0.10 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  CRIM_BA: normalize([
    { trait: 'C', target: 70, weight: 0.30 },
    { trait: 'N', target: 50, weight: 0.25 },
    { trait: 'A', target: 60, weight: 0.20 },
    { trait: 'O', target: 55, weight: 0.15 },
    { trait: 'E', target: 45, weight: 0.10 },
  ]),

  ECON_BA: normalize([
    { trait: 'C', target: 75, weight: 0.35 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'E', target: 45, weight: 0.10 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  FIN_BA: normalize([
    { trait: 'C', target: 80, weight: 0.40 },
    { trait: 'N', target: 40, weight: 0.20 },
    { trait: 'E', target: 55, weight: 0.20 },
    { trait: 'O', target: 50, weight: 0.10 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  MGMT_BA: normalize([
    { trait: 'E', target: 70, weight: 0.35 },
    { trait: 'C', target: 70, weight: 0.30 },
    { trait: 'A', target: 55, weight: 0.15 },
    { trait: 'O', target: 55, weight: 0.10 },
    { trait: 'N', target: 40, weight: 0.10 },
  ]),

  MKT_BA: normalize([
    { trait: 'E', target: 75, weight: 0.35 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'A', target: 55, weight: 0.20 },
    { trait: 'C', target: 50, weight: 0.10 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  POL_BA: normalize([
    { trait: 'E', target: 65, weight: 0.30 },
    { trait: 'O', target: 70, weight: 0.30 },
    { trait: 'C', target: 65, weight: 0.20 },
    { trait: 'A', target: 55, weight: 0.10 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  PSY_BA: normalize([
    { trait: 'A', target: 80, weight: 0.35 },
    { trait: 'O', target: 70, weight: 0.25 },
    { trait: 'C', target: 60, weight: 0.15 },
    { trait: 'E', target: 55, weight: 0.15 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  SOC_BA: normalize([
    { trait: 'A', target: 75, weight: 0.30 },
    { trait: 'O', target: 70, weight: 0.25 },
    { trait: 'E', target: 60, weight: 0.20 },
    { trait: 'C', target: 55, weight: 0.15 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  ARCH_BARCH: normalize([
    { trait: 'O', target: 80, weight: 0.35 },
    { trait: 'C', target: 70, weight: 0.30 },
    { trait: 'N', target: 50, weight: 0.15 },
    { trait: 'E', target: 50, weight: 0.10 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  DES_BDES: normalize([
    { trait: 'O', target: 85, weight: 0.40 },
    { trait: 'E', target: 65, weight: 0.25 },
    { trait: 'A', target: 55, weight: 0.15 },
    { trait: 'C', target: 50, weight: 0.10 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  EDU_BED: normalize([
    { trait: 'A', target: 80, weight: 0.35 },
    { trait: 'E', target: 65, weight: 0.25 },
    { trait: 'C', target: 65, weight: 0.20 },
    { trait: 'O', target: 60, weight: 0.10 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  NURS_BN: normalize([
    { trait: 'A', target: 85, weight: 0.35 },
    { trait: 'C', target: 75, weight: 0.25 },
    { trait: 'N', target: 40, weight: 0.20 },
    { trait: 'E', target: 55, weight: 0.10 },
    { trait: 'O', target: 45, weight: 0.10 },
  ]),

  SOCW_BSW: normalize([
    { trait: 'A', target: 85, weight: 0.40 },
    { trait: 'E', target: 60, weight: 0.20 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'C', target: 55, weight: 0.10 },
    { trait: 'O', target: 50, weight: 0.10 },
  ]),

  AI_BSC: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'O', target: 70, weight: 0.30 },
    { trait: 'N', target: 35, weight: 0.20 },
    { trait: 'E', target: 45, weight: 0.10 },
    { trait: 'A', target: 40, weight: 0.05 },
  ]),

  BIO_BSC: normalize([
    { trait: 'C', target: 75, weight: 0.30 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'A', target: 55, weight: 0.20 },
    { trait: 'N', target: 45, weight: 0.15 },
    { trait: 'E', target: 45, weight: 0.10 },
  ]),

  BIOTECH_BSC: normalize([
    { trait: 'C', target: 75, weight: 0.35 },
    { trait: 'O', target: 70, weight: 0.25 },
    { trait: 'N', target: 45, weight: 0.15 },
    { trait: 'A', target: 50, weight: 0.15 },
    { trait: 'E', target: 45, weight: 0.10 },
  ]),

  CHEM_BSC: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'O', target: 60, weight: 0.25 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'E', target: 40, weight: 0.10 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  CE_BSC: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'O', target: 55, weight: 0.20 },
    { trait: 'E', target: 45, weight: 0.15 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  CS_BSC: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'N', target: 35, weight: 0.20 },
    { trait: 'E', target: 45, weight: 0.10 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  CYBER_BSC: normalize([
    { trait: 'C', target: 85, weight: 0.40 },
    { trait: 'N', target: 40, weight: 0.20 },
    { trait: 'O', target: 55, weight: 0.15 },
    { trait: 'E', target: 40, weight: 0.15 },
    { trait: 'A', target: 40, weight: 0.10 },
  ]),

  DATA_BSC: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'O', target: 70, weight: 0.30 },
    { trait: 'N', target: 40, weight: 0.20 },
    { trait: 'E', target: 45, weight: 0.10 },
    { trait: 'A', target: 45, weight: 0.05 },
  ]),

  EE_BSC: normalize([
    { trait: 'C', target: 85, weight: 0.40 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'O', target: 55, weight: 0.20 },
    { trait: 'E', target: 40, weight: 0.10 },
    { trait: 'A', target: 40, weight: 0.10 },
  ]),

  IE_BSC: normalize([
    { trait: 'C', target: 75, weight: 0.30 },
    { trait: 'E', target: 60, weight: 0.25 },
    { trait: 'O', target: 55, weight: 0.20 },
    { trait: 'A', target: 55, weight: 0.15 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),

  MATH_BSC: normalize([
    { trait: 'C', target: 85, weight: 0.40 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'N', target: 40, weight: 0.20 },
    { trait: 'E', target: 35, weight: 0.10 },
    { trait: 'A', target: 40, weight: 0.05 },
  ]),

  ME_BSC: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'O', target: 55, weight: 0.20 },
    { trait: 'E', target: 45, weight: 0.15 },
    { trait: 'A', target: 45, weight: 0.10 },
  ]),

  NUTR_BSC: normalize([
    { trait: 'A', target: 75, weight: 0.30 },
    { trait: 'C', target: 70, weight: 0.25 },
    { trait: 'O', target: 60, weight: 0.20 },
    { trait: 'N', target: 45, weight: 0.15 },
    { trait: 'E', target: 45, weight: 0.10 },
  ]),

  PHYS_BSC: normalize([
    { trait: 'C', target: 85, weight: 0.40 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'N', target: 40, weight: 0.20 },
    { trait: 'E', target: 35, weight: 0.10 },
    { trait: 'A', target: 40, weight: 0.05 },
  ]),

  SE_BSC: normalize([
    { trait: 'C', target: 85, weight: 0.35 },
    { trait: 'O', target: 65, weight: 0.25 },
    { trait: 'N', target: 35, weight: 0.20 },
    { trait: 'A', target: 50, weight: 0.10 },
    { trait: 'E', target: 45, weight: 0.10 },
  ]),

  OT_BOT: normalize([
    { trait: 'A', target: 80, weight: 0.35 },
    { trait: 'C', target: 65, weight: 0.25 },
    { trait: 'N', target: 45, weight: 0.20 },
    { trait: 'E', target: 55, weight: 0.10 },
    { trait: 'O', target: 50, weight: 0.10 },
  ]),

  PT_BPT: normalize([
    { trait: 'A', target: 75, weight: 0.30 },
    { trait: 'E', target: 65, weight: 0.25 },
    { trait: 'C', target: 65, weight: 0.20 },
    { trait: 'N', target: 45, weight: 0.15 },
    { trait: 'O', target: 50, weight: 0.10 },
  ]),

  LAW_LLB: normalize([
    { trait: 'C', target: 80, weight: 0.35 },
    { trait: 'E', target: 65, weight: 0.25 },
    { trait: 'O', target: 60, weight: 0.15 },
    { trait: 'N', target: 40, weight: 0.15 },
    { trait: 'A', target: 50, weight: 0.10 },
  ]),

  TEACH_CERT: normalize([
    { trait: 'A', target: 80, weight: 0.35 },
    { trait: 'E', target: 65, weight: 0.25 },
    { trait: 'C', target: 65, weight: 0.20 },
    { trait: 'O', target: 60, weight: 0.10 },
    { trait: 'N', target: 45, weight: 0.10 },
  ]),
};

// ---------- main ----------
async function run() {
  const { data: degrees } = await supabase
    .from('degrees')
    .select('id, code');

  const map = new Map(degrees.map(d => [d.code, d.id]));

  for (const [code, traits] of Object.entries(DEGREE_PERSONALITY)) {
    const degreeId = map.get(code);
    if (!degreeId) continue;

    await supabase.from('degree_variants').delete().eq('degree_id', degreeId);

    const { data: variant } = await supabase
      .from('degree_variants')
      .insert({ degree_id: degreeId, name: 'Default' })
      .select()
      .single();

    await supabase.from('degree_variant_personality_weights').insert(
      traits.map(t => ({
        variant_id: variant.id,
        trait: t.trait,
        target: clamp(t.target),
        weight: t.weight,
      }))
    );

    console.log(`✔ ${code} seeded`);
  }

  console.log('🎯 All degree personalities seeded successfully');
}

run();
