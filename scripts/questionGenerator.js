/**
 * QUESTION GENERATOR - DeepSeek API Integration
 * 
 * Scans psychometric exam PDFs and generates questions with IRT parameters
 * Uses DeepSeek API for intelligent parsing and question extraction
 */

import axios from 'axios';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';

// DeepSeek API Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Validate API key
if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-api-key-here') {
  console.error('❌ Error: DEEPSEEK_API_KEY not found in environment variables!');
  console.error('   Please create a .env file with: DEEPSEEK_API_KEY=your-actual-api-key');
  process.exit(1);
}

console.log('✅ DeepSeek API key loaded successfully');

// Folder containing psychometric exams
const EXAMS_FOLDER = './data/psychometric';

// Subject mapping
const SUBJECT_MAPPING = {
  'mathematics': 'MATH',
  'math': 'MATH',
  'מתמטיקה': 'MATH',
  'رياضيات': 'MATH',
  
  'english': 'ENG',
  'אנגלית': 'ENG',
  'إنجليزية': 'ENG',
  
  'hebrew': 'HEB',
  'עברית': 'HEB',
  'عبرية': 'HEB',
  
  'history': 'HIST',
  'היסטוריה': 'HIST',
  'تاريخ': 'HIST',
  
  'literature': 'LIT',
  'ספרות': 'LIT',
  'أدب': 'LIT',
  
  'citizenship': 'CIV',
  'אזרחות': 'CIV',
  'مواطنة': 'CIV',
  
  'physics': 'PHYS',
  'פיזיקה': 'PHYS',
  'فيزياء': 'PHYS',
  
  'chemistry': 'CHEM',
  'כימיה': 'CHEM',
  'كيمياء': 'CHEM',
  
  'biology': 'BIO',
  'ביולוגיה': 'BIO',
  'أحياء': 'BIO',
  
  'computer science': 'CS',
  'מדעי המחשב': 'CS',
  'علوم الحاسوب': 'CS'
};

/**
 * Main function to process all exams
 */
export async function processAllExams() {
  console.log('🚀 Starting Question Generation Process...\n');

  try {
    // Check if exams folder exists
    if (!fs.existsSync(EXAMS_FOLDER)) {
      console.log(`📁 Creating exams folder: ${EXAMS_FOLDER}`);
      fs.mkdirSync(EXAMS_FOLDER, { recursive: true });
      console.log('✅ Folder created. Please add psychometric exam PDFs to this folder.');
      return;
    }

    // Get all PDF files recursively
    const files = getAllPDFFiles(EXAMS_FOLDER);

    if (files.length === 0) {
      console.log('⚠️  No PDF files found in the exams folder.');
      console.log(`   Please add psychometric exam PDFs to: ${EXAMS_FOLDER}`);
      return;
    }

    console.log(`📚 Found ${files.length} exam files:\n`);
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // Get subjects from database
    const subjects = await getSubjects();
    console.log(`✅ Loaded ${subjects.length} subjects from database\n`);

    // Process each file
    let totalQuestions = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Processing: ${file} (${i + 1}/${files.length})`);
      console.log('='.repeat(60));

      const questions = await processExamFile(file, subjects);
      
      if (questions && questions.length > 0) {
        console.log(`✅ Generated ${questions.length} questions from ${file}`);
        totalQuestions += questions.length;
      } else {
        console.log(`⚠️  No questions generated from ${file}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 COMPLETE! Generated ${totalQuestions} total questions`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error processing exams:', error.message);
    throw error;
  }
}

/**
 * Recursively get all PDF files from directory and subdirectories
 */
function getAllPDFFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      getAllPDFFiles(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.pdf')) {
      // Add PDF file to list
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Process a single exam file
 */
async function processExamFile(filePath, subjects) {
  try {
    // Read PDF file
    const fileContent = fs.readFileSync(filePath);
    const base64Content = fileContent.toString('base64');

    // Extract text from PDF using DeepSeek
    console.log('📖 Extracting text from PDF...');
    const extractedText = await extractTextFromPDF(base64Content, path.basename(filePath));

    if (!extractedText) {
      console.log('⚠️  Could not extract text from PDF');
      return [];
    }

    console.log(`✅ Extracted ${extractedText.length} characters`);

    // Identify subject
    console.log('🔍 Identifying subject...');
    const subject = await identifySubject(extractedText, subjects);
    
    if (!subject) {
      console.log('⚠️  Could not identify subject');
      return [];
    }

    console.log(`✅ Identified subject: ${subject.name_en} (${subject.code})`);

    // Parse questions from text
    console.log('🔨 Parsing questions...');
    const parsedQuestions = await parseQuestions(extractedText, subject);

    if (!parsedQuestions || parsedQuestions.length === 0) {
      console.log('⚠️  No questions parsed');
      return [];
    }

    console.log(`✅ Parsed ${parsedQuestions.length} questions`);

    // Estimate IRT parameters
    console.log('📊 Estimating IRT parameters...');
    const questionsWithIRT = await estimateIRTParameters(parsedQuestions, subject);

    console.log(`✅ Added IRT parameters to ${questionsWithIRT.length} questions`);

    // Save to database
    console.log('💾 Saving to database...');
    const saved = await saveQuestionsToDatabase(questionsWithIRT, subject);

    console.log(`✅ Saved ${saved} questions to database`);

    return questionsWithIRT;

  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Extract text from PDF using DeepSeek API
 */
async function extractTextFromPDF(base64Content, filename) {
  try {
    const prompt = `You are a PDF text extractor. Extract all text content from this psychometric exam PDF.
    
Instructions:
1. Extract ALL text including questions, answers, and instructions
2. Preserve the structure and formatting
3. Include question numbers
4. Include all answer options
5. Return ONLY the extracted text, no additional commentary

PDF Filename: ${filename}

Extract the text now:`;

    const response = await callDeepSeekAPI(prompt, {
      temperature: 0.1,
      max_tokens: 8000
    });

    return response;
  } catch (error) {
    console.error('Error extracting text from PDF:', error.message);
    return null;
  }
}

/**
 * Identify the subject of the exam
 */
async function identifySubject(text, subjects) {
  try {
    const subjectList = subjects.map(s => 
      `${s.code}: ${s.name_en} (${s.name_ar} / ${s.name_he})`
    ).join('\n');

    const prompt = `You are analyzing a psychometric exam to identify its subject.

Available subjects:
${subjectList}

Exam text (first 1000 characters):
${text.substring(0, 1000)}

Based on the content, keywords, and context, identify which subject this exam belongs to.

Respond with ONLY the subject code (e.g., MATH, ENG, PHYS, etc.). No explanation needed.`;

    const response = await callDeepSeekAPI(prompt, {
      temperature: 0.1,
      max_tokens: 50
    });

    const subjectCode = response.trim().toUpperCase();
    const subject = subjects.find(s => s.code === subjectCode);

    return subject || null;
  } catch (error) {
    console.error('Error identifying subject:', error.message);
    return null;
  }
}

/**
 * Parse questions from extracted text
 */
async function parseQuestions(text, subject) {
  try {
    const prompt = `You are a psychometric exam parser. Parse the following exam text and extract ALL questions in a structured format.

Subject: ${subject.name_en} (${subject.name_ar} / ${subject.name_he})

Instructions:
1. Extract each question with its 4 multiple choice options
2. Identify the correct answer
3. Translate questions to both Arabic and Hebrew if not already present
4. Determine the cognitive level (knowledge, comprehension, application, analysis, synthesis, evaluation)
5. Estimate difficulty on a scale of 1-5 (1=very easy, 5=very hard)

Return the questions in this EXACT JSON format:
[
  {
    "question_text_ar": "Arabic question text",
    "question_text_he": "Hebrew question text",
    "option_a_ar": "Arabic option A",
    "option_a_he": "Hebrew option A",
    "option_b_ar": "Arabic option B",
    "option_b_he": "Hebrew option B",
    "option_c_ar": "Arabic option C",
    "option_c_he": "Hebrew option C",
    "option_d_ar": "Arabic option D",
    "option_d_he": "Hebrew option D",
    "correct_answer": "A",
    "cognitive_level": "application",
    "estimated_difficulty": 3
  }
]

Exam text:
${text}

Parse all questions now and return ONLY the JSON array:`;

    const response = await callDeepSeekAPI(prompt, {
      temperature: 0.3,
      max_tokens: 8000
    });

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return [];
    }

    const questions = JSON.parse(jsonMatch[0]);
    return questions;

  } catch (error) {
    console.error('Error parsing questions:', error.message);
    return [];
  }
}

/**
 * Estimate IRT parameters for questions
 */
async function estimateIRTParameters(questions, subject) {
  try {
    const prompt = `You are an IRT (Item Response Theory) expert. Estimate the IRT parameters for these psychometric questions.

Subject: ${subject.name_en}

IRT Parameters to estimate:
1. Difficulty (b): -3.0 to +3.0 scale
   - -3.0 to -1.5: Very easy
   - -1.5 to -0.5: Easy
   - -0.5 to 0.5: Medium
   - 0.5 to 1.5: Hard
   - 1.5 to 3.0: Very hard

2. Discrimination (a): 0.5 to 2.5 scale
   - 0.5-1.0: Low discrimination
   - 1.0-1.5: Medium discrimination
   - 1.5-2.0: High discrimination
   - 2.0-2.5: Very high discrimination

3. Guessing (c): 0.20 to 0.30 (typically 0.25 for 4-option MC)

Questions:
${JSON.stringify(questions.map((q, i) => ({
  index: i,
  question_ar: q.question_text_ar,
  cognitive_level: q.cognitive_level,
  estimated_difficulty: q.estimated_difficulty
})), null, 2)}

For each question, provide IRT parameters based on:
- Content complexity
- Cognitive level required
- Estimated difficulty
- Subject matter

Return ONLY a JSON array with this format:
[
  {
    "index": 0,
    "difficulty": -0.5,
    "discrimination": 1.5,
    "guessing": 0.25
  }
]`;

    const response = await callDeepSeekAPI(prompt, {
      temperature: 0.2,
      max_tokens: 4000
    });

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in IRT response');
      // Use default parameters
      return questions.map(q => ({
        ...q,
        difficulty: 0.0,
        discrimination: 1.5,
        guessing: 0.25
      }));
    }

    const irtParams = JSON.parse(jsonMatch[0]);

    // Merge IRT parameters with questions
    const questionsWithIRT = questions.map((q, i) => {
      const params = irtParams.find(p => p.index === i) || {
        difficulty: 0.0,
        discrimination: 1.5,
        guessing: 0.25
      };

      return {
        ...q,
        difficulty: params.difficulty,
        discrimination: params.discrimination,
        guessing: params.guessing
      };
    });

    return questionsWithIRT;

  } catch (error) {
    console.error('Error estimating IRT parameters:', error.message);
    // Return questions with default IRT parameters
    return questions.map(q => ({
      ...q,
      difficulty: 0.0,
      discrimination: 1.5,
      guessing: 0.25
    }));
  }
}

/**
 * Save questions to database
 */
async function saveQuestionsToDatabase(questions, subject) {
  try {
    let savedCount = 0;

    for (const question of questions) {
      const { error } = await supabase
        .from('questions')
        .insert({
          subject_id: subject.id,
          question_text_ar: question.question_text_ar,
          question_text_he: question.question_text_he,
          option_a_ar: question.option_a_ar,
          option_a_he: question.option_a_he,
          option_b_ar: question.option_b_ar,
          option_b_he: question.option_b_he,
          option_c_ar: question.option_c_ar,
          option_c_he: question.option_c_he,
          option_d_ar: question.option_d_ar,
          option_d_he: question.option_d_he,
          correct_answer: question.correct_answer,
          difficulty: question.difficulty,
          discrimination: question.discrimination,
          guessing: question.guessing,
          cognitive_level: question.cognitive_level,
          target_language: 'both',
          is_active: true
        });

      if (!error) {
        savedCount++;
      } else {
        console.error('Error saving question:', error.message);
      }
    }

    return savedCount;
  } catch (error) {
    console.error('Error saving to database:', error.message);
    return 0;
  }
}

/**
 * Get subjects from database
 */
async function getSubjects() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching subjects:', error.message);
    return [];
  }
}

/**
 * Call DeepSeek API
 */
async function callDeepSeekAPI(prompt, options = {}) {
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Run if called directly
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  processAllExams()
    .then(() => {
      console.log('\n✅ Question generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export default {
  processAllExams,
  processExamFile
};
