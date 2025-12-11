/**
 * PDF-INSPIRED QUESTION GENERATOR
 * - reads psychometric PDFs
 * - analyzes their structure (questions/options)
 * - generates new questions that follow the same structure
 * - saves to Supabase using your questions schema
 *
 * Usage (from project root):
 *   node scripts/questionGenerator.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// load env (from project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// supabase - adjust relative path if needed
import { supabase } from '../config/supabase.js';

// CONFIG
const CONFIG = {
  DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  PSYCHOMETRIC_FOLDER: path.resolve(__dirname, '../data/psychometric'),
  QUESTIONS_TO_GENERATE_PER_FILE: 30,
  MAX_TOKENS: 8000,
  TIMEOUT: 60000
};

if (!CONFIG.DEEPSEEK_API_KEY) {
  console.error('❌ Missing DEEPSEEK_API_KEY in .env');
  process.exit(1);
}

// Helper: call DeepSeek and return raw content
async function callDeepSeek(messages, options = {}) {
  try {
    const res = await axios.post(
      CONFIG.DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? CONFIG.MAX_TOKENS
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.TIMEOUT
      }
    );
    return res.data?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.error('DeepSeek API Error:', err.response?.data || err.message);
    throw err;
  }
}

// Extract text from PDF buffer
async function extractTextFromPDFBuffer(buffer, filename = '') {
  try {
    const data = await pdf(buffer);
    const text = (data && data.text) ? data.text.replace(/\r\n/g, '\n') : '';
    console.log(`   → Extracted ${Math.max(0, text.length)} chars from ${filename}`);
    return text;
  } catch (err) {
    console.error('PDF parse error:', err.message);
    return '';
  }
}

// Stage 1: Analyze structure of the exam (returns JSON describing pattern)
async function analyzeExamStructure(examText, filename) {
  const prompt = [
    { role: 'system', content: 'You are an expert exam-structure analyst. Output ONLY valid JSON.' },
    {
      role: 'user',
      content:
`Analyze the following exam text and return a JSON object that describes the QUESTIONS STRUCTURE and PATTERNS.
Return EXACT JSON with these keys:
{
  "question_pattern": "short description e.g. 'Numbered question then 4 options labeled A,B,C,D on subsequent lines'",
  "example_question_snippet": "... (one short snippet showing structure)",
  "option_format": "how options are shown (inline / separate / lettered / roman)",
  "common_words_or_markers": ["list", "of", "useful", "keywords"],
  "difficulty_distribution": {"likely_easy_pct": 30, "likely_medium_pct": 50, "likely_hard_pct": 20},
  "language_mix": {"ar": 70, "he": 30},
  "notes": "any special notes about tables/images or multi-part items"
}

EXAM FILENAME: ${filename}
EXAM TEXT (first 4000 chars):
${examText.substring(0, 4000)}

Return JSON only.`
    }
  ];

  const raw = await callDeepSeek(prompt, { temperature: 0.2, max_tokens: 1500 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/m);
  if (!jsonMatch) {
    console.warn('Analysis returned no JSON; raw output length', raw.length);
    return null;
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn('Could not parse analysis JSON:', err.message);
    return null;
  }
}

// Stage 2: Generate N new questions that follow the structure
async function generateQuestionsFromStructure(structure, subjectCode, count = 20) {
  // Build a strict generator prompt that returns a JSON array ready for DB.
  const prompt = [
    { role: 'system', content: 'You are a psychometric question generator. Output ONLY valid JSON arrays.' },
    {
      role: 'user',
      content:
`We provide a DESCRIPTION of an exam's structure. Generate exactly ${count} NEW multiple-choice questions that follow this structure.
Each generated item must be an OBJECT with fields exactly matching the DB schema below:

{
  "question_text_ar": "Arabic text (required)",
  "question_text_he": "Hebrew text (required)",
  "option_a_ar": "Arabic option A",
  "option_a_he": "Hebrew option A",
  "option_b_ar": "...",
  "option_b_he": "...",
  "option_c_ar": "...",
  "option_c_he": "...",
  "option_d_ar": "...",
  "option_d_he": "...",
  "correct_answer": "A|B|C|D",
  "difficulty": -1.2,          // numeric between -3.0 and 3.0
  "discrimination": 1.5,      // positive numeric
  "guessing": 0.25,
  "question_type": "multiple_choice",
  "cognitive_level": "application|analysis|knowledge|comprehension|synthesis|evaluation",
  "estimated_time_seconds": 60,
  "target_language": "both"
}

Important rules:
1. Use the structure description exactly (question style, option formatting, cultural references).
2. Keep Arabic and Hebrew translations consistent and short (one-line answers).
3. Provide realistic difficulty values between -3.0 and +3.0 and discrimination in 0.5–2.5.
4. Return EXACTLY a JSON array (no commentary, no backticks).

Structure description:
${JSON.stringify(structure, null, 2)}

Generate now ${count} items.` }
  ];

  const raw = await callDeepSeek(prompt, { temperature: 0.8, max_tokens: 7000 });
  // extract JSON array
  const arrMatch = raw.match(/\[[\s\S]*\]/m);
  if (!arrMatch) {
    console.warn('Generation returned no JSON array; raw output length', raw.length);
    throw new Error('Generator returned invalid JSON');
  }
  try {
    const arr = JSON.parse(arrMatch[0]);
    if (!Array.isArray(arr)) throw new Error('Parsed generation is not an array');
    return arr;
  } catch (err) {
    console.error('Failed to parse generation JSON:', err.message);
    // surface raw for debugging (truncated)
    console.error('Raw generation (truncated):', raw.substring(0, 1000));
    throw err;
  }
}

// Normalize & validate items, set defaults for DB
function normalizeGeneratedItem(item) {
  // required fields check and safe defaults
  const required = [
    'question_text_ar','question_text_he',
    'option_a_ar','option_b_ar','option_c_ar','option_d_ar'
  ];
  for (const r of required) {
    if (!item[r]) item[r] = '';
  }

  // enforce correct answer
  const ca = (item.correct_answer || 'A').toString().toUpperCase();
  const correct = ['A','B','C','D'].includes(ca) ? ca : 'A';

  // clamp difficulty & discrimination
  let difficulty = Number(item.difficulty ?? 0);
  if (isNaN(difficulty)) difficulty = 0;
  difficulty = Math.max(-3.0, Math.min(3.0, difficulty));

  let discrimination = Number(item.discrimination ?? 1.5);
  if (isNaN(discrimination) || discrimination <= 0) discrimination = 1.5;

  let guessing = Number(item.guessing ?? 0.25);
  if (isNaN(guessing) || guessing < 0 || guessing > 1) guessing = 0.25;

  const cognitive = item.cognitive_level || 'application';
  const estTime = Number(item.estimated_time_seconds ?? 60) || 60;
  const tl = item.target_language || 'both';

  return {
    question_text_ar: item.question_text_ar,
    question_text_he: item.question_text_he,
    option_a_ar: item.option_a_ar,
    option_a_he: item.option_a_he || '',
    option_b_ar: item.option_b_ar,
    option_b_he: item.option_b_he || '',
    option_c_ar: item.option_c_ar,
    option_c_he: item.option_c_he || '',
    option_d_ar: item.option_d_ar,
    option_d_he: item.option_d_he || '',
    correct_answer: correct,
    difficulty,
    discrimination,
    guessing,
    question_type: item.question_type || 'multiple_choice',
    cognitive_level: cognitive,
    estimated_time_seconds: estTime,
    target_language: tl,
    is_active: true
  };
}

// Save batch to DB
async function saveQuestionsToDB(items, subjectId) {
  let saved = 0;
  for (const item of items) {
    try {
      const payload = {
        subject_id: subjectId,
        ...item
      };
      // simple duplicate check by Arabic snippet
      const snippet = (item.question_text_ar || '').substring(0, 120);
      const { data: existing } = await supabase
        .from('questions')
        .select('id')
        .ilike('question_text_ar', `%${snippet.replace(/%/g,'')}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('   ⚠ duplicate detected, skipping:', snippet.substring(0, 40));
        continue;
      }

      const { error } = await supabase.from('questions').insert(payload);
      if (error) {
        console.error('   ❌ DB insert error:', error.message);
      } else saved++;
    } catch (err) {
      console.error('   ❌ Save error:', err.message);
    }
  }
  return saved;
}

// Main: for each PDF, analyze structure then generate and save
async function main() {
  console.log('Starting PDF-inspired question generator...');
  if (!fs.existsSync(CONFIG.PSYCHOMETRIC_FOLDER)) {
    console.error('No psychometric folder found at', CONFIG.PSYCHOMETRIC_FOLDER);
    return;
  }

  const files = fs.readdirSync(CONFIG.PSYCHOMETRIC_FOLDER)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(CONFIG.PSYCHOMETRIC_FOLDER, f));

  if (files.length === 0) {
    console.error('No PDF files found in', CONFIG.PSYCHOMETRIC_FOLDER);
    return;
  }

  // Load active subjects
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_active', true);

  if (error || !subjects) {
    console.error('Could not load subjects from DB:', error?.message || 'no data');
    return;
  }

  for (const filePath of files) {
    try {
      const filename = path.basename(filePath);
      console.log(`\nProcessing file: ${filename}`);
      const buffer = fs.readFileSync(filePath);
      const text = await extractTextFromPDFBuffer(buffer, filename);
      if (!text || text.length < 50) { console.warn('  Extracted text too short, skipping'); continue; }

      // ANALYZE structure
      console.log('  Analyzing structure...');
      const structure = await analyzeExamStructure(text, filename) || { question_pattern: 'standard numbered MCQ' };
      console.log('  Structure:', structure.question_pattern || '(unknown)');

      // Pick a subject heuristically: attempt to find the first subject name/code in text
      let matchedSubject = subjects.find(s => {
        const check = (s.code || s.name_en || s.name_ar || s.name_he || '').toString().toLowerCase();
        return check && text.toLowerCase().includes(check);
      });

      // fallback: use first subject
      if (!matchedSubject) {
        matchedSubject = subjects[0];
        console.log('  No subject matched by text; using fallback subject:', matchedSubject.code);
      } else {
        console.log('  Mapped file to subject:', matchedSubject.code);
      }

      // GENERATE questions constrained by structure
      console.log(`  Generating ${CONFIG.QUESTIONS_TO_GENERATE_PER_FILE} questions that follow structure...`);
      const generated = await generateQuestionsFromStructure(structure, matchedSubject.code, CONFIG.QUESTIONS_TO_GENERATE_PER_FILE);

      // Normalize and save
      const normalized = generated.map(normalizeGeneratedItem);
      const saved = await saveQuestionsToDB(normalized, matchedSubject.id);
      console.log(`  Saved ${saved}/${normalized.length} questions for subject ${matchedSubject.code}.`);
    } catch (err) {
      console.error('  Error processing file:', err.message);
    }
  }

  console.log('Done.');
}

// Run main if direct
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();

export default { main };
