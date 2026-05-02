-- Admin compliance extension for user-story coverage.
-- Run after database/schema.sql and database/institutions_schema.sql.

CREATE TABLE IF NOT EXISTS principal_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    school_name TEXT NOT NULL,
    school_id UUID,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_principal_registration_requests_status
    ON principal_registration_requests(status);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS data_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_snapshots_entity ON data_snapshots(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS static_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_key TEXT NOT NULL UNIQUE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'icon', 'text', 'document', 'other')),
    title_ar TEXT,
    title_he TEXT,
    url TEXT,
    content_ar TEXT,
    content_he TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_static_assets_type ON static_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_static_assets_active ON static_assets(is_active);

CREATE TABLE IF NOT EXISTS system_health_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_events_created_at ON system_health_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_health_events_severity ON system_health_events(severity);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS class_section TEXT NOT NULL DEFAULT 'alef';

UPDATE students
SET class_section = 'alef'
WHERE class_section IS NULL OR btrim(class_section) = '';

ALTER TABLE students
    DROP CONSTRAINT IF EXISTS students_class_section_check;

ALTER TABLE students
    ADD CONSTRAINT students_class_section_check
    CHECK (class_section IN ('alef', 'bet', 'gimel', 'dalet'));

CREATE INDEX IF NOT EXISTS idx_students_school_grade_section
    ON students(school_id, grade, class_section);

DROP TRIGGER IF EXISTS update_principal_registration_requests_updated_at ON principal_registration_requests;
CREATE TRIGGER update_principal_registration_requests_updated_at BEFORE UPDATE ON principal_registration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_static_assets_updated_at ON static_assets;
CREATE TRIGGER update_static_assets_updated_at BEFORE UPDATE ON static_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
