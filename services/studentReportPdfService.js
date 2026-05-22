import { Platform } from 'react-native';

import {
  buildStudentReportFilename,
  buildStudentReportHtml,
  deriveImprovementItems,
  deriveStrengthBuckets,
} from '../utils/studentReportPdfBuilder';

function createPdfCaptureElementFromHtml(html) {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const element = window.document.createElement('div');
  const styleContent = [...doc.querySelectorAll('style')]
    .map((style) => style.textContent || '')
    .join('\n');

  element.setAttribute('aria-hidden', 'true');
  element.style.position = 'fixed';
  element.style.left = '-10000px';
  element.style.top = '0';
  element.style.width = '794px';
  element.style.minHeight = '1123px';
  element.style.background = '#ffffff';
  element.style.opacity = '1';
  element.style.pointerEvents = 'none';
  element.style.display = 'block';
  element.style.visibility = 'visible';
  element.innerHTML = `
    <style>${styleContent}</style>
    <div class="pdf-root">
      ${doc.body?.innerHTML || html}
    </div>
  `;

  return element;
}

async function downloadReportPdfFromHtml(html, filename) {
  if (typeof window === 'undefined' || !window.document?.body) {
    throw new Error('PDF download is only available in a browser document.');
  }

  if (Platform.OS !== 'web') {
    throw new Error('Direct PDF download is only available on web.');
  }

  const html2pdfModule = require('html2pdf.js');
  const html2pdf = html2pdfModule?.default || html2pdfModule;
  if (typeof html2pdf !== 'function') {
    throw new Error('html2pdf.js is not available.');
  }

  const container = createPdfCaptureElementFromHtml(html);
  window.document.body.appendChild(container);

  try {
    await Promise.resolve();
    const pdfRoot = container.querySelector('.pdf-root') || container;

    await html2pdf()
      .set({
        filename,
        margin: [10, 10, 10, 10],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          letterRendering: true,
        },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.avoid-break', '.section-card', '.rec-card', '.kpi-card', '.cover'],
        },
      })
      .from(pdfRoot)
      .save();
  } finally {
    container.remove();
  }
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function subjectScore(item) {
  return clamp(safeNum(item?.ability_score ?? item?.score, 0), 0, 100);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Build and download/share a student insight report PDF.
 */
export async function generateStudentReportPdf({
  student,
  subjectResults = [],
  overallScore,
  strengths = [],
  improvements = [],
  recommendations = [],
  institutions = [],
  language = 'ar',
  personality = null,
  interests = [],
  meta = {},
  t,
}) {
  if (!student) {
    throw new Error('Student data is required for PDF generation.');
  }

  if (!subjectResults?.length && !recommendations?.length) {
    throw new Error('Report content is empty.');
  }

  if (typeof t !== 'function') {
    throw new Error('Translation function is required for PDF generation.');
  }

  const strengthBuckets = deriveStrengthBuckets(subjectResults);
  const generatedStrengths = strengthBuckets.all.length
    ? strengthBuckets.all
    : strengths;
  const generatedImprovements = deriveImprovementItems(subjectResults, language).length
    ? deriveImprovementItems(subjectResults, language).map((entry) => entry.item)
    : improvements;

  const html = buildStudentReportHtml({
    student,
    subjectResults,
    overallScore,
    strengths: generatedStrengths,
    improvements: generatedImprovements,
    recommendations,
    institutions,
    language,
    personality,
    interests,
    meta,
    t,
  });

  console.log('PDF report sections:', {
    subjects: subjectResults.length,
    recommendations: recommendations.length,
    strengths: generatedStrengths.length,
    improvements: generatedImprovements.length,
    institutions: institutions.length,
    htmlLength: html?.length || 0,
  });

  if (!html || html.length < 1200) {
    throw new Error('Report content is empty.');
  }

  const filename = buildStudentReportFilename(student);

  if (Platform.OS === 'web') {
    await downloadReportPdfFromHtml(html, filename);
    return { success: true, filename, platform: 'web' };
  }

  let Print;
  try {
    Print = require('expo-print');
  } catch {
    throw new Error('expo-print is not installed.');
  }

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  let Sharing = null;
  try {
    Sharing = require('expo-sharing');
  } catch {
    Sharing = null;
  }

  const shareAsyncFn = Sharing?.shareAsync || Sharing?.default?.shareAsync;

  if (!shareAsyncFn) {
    return { success: true, filename, uri, platform: 'native', shared: false };
  }

  await shareAsyncFn(uri, {
    UTI: 'com.adobe.pdf',
    mimeType: 'application/pdf',
    dialogTitle: filename,
  });

  return { success: true, filename, uri, platform: 'native', shared: true };
}

/** @deprecated thresholds updated — use deriveStrengthBuckets */
export function deriveReportStrengths(subjectResults = []) {
  return deriveStrengthBuckets(subjectResults).all;
}

export function deriveReportImprovements(subjectResults = [], language = 'ar') {
  return deriveImprovementItems(subjectResults, language).map((entry) => entry.item);
}

export function flattenReportInstitutions(recommendations = []) {
  const seen = new Set();
  const out = [];

  for (const recommendation of recommendations || []) {
    for (const program of recommendation?.institutions || recommendation?.programs || []) {
      const key =
        program?.institution_id ||
        program?.institution?.id ||
        program?.id ||
        program?.institution_name ||
        program?.name;

      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(program);
    }
  }

  return out;
}
