# 🚀 Complete Setup Instructions - Adaptive Testing System

## Overview

This guide walks you through the complete setup process from database deployment to question generation and system launch.

---

## 📋 Prerequisites

- ✅ Node.js 16+ installed
- ✅ Supabase account
- ✅ DeepSeek API key
- ✅ Psychometric exam PDFs (2015-2025)

---

## Step 1: Database Setup

### 1.1 Deploy Schema to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `database/schema.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** to execute

**Expected Result:**
```
✅ 8 tables created
✅ Indexes created
✅ Triggers created
✅ Comments added
```

### 1.2 Verify Tables

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Tables:**
- questions
- student_abilities
- student_interests
- student_learning_potential
- student_recommendations
- student_responses
- subjects
- test_sessions

---

## Step 2: Environment Configuration

### 2.1 Create .env File

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# DeepSeek API
DEEPSEEK_API_KEY=your-deepseek-api-key

# Optional
NODE_ENV=development
```

### 2.2 Update Supabase Config

If needed, update `config/supabase.js` with your credentials.

---

## Step 3: Install Dependencies

```bash
# Install all dependencies
npm install

# Install additional dependencies for question generation
npm install axios
```

---

## Step 4: Seed Subjects

### 4.1 Run Seed Script

```bash
npm run seed-subjects
```

**Expected Output:**
```
🌱 Seeding subjects...

📚 Inserting 10 subjects...

✅ Mathematics (MATH) - core
✅ English (ENG) - core
✅ Hebrew/Literacy (HEB) - core
✅ History (HIST) - humanities
✅ Literature (LIT) - humanities
✅ Citizenship (CIV) - humanities
✅ Physics (PHYS) - stem
✅ Chemistry (CHEM) - stem
✅ Biology (BIO) - stem
✅ Computer Science (CS) - stem

🎉 Subjects seeded successfully!
```

### 4.2 Verify in Supabase

```sql
SELECT code, name_en, category FROM subjects ORDER BY category, name_en;
```

---

## Step 5: Prepare Psychometric Exams

### 5.1 Create Exams Folder

```bash
mkdir psychometric_exams
```

### 5.2 Organize PDFs

Add your psychometric exam PDFs to the folder:

```
psychometric_exams/
├── math_2015.pdf
├── math_2016.pdf
├── math_2017.pdf
├── english_2015.pdf
├── english_2016.pdf
├── hebrew_2015.pdf
├── physics_2015.pdf
├── chemistry_2015.pdf
├── biology_2015.pdf
├── history_2015.pdf
├── literature_2015.pdf
├── citizenship_2015.pdf
└── computer_science_2015.pdf
```

**Naming Convention:**
- `subject_year.pdf` or `subject_year_session.pdf`
- Examples: `math_2015_winter.pdf`, `english_2016_summer.pdf`

---

## Step 6: Generate Questions

### 6.1 Run Question Generator

```bash
npm run generate-questions
```

**This will:**
1. ✅ Scan all PDFs in `psychometric_exams` folder
2. ✅ Extract text using DeepSeek API
3. ✅ Identify subject for each exam
4. ✅ Parse questions with 4 options
5. ✅ Translate to Arabic and Hebrew
6. ✅ Estimate IRT parameters
7. ✅ Save to database

**Expected Output:**
```
🚀 Starting Question Generation Process...

📚 Found 13 exam files:
   1. math_2015.pdf
   2. math_2016.pdf
   ...

✅ Loaded 10 subjects from database

============================================================
📄 Processing: math_2015.pdf (1/13)
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

...

============================================================
🎉 COMPLETE! Generated 450 total questions
============================================================
```

### 6.2 Verify Questions

```sql
-- Count questions by subject
SELECT 
  s.name_en,
  COUNT(q.id) as question_count,
  AVG(q.difficulty) as avg_difficulty
FROM subjects s
LEFT JOIN questions q ON s.id = q.subject_id
GROUP BY s.name_en
ORDER BY question_count DESC;
```

---

## Step 7: Test the System

### 7.1 Start Development Server

```bash
npm start
```

### 7.2 Test Adaptive Assessment

1. Login to the app
2. Navigate to Assessment tab
3. Start an adaptive test
4. Answer questions
5. View results with radar chart

---

## Step 8: Enable RLS Policies (Optional)

### 8.1 Uncomment RLS Policies

In `database/schema.sql`, uncomment the RLS policy sections:

```sql
-- Enable RLS on all tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- ... etc
```

### 8.2 Re-run in Supabase

Execute the updated schema in Supabase SQL Editor.

---

## 📊 Verification Checklist

### Database
- [ ] All 8 tables created
- [ ] 10 subjects inserted
- [ ] Questions generated and saved
- [ ] Indexes created
- [ ] Triggers working

### Application
- [ ] App starts without errors
- [ ] Can login/signup
- [ ] Assessment tab visible
- [ ] Can start adaptive test
- [ ] Questions display correctly
- [ ] Results show radar chart
- [ ] Recommendations generated

### Question Bank
- [ ] 300+ questions total
- [ ] All 10 subjects covered
- [ ] Bilingual text (Arabic/Hebrew)
- [ ] IRT parameters present
- [ ] Difficulty distribution balanced

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to Supabase"
**Solution:**
1. Check `.env` file has correct credentials
2. Verify Supabase project is active
3. Check network connection

### Issue: "DeepSeek API Error"
**Solution:**
1. Verify API key in `.env`
2. Check API quota/limits
3. Ensure API key has correct permissions

### Issue: "No questions generated"
**Solution:**
1. Check PDF quality (text must be extractable)
2. Verify PDF contains questions in standard format
3. Try with a different PDF
4. Check DeepSeek API response

### Issue: "Subject not identified"
**Solution:**
1. Ensure subjects are seeded in database
2. Check PDF content is clear
3. Manually specify subject if needed

### Issue: "Translation missing"
**Solution:**
1. DeepSeek will auto-translate
2. If missing, edit in Supabase dashboard
3. Re-run generator with improved prompts

---

## 📈 Performance Optimization

### Caching
- Questions are cached in memory for 5 minutes
- Clear cache: `clearQuestionCache()` in questionService

### Database Indexes
- All foreign keys indexed
- Difficulty and subject_id indexed
- Query performance optimized

### API Rate Limiting
- DeepSeek: ~4 calls per PDF
- Implement delays if hitting rate limits
- Consider batch processing

---

## 🎯 Next Steps

After setup is complete:

### 1. Quality Review
- [ ] Review generated questions
- [ ] Verify translations
- [ ] Check IRT parameters
- [ ] Test adaptive algorithm

### 2. Calibration
- [ ] Collect student responses (100+ per question)
- [ ] Run IRT calibration
- [ ] Update parameters
- [ ] Improve accuracy

### 3. Production Deployment
- [ ] Enable RLS policies
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Deploy to production

### 4. Continuous Improvement
- [ ] Add more questions
- [ ] Refine IRT parameters
- [ ] Enhance translations
- [ ] Optimize performance

---

## 📚 Documentation Reference

- `database/README.md` - Database setup details
- `QUESTION_GENERATION_GUIDE.md` - Question generation guide
- `ADAPTIVE_TEST_TODO.md` - Implementation checklist
- `IMPLEMENTATION_COMPLETE.md` - System overview

---

## 🎉 Success Criteria

Your system is ready when:

✅ Database schema deployed
✅ 10 subjects seeded
✅ 300+ questions generated
✅ All questions have IRT parameters
✅ Bilingual support working
✅ Adaptive tests running
✅ Results displaying correctly
✅ Recommendations generating

**Congratulations! Your adaptive testing system is live! 🚀**

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review documentation files
3. Verify setup steps completed
4. Check console logs for errors

---

## 🔄 Maintenance

### Regular Tasks
- **Weekly**: Review new questions
- **Monthly**: Calibrate IRT parameters
- **Quarterly**: Add new exam PDFs
- **Yearly**: Update subject content

### Backup Strategy
```bash
# Backup database
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Backup questions
# Export from Supabase dashboard
```

---

## 🎓 Learning Resources

### IRT Theory
- Lord, F. M. (1980). Applications of Item Response Theory
- Embretson & Reise (2000). Item Response Theory for Psychologists

### CAT Implementation
- Wainer, H. (2000). Computerized Adaptive Testing: A Primer
- van der Linden & Glas (2010). Elements of Adaptive Testing

### Bayesian Methods
- Corbett & Anderson (1994). Knowledge Tracing
- Baker & Kim (2004). Item Response Theory

---

**Your adaptive testing system is now fully operational! 🎉**
