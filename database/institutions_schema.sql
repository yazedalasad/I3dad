-- ============================================
-- INSTITUTIONS AND PROGRAMS EXTENSION
-- ============================================
-- Run this file after database/schema.sql

-- ============================================
-- 1. INSTITUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_he VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    institution_type VARCHAR(50) NOT NULL CHECK (
        institution_type IN (
            'university',
            'academic_college',
            'engineering_college',
            'education_college',
            'open_university'
        )
    ),
    city_ar VARCHAR(120) NOT NULL,
    city_he VARCHAR(120) NOT NULL,
    city_en VARCHAR(120) NOT NULL,
    region VARCHAR(50) NOT NULL CHECK (
        region IN ('north', 'haifa', 'center', 'tel_aviv', 'jerusalem', 'south', 'multiple')
    ),
    description_ar TEXT,
    description_he TEXT,
    description_en TEXT,
    website_url TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_institutions_type ON institutions(institution_type);
CREATE INDEX idx_institutions_region ON institutions(region);
CREATE INDEX idx_institutions_city_en ON institutions(city_en);
CREATE INDEX idx_institutions_active ON institutions(is_active);

-- ============================================
-- 2. INSTITUTION PROGRAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS institution_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    major_key VARCHAR(80),
    program_name_ar VARCHAR(255) NOT NULL,
    program_name_he VARCHAR(255) NOT NULL,
    program_name_en VARCHAR(255) NOT NULL,
    field_category VARCHAR(80) NOT NULL,
    degree_type VARCHAR(30) NOT NULL DEFAULT 'bachelor' CHECK (
        degree_type IN ('certificate', 'diploma', 'bachelor', 'master', 'doctorate')
    ),
    description_ar TEXT,
    description_he TEXT,
    description_en TEXT,
    admission_notes_ar TEXT,
    admission_notes_he TEXT,
    admission_notes_en TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (institution_id, program_name_en)
);

CREATE INDEX idx_institution_programs_institution ON institution_programs(institution_id);
CREATE INDEX idx_institution_programs_major_key ON institution_programs(major_key);
CREATE INDEX idx_institution_programs_field ON institution_programs(field_category);

-- ============================================
-- 3. MAJOR / INSTITUTION MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS major_institution_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    major_key VARCHAR(80) NOT NULL,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    program_id UUID REFERENCES institution_programs(id) ON DELETE SET NULL,
    match_priority INTEGER NOT NULL DEFAULT 1 CHECK (match_priority BETWEEN 1 AND 5),
    weight DECIMAL(5,2) DEFAULT 1.00 CHECK (weight BETWEEN 0 AND 1.50),
    notes_ar TEXT,
    notes_he TEXT,
    notes_en TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (major_key, institution_id)
);

CREATE INDEX idx_major_institution_matches_major ON major_institution_matches(major_key);
CREATE INDEX idx_major_institution_matches_institution ON major_institution_matches(institution_id);
CREATE INDEX idx_major_institution_matches_priority ON major_institution_matches(match_priority);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_institutions_updated_at ON institutions;
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_institution_programs_updated_at ON institution_programs;
CREATE TRIGGER update_institution_programs_updated_at BEFORE UPDATE ON institution_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_major_institution_matches_updated_at ON major_institution_matches;
CREATE TRIGGER update_major_institution_matches_updated_at BEFORE UPDATE ON major_institution_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE institutions IS 'Higher education institutions used in student recommendations';
COMMENT ON TABLE institution_programs IS 'Programs offered by institutions, stored in Arabic, Hebrew, and English';
COMMENT ON TABLE major_institution_matches IS 'Links frontend major keys to recommended institutions and programs';
