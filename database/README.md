# Adaptive Testing System - Database Setup

## Overview
This directory contains the database schema for the IRT-based Computerized Adaptive Testing (CAT) system.

## Files
- `schema.sql` - Complete database schema with 8 tables
- `seedData.js` - Sample data seeding script (to be implemented)

## Database Tables

### Core Tables
1. **subjects** - 10 Israeli Bagrut subjects
2. **questions** - Question bank with IRT parameters
3. **test_sessions** - Student test attempts tracking
4. **student_responses** - Individual question answers

### Analytics Tables
5. **student_abilities** - Ability scores per subject (0-100%)
6. **student_interests** - Interest levels per subject (0-100%)
7. **student_learning_potential** - Learning potential scores
8. **student_recommendations** - Personalized recommendations

## Setup Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `schema.sql`
4. Click **Run** to execute the schema

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option 3: Direct SQL Execution
```bash
psql -h your-db-host -U postgres -d postgres -f database/schema.sql
```

## IRT Parameters Explanation

### 3-Parameter Logistic (3PL) Model
Each question has three IRT parameters:

1. **Difficulty (b)**: Range -3.0 to +3.0
   - -3.0 to -1.0: Very easy
   - -1.0 to 0.0: Easy
   - 0.0 to 1.0: Medium
   - 1.0 to 2.0: Hard
   - 2.0 to 3.0: Very hard

2. **Discrimination (a)**: Range 0.5 to 2.5
   - Higher values = better at differentiating ability levels
   - Typical range: 1.0 to 2.0

3. **Guessing (c)**: Range 0.0 to 1.0
   - Default: 0.25 (for 4-option multiple choice)
   - Probability of correct answer by random guessing

## Security Notes

- **RLS Policies**: Currently commented out for initial setup
- Enable RLS after verifying the schema works correctly
- Policies ensure students can only access their own data

## Next Steps

1. ✅ Run the schema.sql in Supabase
2. ⏳ Implement seed data script
3. ⏳ Test database connections
4. ⏳ Enable RLS policies
5. ⏳ Implement IRT algorithms

## Troubleshooting

### Common Issues

**Issue**: UUID type mismatch errors
**Solution**: RLS policies are commented out - they'll be fixed in a future update

**Issue**: Foreign key constraint errors
**Solution**: Ensure the `students` table exists before running this schema

**Issue**: Permission denied
**Solution**: Ensure you have proper database permissions in Supabase

## Support

For questions or issues, refer to:
- Supabase Documentation: https://supabase.com/docs
- IRT Theory: https://en.wikipedia.org/wiki/Item_response_theory
