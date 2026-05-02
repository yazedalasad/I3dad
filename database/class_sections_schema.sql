-- Adds class sections for grades such as 10 Alef / 10 Bet / 10 Gimel.
-- Existing students are assigned to Alef by default.

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
