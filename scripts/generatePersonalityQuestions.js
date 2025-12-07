/**
 * PERSONALITY QUESTIONS GENERATOR
 * 
 * Uses DeepSeek AI to generate personality test questions
 * Supports multiple question types: 10-point scale, multiple choice, open-ended
 */

import { supabase } from '../config/supabase.js';

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-api-key-here';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Generate personality questions using DeepSeek AI
 */
async function generateQuestionsWithAI(dimensionCode, dimensionNameAr, dimensionNameHe, dimensionDescriptionEn, questionType, count = 10) {
  const prompt = `Generate ${count} personality test questions for the "${dimensionDescriptionEn}" dimension of the Big Five personality model.

Requirements:
- Question type: ${questionType}
- Language: Provide questions in both Arabic and Hebrew
- For scale_10 questions: Include endpoint labels (min and max)
- For multiple_choice questions: Provide 4 options in both languages
- For open_ended questions: Provide thought-provoking prompts
- Mix positive and negative statements (mark which are reverse-scored)
- Make questions culturally appropriate for Arab Israeli students

Format the response as a JSON array with this structure:
[
  {
    "question_text_ar": "Arabic question text",
    "question_text_he": "Hebrew question text",
    "question_type": "${questionType}",
    "is_reverse_scored": false,
    "scale_min_label_ar": "لا أوافق بشدة" (for scale_10 only),
    "scale_min_label_he": "לא מסכים בכלל" (for scale_10 only),
    "scale_max_label_ar": "أوافق بشدة" (for scale_10 only),
    "scale_max_label_he": "מסכים לחלוטין" (for scale_10 only),
    "options_ar": ["option1", "option2", "option3", "option4"] (for multiple_choice only),
    "options_he": ["option1", "option2", "option3", "option4"] (for multiple_choice only)
  }
]`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert psychologist specializing in personality assessment and the Big Five model. Generate culturally sensitive questions for Arab Israeli students.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    return null;
  }
}

/**
 * Fallback: Generate sample questions without AI
 */
function generateSampleQuestions(dimensionCode, dimensionNameAr, dimensionNameHe) {
  const questions = {
    openness: [
      {
        question_text_ar: 'أستمتع بتجربة أشياء جديدة ومختلفة',
        question_text_he: 'אני נהנה לנסות דברים חדשים ושונים',
        question_type: 'scale_10',
        is_reverse_scored: false,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'أفضل الالتزام بالطرق التقليدية بدلاً من تجربة أشياء جديدة',
        question_text_he: 'אני מעדיף להיצמד לדרכים מסורתיות במקום לנסות דברים חדשים',
        question_type: 'scale_10',
        is_reverse_scored: true,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'ما هو أكثر شيء يثير فضولك؟',
        question_text_he: 'מה הדבר שהכי מעורר את הסקרנות שלך?',
        question_type: 'open_ended',
        is_reverse_scored: false
      },
      {
        question_text_ar: 'عندما أواجه مشكلة، أنا:',
        question_text_he: 'כשאני מתמודד עם בעיה, אני:',
        question_type: 'multiple_choice',
        is_reverse_scored: false,
        options_ar: [
          'أبحث عن حلول إبداعية وغير تقليدية',
          'أستخدم الطرق المجربة والمختبرة',
          'أطلب المساعدة من الآخرين',
          'أتجنب المشكلة إذا أمكن'
        ],
        options_he: [
          'מחפש פתרונות יצירתיים ולא שגרתיים',
          'משתמש בשיטות מנוסות ובדוקות',
          'מבקש עזרה מאחרים',
          'נמנע מהבעיה אם אפשר'
        ]
      }
    ],
    conscientiousness: [
      {
        question_text_ar: 'أحافظ على ترتيب ونظافة مكاني',
        question_text_he: 'אני שומר על הסדר והניקיון במקום שלי',
        question_type: 'scale_10',
        is_reverse_scored: false,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'غالباً ما أترك الأمور للحظة الأخيرة',
        question_text_he: 'לעתים קרובות אני משאיר דברים לרגע האחרון',
        question_type: 'scale_10',
        is_reverse_scored: true,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'كيف تخطط ليومك عادة؟',
        question_text_he: 'איך אתה בדרך כלל מתכנן את היום שלך?',
        question_type: 'open_ended',
        is_reverse_scored: false
      }
    ],
    extraversion: [
      {
        question_text_ar: 'أستمتع بالتواجد في مجموعات كبيرة من الناس',
        question_text_he: 'אני נהנה להיות בקבוצות גדולות של אנשים',
        question_type: 'scale_10',
        is_reverse_scored: false,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'أفضل قضاء الوقت بمفردي على التواجد مع الآخرين',
        question_text_he: 'אני מעדיף לבלות זמן לבד על פני להיות עם אחרים',
        question_type: 'scale_10',
        is_reverse_scored: true,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'في نهاية الأسبوع، أفضل:',
        question_text_he: 'בסוף השבוע, אני מעדיף:',
        question_type: 'multiple_choice',
        is_reverse_scored: false,
        options_ar: [
          'الخروج مع الأصدقاء',
          'البقاء في المنزل والاسترخاء',
          'القيام بنشاط رياضي',
          'العمل على مشروع شخصي'
        ],
        options_he: [
          'לצאת עם חברים',
          'להישאר בבית ולהירגע',
          'לעשות פעילות ספורטיבית',
          'לעבוד על פרויקט אישי'
        ]
      }
    ],
    agreeableness: [
      {
        question_text_ar: 'أهتم بمشاعر الآخرين',
        question_text_he: 'אכפת לי מהרגשות של אחרים',
        question_type: 'scale_10',
        is_reverse_scored: false,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'أجد صعوبة في التعاطف مع الآخرين',
        question_text_he: 'אני מתקשה להזדהות עם אחרים',
        question_type: 'scale_10',
        is_reverse_scored: true,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'صف موقفاً ساعدت فيه شخصاً محتاجاً',
        question_text_he: 'תאר מצב שבו עזרת למישהו שהיה זקוק לעזרה',
        question_type: 'open_ended',
        is_reverse_scored: false
      }
    ],
    emotional_stability: [
      {
        question_text_ar: 'أبقى هادئاً في المواقف الصعبة',
        question_text_he: 'אני נשאר רגוע במצבים קשים',
        question_type: 'scale_10',
        is_reverse_scored: false,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'أشعر بالقلق بسهولة',
        question_text_he: 'אני מרגיש חרדה בקלות',
        question_type: 'scale_10',
        is_reverse_scored: true,
        scale_min_label_ar: 'لا أوافق بشدة',
        scale_min_label_he: 'לא מסכים בכלל',
        scale_max_label_ar: 'أوافق بشدة',
        scale_max_label_he: 'מסכים לחלוטין'
      },
      {
        question_text_ar: 'عندما أشعر بالتوتر، أنا:',
        question_text_he: 'כשאני מרגיש לחוץ, אני:',
        question_type: 'multiple_choice',
        is_reverse_scored: false,
        options_ar: [
          'أتنفس بعمق وأحاول الاسترخاء',
          'أتحدث مع صديق',
          'أمارس الرياضة',
          'أنعزل عن الآخرين'
        ],
        options_he: [
          'נושם עמוק ומנסה להירגע',
          'מדבר עם חבר',
          'מתאמן',
          'מתבודד מאחרים'
        ]
      }
    ]
  };

  return questions[dimensionCode] || [];
}

/**
 * Insert questions into database
 */
async function insertQuestions(dimensionId, questions, useAI = false) {
  const insertedCount = { success: 0, failed: 0 };

  for (const q of questions) {
    try {
      const questionData = {
        dimension_id: dimensionId,
        question_text_ar: q.question_text_ar,
        question_text_he: q.question_text_he,
        question_type: q.question_type,
        is_reverse_scored: q.is_reverse_scored || false,
        weight: 1.0,
        estimated_time_seconds: q.question_type === 'open_ended' ? 120 : 30,
        difficulty_level: 'medium',
        generated_by_ai: useAI,
        ai_model: useAI ? 'deepseek-chat' : null,
        is_active: true
      };

      // Add type-specific fields
      if (q.question_type === 'scale_10') {
        questionData.scale_min_label_ar = q.scale_min_label_ar;
        questionData.scale_min_label_he = q.scale_min_label_he;
        questionData.scale_max_label_ar = q.scale_max_label_ar;
        questionData.scale_max_label_he = q.scale_max_label_he;
      } else if (q.question_type === 'multiple_choice') {
        questionData.options_ar = q.options_ar;
        questionData.options_he = q.options_he;
      }

      const { error } = await supabase
        .from('personality_questions')
        .insert(questionData);

      if (error) {
        console.error('Error inserting question:', error);
        insertedCount.failed++;
      } else {
        insertedCount.success++;
      }
    } catch (error) {
      console.error('Error processing question:', error);
      insertedCount.failed++;
    }
  }

  return insertedCount;
}

/**
 * Main function to generate and seed personality questions
 */
async function seedPersonalityQuestions(useAI = false) {
  console.log('🎯 Starting personality questions generation...\n');

  try {
    // Get all personality dimensions
    const { data: dimensions, error: dimensionsError } = await supabase
      .from('personality_dimensions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (dimensionsError) throw dimensionsError;

    console.log(`Found ${dimensions.length} personality dimensions\n`);

    let totalInserted = 0;
    let totalFailed = 0;

    for (const dimension of dimensions) {
      console.log(`\n📝 Processing dimension: ${dimension.name_en} (${dimension.code})`);

      let allQuestions = [];

      // Generate different question types
      const questionTypes = ['scale_10', 'multiple_choice', 'open_ended'];
      const questionsPerType = useAI ? 3 : 0; // 3 of each type if using AI

      for (const qType of questionTypes) {
        if (useAI && DEEPSEEK_API_KEY !== 'your-api-key-here') {
          console.log(`  Generating ${qType} questions with AI...`);
          const aiQuestions = await generateQuestionsWithAI(
            dimension.code,
            dimension.name_ar,
            dimension.name_he,
            dimension.description_en,
            qType,
            questionsPerType
          );

          if (aiQuestions) {
            allQuestions = allQuestions.concat(aiQuestions);
            console.log(`  ✓ Generated ${aiQuestions.length} ${qType} questions`);
          } else {
            console.log(`  ✗ Failed to generate ${qType} questions with AI`);
          }
        }
      }

      // If AI generation failed or not used, use sample questions
      if (allQuestions.length === 0) {
        console.log('  Using sample questions...');
        allQuestions = generateSampleQuestions(
          dimension.code,
          dimension.name_ar,
          dimension.name_he
        );
      }

      // Insert questions
      console.log(`  Inserting ${allQuestions.length} questions...`);
      const result = await insertQuestions(dimension.id, allQuestions, useAI);
      
      console.log(`  ✓ Inserted: ${result.success}, Failed: ${result.failed}`);
      totalInserted += result.success;
      totalFailed += result.failed;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Generation complete!`);
    console.log(`   Total inserted: ${totalInserted}`);
    console.log(`   Total failed: ${totalFailed}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error seeding personality questions:', error);
    process.exit(1);
  }
}

// Run the script
const useAI = process.argv.includes('--ai');
console.log(`Mode: ${useAI ? 'AI-Generated' : 'Sample Questions'}\n`);

if (useAI && DEEPSEEK_API_KEY === 'your-api-key-here') {
  console.log('⚠️  Warning: DEEPSEEK_API_KEY not set. Using sample questions instead.\n');
  console.log('To use AI generation, set DEEPSEEK_API_KEY environment variable:\n');
  console.log('  export DEEPSEEK_API_KEY=your-actual-api-key\n');
}

seedPersonalityQuestions(useAI)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
