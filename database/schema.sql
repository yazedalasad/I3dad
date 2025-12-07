-- ============================================
-- ADAPTIVE TESTING SYSTEM - DATABASE SCHEMA
-- ============================================
-- This schema supports IRT-based Computerized Adaptive Testing (CAT)
-- with interest profiling and multi-armed bandit recommendations

-- ============================================
-- 1. SUBJECTS TABLE
-- ============================================
-- Stores the 10 core subjects for Israeli Bagrut
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_he VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    point_level INTEGER NOT NULL CHECK (point_level IN (2, 3, 4, 5)),
    category VARCHAR(50) NOT NULL CHECK (category IN ('core', 'humanities', 'stem')),
    description_en TEXT,
    description_ar TEXT,
    description_he TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_category ON subjects(category);

-- ============================================
-- 2. QUESTIONS TABLE
-- ============================================
-- Question bank with IRT parameters (3PL model)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Question content (bilingual)
    question_text_ar TEXT NOT NULL,
    question_text_he TEXT NOT NULL,
    
    -- Multiple choice options (4 options)
    option_a_ar TEXT NOT NULL,
    option_a_he TEXT NOT NULL,
    option_b_ar TEXT NOT NULL,
    option_b_he TEXT NOT NULL,
    option_c_ar TEXT NOT NULL,
    option_c_he TEXT NOT NULL,
    option_d_ar TEXT NOT NULL,
    option_d_he TEXT NOT NULL,
    
    -- Correct answer (A, B, C, or D)
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    
    -- IRT Parameters (3-Parameter Logistic Model)
    difficulty DECIMAL(5,3) NOT NULL CHECK (difficulty BETWEEN -3.0 AND 3.0),
    discrimination DECIMAL(5,3) NOT NULL CHECK (discrimination > 0),
    guessing DECIMAL(5,3) NOT NULL DEFAULT 0.25 CHECK (guessing BETWEEN 0 AND 1),
    
    -- Metadata
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    cognitive_level VARCHAR(50) CHECK (cognitive_level IN ('knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation')),
    estimated_time_seconds INTEGER DEFAULT 60,
    
    -- Language targeting (for language-specific questions)
    target_language VARCHAR(10) CHECK (target_language IN ('ar', 'he', 'both')),
    
    -- Usage statistics
    times_used INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_active ON questions(is_active);
CREATE INDEX idx_questions_target_lang ON questions(target_language);

-- ============================================
-- 3. TEST SESSIONS TABLE
-- ============================================
-- Tracks individual test sessions for students
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Session type
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('interest_discovery', 'ability_assessment', 'full_assessment')),
    
    -- Subject being tested (NULL for interest discovery)
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    
    -- Session status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    
    -- Language preference for this session
    language VARCHAR(10) NOT NULL CHECK (language IN ('ar', 'he')),
    
    -- Test parameters
    target_questions INTEGER DEFAULT 20,
    questions_answered INTEGER DEFAULT 0,
    
    -- Results (populated after completion)
    final_ability_estimate DECIMAL(5,3),
    standard_error DECIMAL(5,3),
    confidence_interval_lower DECIMAL(5,3),
    confidence_interval_upper DECIMAL(5,3),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_time_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_test_sessions_student ON test_sessions(student_id);
CREATE INDEX idx_test_sessions_subject ON test_sessions(subject_id);
CREATE INDEX idx_test_sessions_status ON test_sessions(status);
CREATE INDEX idx_test_sessions_type ON test_sessions(session_type);

-- ============================================
-- 4. STUDENT RESPONSES TABLE
-- ============================================
-- Individual question responses during test sessions
CREATE TABLE IF NOT EXISTS student_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Response data
    selected_answer CHAR(1) NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL,
    
    -- Timing
    time_taken_seconds INTEGER NOT NULL,
    
    -- Ability estimate at this point in the test
    ability_before DECIMAL(5,3),
    ability_after DECIMAL(5,3),
    
    -- Question order in the test
    question_order INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_student_responses_session ON student_responses(session_id);
CREATE INDEX idx_student_responses_student ON student_responses(student_id);
CREATE INDEX idx_student_responses_question ON student_responses(question_id);

-- ============================================
-- 5. STUDENT ABILITIES TABLE
-- ============================================
-- Tracks student ability estimates per subject (0-100%)
CREATE TABLE IF NOT EXISTS student_abilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Ability metrics (normalized to 0-100%)
    ability_score DECIMAL(5,2) NOT NULL CHECK (ability_score BETWEEN 0 AND 100),
    
    -- Raw IRT theta value (-3 to +3)
    theta_estimate DECIMAL(5,3) NOT NULL CHECK (theta_estimate BETWEEN -3.0 AND 3.0),
    
    -- Confidence metrics
    standard_error DECIMAL(5,3),
    confidence_level DECIMAL(5,2) CHECK (confidence_level BETWEEN 0 AND 100),
    
    -- Assessment history
    total_questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2),
    
    -- Last assessment
    last_assessed_at TIMESTAMP WITH TIME ZONE,
    last_session_id UUID REFERENCES test_sessions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per student per subject
    UNIQUE(student_id, subject_id)
);

-- Indexes
CREATE INDEX idx_student_abilities_student ON student_abilities(student_id);
CREATE INDEX idx_student_abilities_subject ON student_abilities(subject_id);
CREATE INDEX idx_student_abilities_score ON student_abilities(ability_score);

-- ============================================
-- 6. STUDENT INTERESTS TABLE
-- ============================================
-- Tracks student interest levels per subject (0-100%)
CREATE TABLE IF NOT EXISTS student_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Interest metrics (0-100%)
    interest_score DECIMAL(5,2) NOT NULL CHECK (interest_score BETWEEN 0 AND 100),
    
    -- Engagement metrics
    time_spent_seconds INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    voluntary_attempts INTEGER DEFAULT 0,
    
    -- Behavioral indicators
    avg_time_per_question DECIMAL(8,2),
    completion_rate DECIMAL(5,2),
    
    -- Discovery phase data
    discovered_at TIMESTAMP WITH TIME ZONE,
    discovery_session_id UUID REFERENCES test_sessions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per student per subject
    UNIQUE(student_id, subject_id)
);

-- Indexes
CREATE INDEX idx_student_interests_student ON student_interests(student_id);
CREATE INDEX idx_student_interests_subject ON student_interests(subject_id);
CREATE INDEX idx_student_interests_score ON student_interests(interest_score);

-- ============================================
-- 7. STUDENT LEARNING POTENTIAL TABLE
-- ============================================
-- Tracks learning potential per subject (0-100%)
-- Combines ability, interest, and growth trajectory
CREATE TABLE IF NOT EXISTS student_learning_potential (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Potential score (0-100%)
    potential_score DECIMAL(5,2) NOT NULL CHECK (potential_score BETWEEN 0 AND 100),
    
    -- Component scores
    ability_component DECIMAL(5,2),
    interest_component DECIMAL(5,2),
    growth_component DECIMAL(5,2),
    
    -- Growth metrics
    ability_growth_rate DECIMAL(5,2),
    recent_improvement BOOLEAN DEFAULT false,
    
    -- Recommendation weight (for multi-armed bandit)
    recommendation_weight DECIMAL(5,3) DEFAULT 1.0,
    exploration_bonus DECIMAL(5,3) DEFAULT 0.0,
    
    -- Confidence in potential estimate
    confidence_level DECIMAL(5,2) CHECK (confidence_level BETWEEN 0 AND 100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per student per subject
    UNIQUE(student_id, subject_id)
);

-- Indexes
CREATE INDEX idx_student_potential_student ON student_learning_potential(student_id);
CREATE INDEX idx_student_potential_subject ON student_learning_potential(subject_id);
CREATE INDEX idx_student_potential_score ON student_learning_potential(potential_score);

-- ============================================
-- 8. STUDENT RECOMMENDATIONS TABLE
-- ============================================
-- Stores personalized learning path recommendations
CREATE TABLE IF NOT EXISTS student_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Recommendation rank (1 = top recommendation)
    rank INTEGER NOT NULL,
    
    -- Recommendation score (from multi-armed bandit)
    recommendation_score DECIMAL(5,2) NOT NULL,
    
    -- Reasoning
    reason_en TEXT,
    reason_ar TEXT,
    reason_he TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'declined', 'expired')),
    
    -- User interaction
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Validity
    valid_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recommendations_student ON student_recommendations(student_id);
CREATE INDEX idx_recommendations_subject ON student_recommendations(subject_id);
CREATE INDEX idx_recommendations_rank ON student_recommendations(rank);
CREATE INDEX idx_recommendations_status ON student_recommendations(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON test_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_abilities_updated_at BEFORE UPDATE ON student_abilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_interests_updated_at BEFORE UPDATE ON student_interests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_potential_updated_at BEFORE UPDATE ON student_learning_potential
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON student_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Note: RLS policies are commented out for initial setup
-- They can be enabled after verifying the schema works correctly

-- Enable RLS on all tables (currently disabled for testing)
-- ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_responses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_abilities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_interests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_learning_potential ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_recommendations ENABLE ROW LEVEL SECURITY;

-- Subjects and Questions: Public read access
-- CREATE POLICY "Public read access for subjects" ON subjects
--     FOR SELECT USING (true);

-- CREATE POLICY "Public read access for active questions" ON questions
--     FOR SELECT USING (is_active = true);

-- Student data: Users can only access their own data
-- Note: These policies will be implemented after fixing UUID type casting
-- CREATE POLICY "Users can view own test sessions" ON test_sessions
--     FOR SELECT USING (auth.uid()::text = (SELECT user_id::text FROM students WHERE id = student_id));

-- CREATE POLICY "Users can insert own test sessions" ON test_sessions
--     FOR INSERT WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM students WHERE id = student_id));

-- CREATE POLICY "Users can update own test sessions" ON test_sessions
--     FOR UPDATE USING (auth.uid()::text = (SELECT user_id::text FROM students WHERE id = student_id));

-- ============================================
-- 9. PERSONALITY DIMENSIONS TABLE
-- ============================================
-- Defines the Big Five personality dimensions
CREATE TABLE IF NOT EXISTS personality_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_he VARCHAR(100) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    description_he TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_personality_dimensions_code ON personality_dimensions(code);

-- Insert Big Five dimensions
INSERT INTO personality_dimensions (code, name_en, name_ar, name_he, description_en, description_ar, description_he, icon, color, display_order) VALUES
('openness', 'Openness to Experience', 'الانفتاح على التجربة', 'פתיחות לחוויה', 'Imagination, curiosity, and willingness to try new things', 'الخيال والفضول والاستعداد لتجربة أشياء جديدة', 'דמיון, סקרנות ונכונות לנסות דברים חדשים', 'lightbulb-o', '#9b59b6', 1),
('conscientiousness', 'Conscientiousness', 'الضمير الحي', 'מצפוניות', 'Organization, responsibility, and self-discipline', 'التنظيم والمسؤولية والانضباط الذاتي', 'ארגון, אחריות ומשמעת עצמית', 'check-square-o', '#3498db', 2),
('extraversion', 'Extraversion', 'الانبساط', 'אקסטרוברטיות', 'Sociability, assertiveness, and energy level', 'الاجتماعية والحزم ومستوى الطاقة', 'חברותיות, אסרטיביות ורמת אנרגיה', 'users', '#e74c3c', 3),
('agreeableness', 'Agreeableness', 'الوداعة', 'נעימות', 'Cooperation, empathy, and kindness', 'التعاون والتعاطف واللطف', 'שיתוף פעולה, אמפתיה ואדיבות', 'heart', '#27ae60', 4),
('emotional_stability', 'Emotional Stability', 'الاستقرار العاطفي', 'יציבות רגשית', 'Emotional resilience and stress management', 'المرونة العاطفية وإدارة الإجهاد', 'חוסן רגשי וניהול מתח', 'shield', '#f39c12', 5);

-- ============================================
-- 10. PERSONALITY QUESTIONS TABLE
-- ============================================
-- Personality assessment questions with multiple response types
CREATE TABLE IF NOT EXISTS personality_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id UUID NOT NULL REFERENCES personality_dimensions(id) ON DELETE CASCADE,
    
    -- Question content (bilingual)
    question_text_ar TEXT NOT NULL,
    question_text_he TEXT NOT NULL,
    
    -- Question type: 'scale_10', 'multiple_choice', 'open_ended'
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('scale_10', 'multiple_choice', 'open_ended')),
    
    -- For multiple choice questions
    options_ar TEXT[], -- Array of options in Arabic
    options_he TEXT[], -- Array of options in Hebrew
    
    -- Scoring
    is_reverse_scored BOOLEAN DEFAULT false, -- For negatively worded questions
    weight DECIMAL(3,2) DEFAULT 1.0, -- Question weight in dimension calculation
    
    -- For scale questions: labels for endpoints
    scale_min_label_ar VARCHAR(100),
    scale_min_label_he VARCHAR(100),
    scale_max_label_ar VARCHAR(100),
    scale_max_label_he VARCHAR(100),
    
    -- Metadata
    estimated_time_seconds INTEGER DEFAULT 30,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    
    -- AI generation metadata
    generated_by_ai BOOLEAN DEFAULT false,
    ai_model VARCHAR(50),
    generation_prompt TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_personality_questions_dimension ON personality_questions(dimension_id);
CREATE INDEX idx_personality_questions_type ON personality_questions(question_type);
CREATE INDEX idx_personality_questions_active ON personality_questions(is_active);

-- ============================================
-- 11. PERSONALITY TEST SESSIONS TABLE
-- ============================================
-- Tracks individual personality test sessions
CREATE TABLE IF NOT EXISTS personality_test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Session status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    
    -- Language preference
    language VARCHAR(10) NOT NULL CHECK (language IN ('ar', 'he')),
    
    -- Test parameters
    total_questions INTEGER DEFAULT 50,
    questions_answered INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_time_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_personality_sessions_student ON personality_test_sessions(student_id);
CREATE INDEX idx_personality_sessions_status ON personality_test_sessions(status);

-- ============================================
-- 12. PERSONALITY RESPONSES TABLE
-- ============================================
-- Individual personality question responses
CREATE TABLE IF NOT EXISTS personality_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES personality_test_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES personality_questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Response data (varies by question type)
    response_type VARCHAR(50) NOT NULL CHECK (response_type IN ('scale_10', 'multiple_choice', 'open_ended')),
    
    -- For scale questions (1-10)
    scale_value INTEGER CHECK (scale_value BETWEEN 1 AND 10),
    
    -- For multiple choice
    selected_option_index INTEGER,
    selected_option_text_ar TEXT,
    selected_option_text_he TEXT,
    
    -- For open-ended questions
    text_response TEXT,
    
    -- Timing
    time_taken_seconds INTEGER NOT NULL,
    
    -- Question order
    question_order INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_personality_responses_session ON personality_responses(session_id);
CREATE INDEX idx_personality_responses_student ON personality_responses(student_id);
CREATE INDEX idx_personality_responses_question ON personality_responses(question_id);

-- ============================================
-- 13. STUDENT PERSONALITY PROFILES TABLE
-- ============================================
-- Stores calculated personality scores per dimension
CREATE TABLE IF NOT EXISTS student_personality_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    dimension_id UUID NOT NULL REFERENCES personality_dimensions(id) ON DELETE CASCADE,
    
    -- Dimension score (0-100%)
    dimension_score DECIMAL(5,2) NOT NULL CHECK (dimension_score BETWEEN 0 AND 100),
    
    -- Raw score before normalization
    raw_score DECIMAL(8,2),
    
    -- Percentile rank compared to other students
    percentile_rank DECIMAL(5,2),
    
    -- Confidence in score
    confidence_level DECIMAL(5,2) CHECK (confidence_level BETWEEN 0 AND 100),
    
    -- Assessment history
    total_questions_answered INTEGER DEFAULT 0,
    
    -- Last assessment
    last_assessed_at TIMESTAMP WITH TIME ZONE,
    last_session_id UUID REFERENCES personality_test_sessions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per student per dimension
    UNIQUE(student_id, dimension_id)
);

-- Indexes
CREATE INDEX idx_personality_profiles_student ON student_personality_profiles(student_id);
CREATE INDEX idx_personality_profiles_dimension ON student_personality_profiles(dimension_id);
CREATE INDEX idx_personality_profiles_score ON student_personality_profiles(dimension_score);

-- ============================================
-- 14. PERSONALITY INSIGHTS TABLE
-- ============================================
-- Stores AI-generated insights and recommendations based on personality
CREATE TABLE IF NOT EXISTS personality_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES personality_test_sessions(id) ON DELETE CASCADE,
    
    -- Overall personality type/category
    personality_type VARCHAR(100),
    personality_type_description_ar TEXT,
    personality_type_description_he TEXT,
    
    -- Strengths
    strengths_ar TEXT[],
    strengths_he TEXT[],
    
    -- Development areas
    development_areas_ar TEXT[],
    development_areas_he TEXT[],
    
    -- Career recommendations
    recommended_careers_ar TEXT[],
    recommended_careers_he TEXT[],
    
    -- Study style recommendations
    study_style_ar TEXT,
    study_style_he TEXT,
    
    -- Communication style
    communication_style_ar TEXT,
    communication_style_he TEXT,
    
    -- AI generation metadata
    generated_by_ai BOOLEAN DEFAULT false,
    ai_model VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One insight record per session
    UNIQUE(session_id)
);

-- Indexes
CREATE INDEX idx_personality_insights_student ON personality_insights(student_id);
CREATE INDEX idx_personality_insights_session ON personality_insights(session_id);

-- ============================================
-- TRIGGERS FOR PERSONALITY TABLES
-- ============================================

CREATE TRIGGER update_personality_dimensions_updated_at BEFORE UPDATE ON personality_dimensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_questions_updated_at BEFORE UPDATE ON personality_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_sessions_updated_at BEFORE UPDATE ON personality_test_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_profiles_updated_at BEFORE UPDATE ON student_personality_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_insights_updated_at BEFORE UPDATE ON personality_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE subjects IS 'Core subjects for Israeli Bagrut system';
COMMENT ON TABLE questions IS 'Question bank with IRT parameters (3PL model)';
COMMENT ON TABLE test_sessions IS 'Individual test sessions tracking';
COMMENT ON TABLE student_responses IS 'Individual question responses';
COMMENT ON TABLE student_abilities IS 'Student ability estimates per subject (0-100%)';
COMMENT ON TABLE student_interests IS 'Student interest levels per subject (0-100%)';
COMMENT ON TABLE student_learning_potential IS 'Learning potential combining ability, interest, and growth';
COMMENT ON TABLE student_recommendations IS 'Personalized learning path recommendations';
COMMENT ON TABLE personality_dimensions IS 'Big Five personality dimensions';
COMMENT ON TABLE personality_questions IS 'Personality assessment questions with multiple response types';
COMMENT ON TABLE personality_test_sessions IS 'Personality test sessions tracking';
COMMENT ON TABLE personality_responses IS 'Individual personality question responses';
COMMENT ON TABLE student_personality_profiles IS 'Student personality scores per dimension (0-100%)';
COMMENT ON TABLE personality_insights IS 'AI-generated personality insights and recommendations';

COMMENT ON COLUMN questions.difficulty IS 'IRT difficulty parameter (b): -3 (easy) to +3 (hard)';
COMMENT ON COLUMN questions.discrimination IS 'IRT discrimination parameter (a): how well question differentiates ability levels';
COMMENT ON COLUMN questions.guessing IS 'IRT guessing parameter (c): probability of correct answer by guessing';
COMMENT ON COLUMN student_abilities.theta_estimate IS 'Raw IRT ability estimate: -3 (low) to +3 (high)';
COMMENT ON COLUMN student_abilities.ability_score IS 'Normalized ability score: 0-100%';
COMMENT ON COLUMN personality_questions.question_type IS 'Question type: scale_10 (1-10 rating), multiple_choice, or open_ended';
COMMENT ON COLUMN personality_responses.scale_value IS 'For scale_10 questions: rating from 1 to 10';
