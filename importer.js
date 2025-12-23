/**
 * CHE Programs Importer (FULL FIX - SEARCH PAGES + SOURCE_URL UPSERT)
 * ==================================================================
 * Crawls CHE "search programs" pages and imports each program page into Supabase.
 *
 * Key fixes:
 *  - Use SEARCH pages (not /course/page/)
 *  - Extract program links from search results list
 *  - Parse program pages with strong fallbacks (og:title/title/labels)
 *  - UPSERT programs by stable key: source_url (prevents 3729 -> 1 row collapse)
 *  - Skip inserting Unknown Program / Unknown Institution
 *
 * Requires in DB:
 *   - public.upsert_institution RPC
 *   - public.upsert_program RPC (ON CONFLICT source_url)  <-- REQUIRED
 *
 * Env:
 *   - SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - CHE_SEARCH_HE (default: HE search URL)
 *   - CHE_SEARCH_EN (optional)
 *   - MAX_PAGES (default: 500)
 *   - CONCURRENCY (default: 5)
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import 'dotenv/config';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

/* =========================
   ENV
   ========================= */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Your correct search pages:
const CHE_SEARCH_HE =
  process.env.CHE_SEARCH_HE ||
  'https://che.org.il/%d7%97%d7%99%d7%a4%d7%95%d7%a9-%d7%aa%d7%95%d7%9b%d7%a0%d7%99%d7%95%d7%aa-%d7%9c%d7%99%d7%9e%d7%95%d7%93-%d7%9e%d7%95%d7%a1%d7%93%d7%95%d7%aa/';

const CHE_SEARCH_EN =
  process.env.CHE_SEARCH_EN ||
  'https://che.org.il/en/%d7%97%d7%99%d7%a4%d7%95%d7%a9-%d7%aa%d7%95%d7%9b%d7%a0%d7%99%d7%95%d7%aa-%d7%9c%d7%99%d7%9e%d7%95%d7%93-%d7%9e%d7%95%d7%a1%d7%93%d7%95%d7%aa/';

const MAX_PAGES = Number(process.env.MAX_PAGES || 500);
const CONCURRENCY = Number(process.env.CONCURRENCY || 5);

/* =========================
   VALIDATION
   ========================= */

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing env variables:');
  console.error('  SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL);
  console.error('  SUPABASE_SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

/* =========================
   CLIENTS
   ========================= */

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const limit = pLimit(CONCURRENCY);

const headers = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
  'accept-language': 'he-IL,he;q=0.9,en;q=0.8',
};

/* =========================
   HELPERS
   ========================= */

async function safeFetch(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.text();
}

function normalizeSpaces(s) {
  if (!s) return s;
  return String(s).replace(/\s+/g, ' ').trim();
}

function absoluteCheUrl(hrefRaw) {
  if (!hrefRaw) return null;
  if (hrefRaw.startsWith('http')) return hrefRaw;
  if (hrefRaw.startsWith('/')) return `https://che.org.il${hrefRaw}`;
  return `https://che.org.il/${hrefRaw}`;
}

function pickText($, selectors) {
  for (const sel of selectors) {
    const t = $(sel).first().text().trim();
    if (t) return t;
  }
  return null;
}

/**
 * Build paged URL for search pages.
 * Works for:
 *   base with no query:   ?paged=2
 *   base with query:      &paged=2
 */
function buildPagedUrl(base, page) {
  const hasQuery = base.includes('?');
  const sep = hasQuery ? '&' : '?';
  return `${base}${sep}paged=${page}`;
}

/**
 * Search results page → extract program detail links.
 * We accept links that contain /course/ and have a slug after it.
 */
function extractProgramLinksFromSearch(html) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href*="/course/"]').each((_, el) => {
    const href = absoluteCheUrl($(el).attr('href'));
    if (!href) return;

    // Reject listing pages like /course/page/2/ or /course/
    if (href.includes('/course/page/')) return;
    if (href.endsWith('/course/') || href.endsWith('/en/course/') || href.endsWith('/ar/course/')) return;

    // Must include a slug after "course"
    const parts = href.split('/').filter(Boolean);
    const idx = parts.indexOf('course');
    if (idx === -1) return;
    if (parts.length <= idx + 1) return;

    links.add(href);
  });

  return [...links];
}

/**
 * Try extracting "label: value" patterns from page text.
 * Helps when the page has a structured details block.
 */
function findValueByLabel($, labelVariants) {
  const bodyText = normalizeSpaces($.root().text());
  for (const label of labelVariants) {
    // rough pattern: "Label: VALUE"
    const re = new RegExp(`${label}\\s*[:：]\\s*([^\\n\\r\\t|]+)`, 'i');
    const m = bodyText.match(re);
    if (m && m[1]) return normalizeSpaces(m[1]);
  }
  return null;
}

function inferLevel(name) {
  const n = (name || '').toLowerCase();

  // Hebrew
  if (n.includes('תואר שלישי') || n.includes('דוקטור') || n.includes('דוקטורט')) return 'phd';
  if (n.includes('תואר שני')) return 'master';
  if (n.includes('תואר ראשון')) return 'bachelor';

  // English
  if (n.includes('phd') || n.includes('doctor')) return 'phd';
  if (n.includes('master') || n.includes('m.a') || n.includes('m.sc') || n.includes('msc')) return 'master';
  if (n.includes('bachelor') || n.includes('b.a') || n.includes('b.sc') || n.includes('bsc')) return 'bachelor';

  return 'unknown';
}

/* =========================
   PARSE PROGRAM PAGE
   ========================= */

async function parseProgramPage(url) {
  const html = await safeFetch(url);
  const $ = cheerio.load(html);

  const ogTitle = normalizeSpaces($('meta[property="og:title"]').attr('content'));
  const docTitle = normalizeSpaces($('title').text());

  const nameFromH1 = normalizeSpaces(pickText($, [
    'h1',
    '.entry-title',
    'header h1',
    '.elementor-heading-title',
  ]));

  const programName =
    nameFromH1 ||
    ogTitle ||
    (docTitle ? docTitle.replace(/\s*\|\s*.*$/, '').trim() : null) ||
    'Unknown Program';

  // Institution: try specific selectors, then label parsing, then fallback
  const instFromSelectors = normalizeSpaces(pickText($, [
    '.institution',
    '.course-institution',
    '.entry-content .institution',
    '.entry-content strong',
  ]));

  const instFromLabel = findValueByLabel($, [
    'מוסד לימודים',
    'מוסד',
    'Institution',
    'Academic institution',
  ]);

  const institution =
    instFromSelectors ||
    instFromLabel ||
    'Unknown Institution';

  const faculty =
    normalizeSpaces(pickText($, ['.faculty', '.course-faculty'])) ||
    findValueByLabel($, ['פקולטה', 'Faculty']);

  const degreeType =
    normalizeSpaces(pickText($, ['.degree-type', '.course-degree-type'])) ||
    findValueByLabel($, ['סוג תואר', 'Degree type']);

  return {
    source_url: url,
    name_he: normalizeSpaces(programName),
    name_en: null,
    name_ar: null,

    institution_he: normalizeSpaces(institution),
    institution_en: null,
    institution_ar: null,

    faculty_he: faculty ? normalizeSpaces(faculty) : null,
    faculty_en: null,
    faculty_ar: null,

    level: inferLevel(programName),
    degree_type: degreeType ? normalizeSpaces(degreeType) : null,
  };
}

/* =========================
   UPSERT TO SUPABASE (RPC)
   ========================= */

async function upsertToSupabase(program) {
  // Hard guard: do not insert junk rows
  if (!program.source_url) throw new Error('Missing source_url');
  if (!program.name_he || program.name_he === 'Unknown Program') {
    throw new Error('Parse failed: Unknown Program');
  }
  if (!program.institution_he || program.institution_he === 'Unknown Institution') {
    throw new Error('Parse failed: Unknown Institution');
  }

  const { data: institutionId, error: instErr } = await supabase.rpc(
    'upsert_institution',
    {
      p_name_he: program.institution_he,
      p_name_ar: program.institution_ar,
      p_name_en: program.institution_en,
      p_type: null,
      p_website: null,
    }
  );
  if (instErr) throw instErr;

  const { error: progErr } = await supabase.rpc('upsert_program', {
    p_institution_id: institutionId,
    p_source_url: program.source_url,          // <<< KEY FIX
    p_name_he: program.name_he,
    p_name_ar: program.name_ar,
    p_name_en: program.name_en,
    p_level: program.level,
    p_degree_type: program.degree_type,
    p_faculty_he: program.faculty_he,
    p_faculty_ar: program.faculty_ar,
    p_faculty_en: program.faculty_en,
  });
  if (progErr) throw progErr;
}

/* =========================
   CRAWL SEARCH LISTING
   ========================= */

async function crawlSearch(baseUrl) {
  const allLinks = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildPagedUrl(baseUrl, page);

    try {
      const html = await safeFetch(url);
      const links = extractProgramLinksFromSearch(html);

      if (links.length === 0) {
        console.log(`🟡 Page ${page}: 0 program links → stopping. URL=${url}`);
        break;
      }

      links.forEach((l) => allLinks.add(l));
      console.log(`📄 Page ${page}: +${links.length} (total ${allLinks.size})`);
    } catch (e) {
      console.log(`⚠️ Page ${page}: error → stopping. ${e.message}`);
      break;
    }
  }

  return [...allLinks];
}

/* =========================
   MAIN
   ========================= */

async function main() {
  console.log('🚀 CHE Importer started');
  console.log('Supabase:', SUPABASE_URL);
  console.log('Search HE:', CHE_SEARCH_HE);
  console.log(`MAX_PAGES=${MAX_PAGES} CONCURRENCY=${CONCURRENCY}`);

  const links = await crawlSearch(CHE_SEARCH_HE);
  console.log(`🔗 Found ${links.length} program pages`);

  // quick sanity sample
  console.log('🔎 Sample links:', links.slice(0, 5));

  let ok = 0;
  let fail = 0;

  await Promise.all(
    links.map((link) =>
      limit(async () => {
        try {
          const program = await parseProgramPage(link);
          await upsertToSupabase(program);
          ok++;

          if (ok % 50 === 0) {
            console.log(`✅ Imported ${ok} (fail ${fail})`);
          }
        } catch (e) {
          fail++;
          if (fail <= 30) {
            console.log(`❌ FAIL: ${link} -> ${e.message}`);
          }
        }
      })
    )
  );

  console.log(`🎉 DONE → success=${ok}, failed=${fail}`);
  console.log('✅ Tip: run in SQL:  select count(*) from public.programs;');
}

main().catch((e) => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
