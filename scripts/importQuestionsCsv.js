import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const DEFAULT_CSV = 'C:\\Users\\yazed\\Downloads\\100_original_questions_import_ready.csv';
const BATCH_SIZE = 50;

const REQUIRED_COLUMNS = [
  'import_id',
  'subject_key',
  'question_text_ar',
  'question_text_he',
  'option_a_ar',
  'option_a_he',
  'option_b_ar',
  'option_b_he',
  'option_c_ar',
  'option_c_he',
  'option_d_ar',
  'option_d_he',
  'correct_answer',
  'difficulty',
  'discrimination',
  'guessing',
];

const QUESTION_COLUMNS = [
  'id',
  'subject_id',
  'ability_id',
  'question_text',
  'question_text_ar',
  'question_text_he',
  'option_a_ar',
  'option_a_he',
  'option_b_ar',
  'option_b_he',
  'option_c_ar',
  'option_c_he',
  'option_d_ar',
  'option_d_he',
  'correct_answer',
  'difficulty',
  'discrimination',
  'guessing',
  'question_type',
  'cognitive_level',
  'estimated_time_seconds',
  'target_language',
  'times_used',
  'times_correct',
  'is_active',
  'created_at',
  'updated_at',
  'explanation_ar',
  'explanation_he',
  'tags',
  'weight',
  'created_by',
];

const SUBJECT_KEY_ALIASES = {
  quantitative_reasoning: 'qr',
  verbal_reasoning: 'vr',
  logical_reasoning: 'lr',
  critical_english_reasoning: 'vr',
};

function argValue(name, fallback = null) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values, index) => {
    const item = { __line: index + 2 };
    headers.forEach((header, valueIndex) => {
      item[header] = values[valueIndex] ?? '';
    });
    return item;
  });
}

function normalizeSubjectKey(value) {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_');
}

function resolveSubjectKey(value) {
  const normalized = normalizeSubjectKey(value);
  return SUBJECT_KEY_ALIASES[normalized] || normalized;
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function cleanUuid(value) {
  const text = cleanText(value);
  if (!text) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

function parseNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseInteger(value, fallback = 0) {
  const numeric = parseNumber(value, fallback);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function parseBoolean(value, fallback = true) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
}

function parseTags(value) {
  const text = cleanText(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((tag) => String(tag).trim()).filter(Boolean);
  } catch {
    // Fall through to comma-separated parsing.
  }
  return text.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function normalizeCognitiveLevel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    deduction: 'analysis',
    critical_thinking: 'evaluation',
    reasoning: 'analysis',
  };
  const mapped = aliases[normalized] || normalized;
  const allowed = new Set(['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation']);
  return allowed.has(mapped) ? mapped : null;
}

function validateHeaders(rows) {
  if (!rows.length) return ['CSV is empty.'];
  const available = new Set(Object.keys(rows[0]).filter((key) => !key.startsWith('__')));
  return REQUIRED_COLUMNS
    .filter((column) => !available.has(column))
    .map((column) => `Missing required column: ${column}`);
}

function validateRow(row) {
  const errors = [];
  const correct = String(row.correct_answer || '').trim().toUpperCase();

  ['question_text_ar', 'question_text_he', 'option_a_ar', 'option_b_ar', 'option_c_ar', 'option_d_ar'].forEach((field) => {
    if (!cleanText(row[field])) errors.push(`line ${row.__line}: missing ${field}`);
  });

  if (!['A', 'B', 'C', 'D'].includes(correct)) errors.push(`line ${row.__line}: correct_answer must be A, B, C, or D`);
  if (!Number.isFinite(parseNumber(row.difficulty, NaN))) errors.push(`line ${row.__line}: invalid difficulty`);
  if (!Number.isFinite(parseNumber(row.discrimination, NaN))) errors.push(`line ${row.__line}: invalid discrimination`);
  if (!Number.isFinite(parseNumber(row.guessing, NaN))) errors.push(`line ${row.__line}: invalid guessing`);

  return errors;
}

function toQuestionPayload(row, subjectId) {
  const payload = {
    id: cleanText(row.import_id),
    subject_id: cleanText(row.subject_id) || subjectId,
    ability_id: cleanUuid(row.ability_id),
    question_text: cleanText(row.question_text) || cleanText(row.question_text_ar),
    question_text_ar: cleanText(row.question_text_ar),
    question_text_he: cleanText(row.question_text_he),
    option_a_ar: cleanText(row.option_a_ar),
    option_a_he: cleanText(row.option_a_he),
    option_b_ar: cleanText(row.option_b_ar),
    option_b_he: cleanText(row.option_b_he),
    option_c_ar: cleanText(row.option_c_ar),
    option_c_he: cleanText(row.option_c_he),
    option_d_ar: cleanText(row.option_d_ar),
    option_d_he: cleanText(row.option_d_he),
    correct_answer: String(row.correct_answer || '').trim().toUpperCase(),
    difficulty: parseNumber(row.difficulty, 0),
    discrimination: parseNumber(row.discrimination, 1),
    guessing: parseNumber(row.guessing, 0.25),
    question_type: cleanText(row.question_type) || 'multiple_choice',
    cognitive_level: normalizeCognitiveLevel(row.cognitive_level),
    estimated_time_seconds: parseInteger(row.estimated_time_seconds, 60),
    target_language: cleanText(row.target_language) || 'both',
    times_used: parseInteger(row.times_used, 0),
    times_correct: parseInteger(row.times_correct, 0),
    is_active: parseBoolean(row.is_active, true),
    created_at: cleanText(row.created_at),
    updated_at: cleanText(row.updated_at),
    explanation_ar: cleanText(row.explanation_ar),
    explanation_he: cleanText(row.explanation_he),
    tags: parseTags(row.tags),
    weight: parseNumber(row.weight, 1),
    created_by: cleanUuid(row.created_by),
  };

  return Object.fromEntries(QUESTION_COLUMNS.map((column) => [column, payload[column] ?? null]));
}

async function loadSubjects(supabase) {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, code, name_en, name_ar, name_he, is_active');

  if (error) throw error;

  const map = new Map();
  (data || []).forEach((subject) => {
    [subject.code, subject.name_en, subject.name_ar, subject.name_he]
      .map(normalizeSubjectKey)
      .filter(Boolean)
      .forEach((key) => map.set(key, subject));
  });
  return map;
}

async function main() {
  const filePath = path.resolve(argValue('--file', DEFAULT_CSV));
  const commit = hasFlag('--commit');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!fs.existsSync(filePath)) throw new Error(`CSV file not found: ${filePath}`);
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');

  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const headerErrors = validateHeaders(rows);
  if (headerErrors.length) throw new Error(headerErrors.join('\n'));

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const subjectMap = await loadSubjects(supabase);
  const errors = [];
  const payloads = [];

  rows.forEach((row) => {
    errors.push(...validateRow(row));
    const subject = cleanText(row.subject_id)
      ? { id: cleanText(row.subject_id) }
      : subjectMap.get(resolveSubjectKey(row.subject_key));

    if (!subject?.id) {
      errors.push(`line ${row.__line}: unknown subject_key "${row.subject_key}"`);
      return;
    }

    payloads.push(toQuestionPayload(row, subject.id));
  });

  const uniqueIds = new Set(payloads.map((item) => item.id));
  if (uniqueIds.size !== payloads.length) errors.push('CSV contains duplicate import_id values.');

  if (errors.length) {
    console.error(`Import validation failed with ${errors.length} issue(s):`);
    errors.slice(0, 40).forEach((error) => console.error(`- ${error}`));
    if (errors.length > 40) console.error(`- ...and ${errors.length - 40} more`);
    process.exit(1);
  }

  console.log(`Validated ${payloads.length} question(s) from ${filePath}`);
  console.log(`Mode: ${commit ? 'COMMIT to Supabase' : 'DRY RUN only'}`);

  if (!commit) {
    const bySubject = new Map();
    payloads.forEach((item) => bySubject.set(item.subject_id, (bySubject.get(item.subject_id) || 0) + 1));
    console.log(`Resolved ${bySubject.size} subject(s). Add --commit to insert/update.`);
    return;
  }

  let saved = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
    saved += batch.length;
    console.log(`Saved ${saved}/${payloads.length}`);
  }

  console.log(`Done. Imported ${saved} question(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
