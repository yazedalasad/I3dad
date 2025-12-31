/**
 * scripts/set_degree_subject_weights_manual.js
 *
 * Manual, degree-by-degree weights for the 4 ACTIVE subjects:
 * DI, QR, VR, LR
 *
 * Requirements enforced per degree:
 * - 4 weights exist
 * - sum == 1.000000
 * - all 4 are unique (no duplicates)
 *
 * Run:
 *   node scripts/set_degree_subject_weights_manual.js
 *
 * Env (you can use your existing keys):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const SUBJECT_CODES = ["DI", "QR", "VR", "LR"]; // fixed order

// ---------- MANUAL WEIGHTS (EDIT THIS) ----------
// Each degree must have DI, QR, VR, LR weights.
// Example below is complete for your list of degrees.
// You can tweak any degree one-by-one.
const DEGREE_WEIGHTS = {
  ACC_BA:  { DI: 0.18, QR: 0.34, VR: 0.29, LR: 0.19 },
  AI_BSC:  { DI: 0.14, QR: 0.36, VR: 0.12, LR: 0.38 },
  ARCH_BARCH:{ DI: 0.24, QR: 0.28, VR: 0.22, LR: 0.26 },
  BIO_BSC: { DI: 0.21, QR: 0.27, VR: 0.20, LR: 0.32 },
  BIOTECH_BSC:{ DI: 0.20, QR: 0.30, VR: 0.18, LR: 0.32 },
  BUS_BA:  { DI: 0.22, QR: 0.33, VR: 0.29, LR: 0.16 },
  CE_BSC:  { DI: 0.16, QR: 0.36, VR: 0.14, LR: 0.34 },
  CHEM_BSC:{ DI: 0.18, QR: 0.34, VR: 0.13, LR: 0.35 },
  COM_BA:  { DI: 0.19, QR: 0.23, VR: 0.41, LR: 0.17 },
  CRIM_BA: { DI: 0.20, QR: 0.22, VR: 0.40, LR: 0.18 },
  CS_BSC:  { DI: 0.13, QR: 0.37, VR: 0.10, LR: 0.40 },
  CYBER_BSC:{ DI: 0.14, QR: 0.36, VR: 0.11, LR: 0.39 },
  DATA_BSC:{ DI: 0.20, QR: 0.41, VR: 0.10, LR: 0.29 },
  DES_BDES:{ DI: 0.26, QR: 0.21, VR: 0.31, LR: 0.22 },
  ECON_BA: { DI: 0.18, QR: 0.42, VR: 0.28, LR: 0.12 },
  EDU_BED: { DI: 0.24, QR: 0.19, VR: 0.37, LR: 0.20 },
  EE_BSC:  { DI: 0.12, QR: 0.36, VR: 0.10, LR: 0.42 },
  FIN_BA:  { DI: 0.16, QR: 0.46, VR: 0.26, LR: 0.12 },
  IE_BSC:  { DI: 0.22, QR: 0.38, VR: 0.12, LR: 0.28 },
  LAW_LLB: { DI: 0.18, QR: 0.16, VR: 0.46, LR: 0.20 },
  MATH_BSC:{ DI: 0.10, QR: 0.44, VR: 0.11, LR: 0.35 },
  ME_BSC:  { DI: 0.14, QR: 0.33, VR: 0.12, LR: 0.41 },
  MGMT_BA: { DI: 0.20, QR: 0.34, VR: 0.30, LR: 0.16 },
  MKT_BA:  { DI: 0.22, QR: 0.26, VR: 0.36, LR: 0.16 },
  NURS_BN: { DI: 0.24, QR: 0.20, VR: 0.34, LR: 0.22 },
  NUTR_BSC:{ DI: 0.22, QR: 0.27, VR: 0.29, LR: 0.22 },
  OT_BOT:  { DI: 0.23, QR: 0.18, VR: 0.35, LR: 0.24 },
  PHYS_BSC:{ DI: 0.12, QR: 0.34, VR: 0.12, LR: 0.42 },
  POL_BA:  { DI: 0.18, QR: 0.16, VR: 0.46, LR: 0.20 },
  PSY_BA:  { DI: 0.21, QR: 0.18, VR: 0.38, LR: 0.23 },
  PT_BPT:  { DI: 0.25, QR: 0.19, VR: 0.32, LR: 0.24 },
  SE_BSC:  { DI: 0.14, QR: 0.36, VR: 0.12, LR: 0.38 },
  SOC_BA:  { DI: 0.20, QR: 0.17, VR: 0.41, LR: 0.22 },
  SOCW_BSW:{ DI: 0.22, QR: 0.16, VR: 0.40, LR: 0.22 },
  TEACH_CERT:{ DI: 0.25, QR: 0.17, VR: 0.37, LR: 0.21 },
};

// ---------- helpers ----------
const EPS = 1e-6;

function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}

function validateWeights(degreeCode, w) {
  // 1) all keys exist
  for (const k of SUBJECT_CODES) {
    if (typeof w[k] !== "number") {
      throw new Error(`${degreeCode}: missing weight for ${k}`);
    }
  }

  // 2) sum = 1.0
  const sum = round6(SUBJECT_CODES.reduce((a, k) => a + w[k], 0));
  if (Math.abs(sum - 1.0) > EPS) {
    throw new Error(`${degreeCode}: weights sum must be 1.000000, got ${sum}`);
  }

  // 3) unique within degree
  const uniq = new Set(SUBJECT_CODES.map((k) => round6(w[k]).toFixed(6)));
  if (uniq.size !== 4) {
    throw new Error(`${degreeCode}: weights must be unique (no duplicates). Got: ${JSON.stringify(w)}`);
  }
}

async function getSubjectIds() {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, code, is_active")
    .in("code", SUBJECT_CODES);

  if (error) throw error;

  const byCode = new Map((data ?? []).map((s) => [s.code, s]));

  for (const code of SUBJECT_CODES) {
    const s = byCode.get(code);
    if (!s) throw new Error(`Subject ${code} not found in public.subjects`);
    if (!s.is_active) throw new Error(`Subject ${code} exists but is_active=false`);
  }

  return {
    DI: byCode.get("DI").id,
    QR: byCode.get("QR").id,
    VR: byCode.get("VR").id,
    LR: byCode.get("LR").id,
  };
}

async function getDegreesByCode() {
  const { data, error } = await supabase
    .from("degrees")
    .select("id, code, is_active")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

async function upsertWeights(degreeId, subjectIds, w) {
  const rows = SUBJECT_CODES.map((k) => ({
    degree_id: degreeId,
    subject_id: subjectIds[k],
    weight: round6(w[k]),
  }));

  const { error } = await supabase
    .from("degree_subject_weights")
    .upsert(rows, { onConflict: "degree_id,subject_id" });

  if (error) throw error;
}

async function main() {
  console.log("Loading active subject IDs (DI, QR, VR, LR)...");
  const subjectIds = await getSubjectIds();

  console.log("Loading active degrees...");
  const degrees = await getDegreesByCode();

  for (const d of degrees) {
    const w = DEGREE_WEIGHTS[d.code];
    if (!w) {
      throw new Error(
        `No manual weights found for degree ${d.code}. Add it to DEGREE_WEIGHTS first.`
      );
    }

    validateWeights(d.code, w);

    await upsertWeights(d.id, subjectIds, w);

    console.log(
      `${d.code} ✅ DI=${w.DI.toFixed(6)} QR=${w.QR.toFixed(6)} VR=${w.VR.toFixed(6)} LR=${w.LR.toFixed(6)}`
    );
  }

  console.log("Done ✅ All degrees updated one-by-one (manual weights, sum=1.000000, unique per degree).");
}

main().catch((e) => {
  console.error("FAILED:", e.message || e);
  process.exit(1);
});
