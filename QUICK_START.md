# 🚀 Quick Start - Question Generation

## ✅ What You've Done So Far

1. ✅ Deployed database schema to Supabase
2. ✅ Seeded 10 subjects successfully
3. ✅ Added "type": "module" to package.json
4. ✅ Have psychometric PDFs in `./data` folder
5. ✅ Have DeepSeek API key ready

---

## 📝 Next Steps

### Step 1: Create .env File

Create a `.env` file in the project root with your DeepSeek API key:

```env
DEEPSEEK_API_KEY=your-deepseek-api-key-here
```

### Step 2: Run Question Generator

```bash
npm run generate-questions
```

**Expected Output:**
```
🚀 Starting Question Generation Process...

📚 Found X exam files:
   1. file1.pdf
   2. file2.pdf
   ...

✅ Loaded 10 subjects from database

============================================================
📄 Processing: file1.pdf (1/X)
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
🎉 COMPLETE! Generated XXX total questions
============================================================
```

---

## 🔍 What the Script Does

1. **Scans** `./data` folder for PDF files
2. **Extracts** text from each PDF using DeepSeek API
3. **Identifies** subject (Math, English, Physics, etc.)
4. **Parses** questions with 4 options
5. **Translates** to Arabic and Hebrew
6. **Estimates** IRT parameters
7. **Saves** to Supabase database

---

## ⏱️ Processing Time

- **Per PDF**: 2-5 minutes
- **Per Question**: 5-10 seconds
- **Total**: Depends on number of PDFs

---

## 🐛 Troubleshooting

### If Script Exits Immediately

**Check:**
1. `.env` file exists with DEEPSEEK_API_KEY
2. PDF files are in `./data` folder
3. Supabase connection is working

### If "No PDF files found"

**Solution:**
- Ensure PDFs are directly in `./data` folder
- Check file extensions are `.pdf` (lowercase)

### If DeepSeek API Error

**Solution:**
- Verify API key is correct
- Check API quota/limits
- Ensure API key has correct permissions

---

## 📊 Verify Results

After generation, check Supabase:

```sql
-- Count questions by subject
SELECT 
  s.name_en,
  COUNT(q.id) as question_count
FROM subjects s
LEFT JOIN questions q ON s.id = q.subject_id
GROUP BY s.name_en
ORDER BY question_count DESC;
```

---

## 🎯 Success Criteria

You'll know it worked when:
- ✅ Script completes without errors
- ✅ Questions appear in Supabase `questions` table
- ✅ Each question has Arabic and Hebrew text
- ✅ IRT parameters are populated
- ✅ Questions are linked to correct subjects

---

## 📞 Need Help?

If you encounter issues:
1. Check console output for error messages
2. Verify `.env` file configuration
3. Ensure Supabase connection is working
4. Check DeepSeek API status

---

**Ready to generate questions? Run: `npm run generate-questions`** 🚀
