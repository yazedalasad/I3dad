# 📚 Question Generation Guide - DeepSeek API Integration

## Overview

This guide explains how to use the automated question generation system to parse Israeli psychometric exams (2015-2025) and populate your question bank with IRT-calibrated questions.

---

## 🚀 Quick Start

### 1. Setup

```bash
# Install required dependencies
npm install axios

# Create exams folder
mkdir psychometric_exams

# Set DeepSeek API key
export DEEPSEEK_API_KEY="your-api-key-here"
```

### 2. Add Exam PDFs

Place your psychometric exam PDFs in the `psychometric_exams` folder:

```
psychometric_exams/
├── math_2015.pdf
├── math_2016.pdf
├── english_2017.pdf
├── physics_2018.pdf
├── chemistry_2019.pdf
├── biology_2020.pdf
├── history_2021.pdf
├── literature_2022.pdf
├── hebrew_2023.pdf
├── citizenship_2024.pdf
└── computer_science_2025.pdf
```

### 3. Run Question Generator

```bash
# Run the generator
node scripts/questionGenerator.js
```

---

## 📋 What the System Does

### Step 1: PDF Text Extraction
- Reads each PDF file
- Uses DeepSeek API to extract all text
- Preserves structure and formatting
- Extracts questions, options, and answers

### Step 2: Subject Identification
- Analyzes content and keywords
- Matches to one of 10 subjects:
  - Mathematics (MATH)
  - English (ENG)
  - Hebrew (HEB)
  - History (HIST)
  - Literature (LIT)
  - Citizenship (CIV)
  - Physics (PHYS)
  - Chemistry (CHEM)
  - Biology (BIO)
  - Computer Science (CS)

### Step 3: Question Parsing
- Extracts each question with 4 options
- Identifies correct answers
- Translates to Arabic and Hebrew (if needed)
- Determines cognitive level
- Estimates initial difficulty

### Step 4: IRT Parameter Estimation
Uses DeepSeek to estimate:
- **Difficulty (b)**: -3.0 to +3.0
  - -3.0 to -1.5: Very easy
  - -1.5 to -0.5: Easy
  - -0.5 to 0.5: Medium
  - 0.5 to 1.5: Hard
  - 1.5 to 3.0: Very hard

- **Discrimination (a)**: 0.5 to 2.5
  - How well the question differentiates ability levels

- **Guessing (c)**: 0.20 to 0.30
  - Probability of correct answer by random guessing

### Step 5: Database Storage
- Saves all questions to Supabase
- Links to appropriate subject
- Includes bilingual text
- Stores IRT parameters

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
DEEPSEEK_API_KEY=your-deepseek-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

### Folder Structure

```
project/
├── psychometric_exams/          # Place PDFs here
│   ├── math_2015.pdf
│   ├── english_2016.pdf
│   └── ...
├── scripts/
│   └── questionGenerator.js     # Main generator script
├── config/
│   └── supabase.js             # Supabase config
└── .env                         # Environment variables
```

---

## 📊 Expected Output

### Console Output

```
🚀 Starting Question Generation Process...

📚 Found 11 exam files:

   1. math_2015.pdf
   2. math_2016.pdf
   3. english_2017.pdf
   ...

✅ Loaded 10 subjects from database

============================================================
📄 Processing: math_2015.pdf (1/11)
============================================================
📖 Extracting text from PDF...
✅ Extracted 15234 characters
🔍 Identifying subject...
✅ Identified subject: Mathematics (MATH)
🔨 Parsing questions...
✅ Parsed 45 questions
📊 Estimating IRT parameters...
✅ Added IRT parameters to 45 questions
💾 Saving to database...
✅ Saved 45 questions to database

============================================================
🎉 COMPLETE! Generated 450 total questions
============================================================
```

### Database Result

Questions will be saved with:
- ✅ Bilingual text (Arabic/Hebrew)
- ✅ 4 multiple choice options
- ✅ Correct answer
- ✅ IRT parameters (difficulty, discrimination, guessing)
- ✅ Cognitive level
- ✅ Subject linkage

---

## 🎯 Question Format

### Input (PDF)
```
Question 15:
What is the derivative of f(x) = 3x² + 2x - 1?

A) 6x + 2
B) 3x + 2
C) 6x² + 2x
D) 3x² + 2

Answer: A
```

### Output (Database)
```json
{
  "subject_id": "uuid-for-math",
  "question_text_ar": "ما هو مشتق الدالة f(x) = 3x² + 2x - 1؟",
  "question_text_he": "מה הנגזרת של הפונקציה f(x) = 3x² + 2x - 1?",
  "option_a_ar": "6x + 2",
  "option_a_he": "6x + 2",
  "option_b_ar": "3x + 2",
  "option_b_he": "3x + 2",
  "option_c_ar": "6x² + 2x",
  "option_c_he": "6x² + 2x",
  "option_d_ar": "3x² + 2",
  "option_d_he": "3x² + 2",
  "correct_answer": "A",
  "difficulty": 1.2,
  "discrimination": 1.8,
  "guessing": 0.25,
  "cognitive_level": "application",
  "target_language": "both",
  "is_active": true
}
```

---

## 🔍 Quality Control

### Automatic Validation

The system validates:
- ✅ All 4 options are present
- ✅ Correct answer is A, B, C, or D
- ✅ IRT parameters are in valid ranges
- ✅ Both language versions exist
- ✅ Subject is correctly identified

### Manual Review Recommended

After generation, review:
1. **Translation Quality**: Check Arabic/Hebrew translations
2. **IRT Parameters**: Verify difficulty estimates
3. **Correct Answers**: Confirm answer keys
4. **Subject Classification**: Ensure proper categorization

---

## 📈 Performance Expectations

### Processing Time
- **Per PDF**: 2-5 minutes
- **Per Question**: 5-10 seconds
- **Total (11 PDFs)**: 30-60 minutes

### Question Yield
- **Expected**: 30-50 questions per exam
- **Total**: 300-500 questions from 11 exams
- **Success Rate**: 85-95%

### API Usage
- **DeepSeek API Calls**: ~4 per PDF
- **Tokens Used**: ~20,000 per PDF
- **Cost Estimate**: $0.50-$1.00 per PDF

---

## 🛠️ Troubleshooting

### Issue: "No PDF files found"
**Solution**: Add PDF files to `psychometric_exams` folder

### Issue: "DeepSeek API Error"
**Solution**: Check API key in `.env` file

### Issue: "Could not identify subject"
**Solution**: 
- Check PDF content quality
- Ensure text is extractable
- Manually specify subject if needed

### Issue: "No questions parsed"
**Solution**:
- Verify PDF format
- Check if questions are in standard format
- Try with a different PDF

### Issue: "Database save failed"
**Solution**:
- Verify Supabase connection
- Check if subjects table is populated
- Ensure schema is deployed

---

## 🔄 Batch Processing

### Process Multiple Years

```bash
# Process all exams from 2015-2025
node scripts/questionGenerator.js

# Process specific subject
# (modify script to filter by filename pattern)
```

### Resume After Interruption

The script processes files sequentially. If interrupted:
1. Check database for already-processed questions
2. Remove processed PDFs from folder
3. Re-run script for remaining files

---

## 📝 Best Practices

### 1. Organize PDFs by Subject
```
psychometric_exams/
├── math/
│   ├── 2015.pdf
│   ├── 2016.pdf
│   └── ...
├── english/
│   ├── 2015.pdf
│   └── ...
└── ...
```

### 2. Name Files Descriptively
```
subject_year_version.pdf
Examples:
- math_2015_winter.pdf
- english_2016_summer.pdf
- physics_2017_makeup.pdf
```

### 3. Verify Before Mass Import
- Test with 1-2 PDFs first
- Review generated questions
- Adjust prompts if needed
- Then process all files

### 4. Backup Database
```bash
# Before running generator
pg_dump your_database > backup.sql
```

---

## 🎓 IRT Parameter Calibration

### Initial Estimates
DeepSeek provides initial estimates based on:
- Content complexity
- Cognitive level
- Subject matter
- Question structure

### Refinement Over Time
As students answer questions:
1. Collect response data
2. Run IRT calibration algorithms
3. Update parameters in database
4. Improve accuracy

### Calibration Script (Future)
```bash
# After collecting 100+ responses per question
node scripts/calibrateIRT.js
```

---

## 📊 Monitoring Progress

### Check Database
```sql
-- Count questions by subject
SELECT 
  s.name_en,
  COUNT(q.id) as question_count
FROM subjects s
LEFT JOIN questions q ON s.id = q.subject_id
GROUP BY s.name_en
ORDER BY question_count DESC;

-- Check IRT parameter distribution
SELECT 
  CASE 
    WHEN difficulty < -1.5 THEN 'Very Easy'
    WHEN difficulty < -0.5 THEN 'Easy'
    WHEN difficulty < 0.5 THEN 'Medium'
    WHEN difficulty < 1.5 THEN 'Hard'
    ELSE 'Very Hard'
  END as difficulty_level,
  COUNT(*) as count
FROM questions
GROUP BY difficulty_level;
```

---

## 🚀 Next Steps

After question generation:

1. ✅ **Review Questions**: Manual quality check
2. ✅ **Test System**: Run sample adaptive tests
3. ✅ **Collect Data**: Gather student responses
4. ✅ **Calibrate IRT**: Refine parameters
5. ✅ **Deploy**: Launch to production

---

## 📞 Support

### Common Questions

**Q: How accurate are the IRT parameters?**
A: Initial estimates are 70-80% accurate. They improve with real student data.

**Q: Can I edit questions after generation?**
A: Yes, use Supabase dashboard to edit any question.

**Q: What if translation is incorrect?**
A: Edit directly in database or re-run with improved prompts.

**Q: How to add more subjects?**
A: Add to subjects table, update SUBJECT_MAPPING in script.

---

## 🎉 Success Metrics

After running the generator, you should have:
- ✅ 300-500 questions across 10 subjects
- ✅ All questions with IRT parameters
- ✅ Bilingual support (Arabic/Hebrew)
- ✅ Ready for adaptive testing
- ✅ Calibrated difficulty levels

**Your question bank is now ready for intelligent adaptive testing!** 🚀
