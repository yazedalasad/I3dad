-- ============================================
-- PERSONALITY DIMENSIONS TABLE
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

-- Trigger
CREATE TRIGGER update_personality_dimensions_updated_at BEFORE UPDATE ON personality_dimensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE personality_dimensions IS 'Big Five personality dimensions';
