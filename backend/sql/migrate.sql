-- =====================================================
-- TPRS - Migration Script
-- Run this ONLY if you already have an existing database
-- and need to apply the latest schema changes.
-- If setting up from scratch, use create_database.sql instead.
-- =====================================================

USE tprs_db;

-- =====================================================
-- 2. Add `session` column to `student` table
-- =====================================================
ALTER TABLE student ADD COLUMN session VARCHAR(50) AFTER semester;

-- =====================================================
-- 3. Add zip/session columns to `project` table
-- =====================================================
ALTER TABLE project ADD COLUMN zip_file_path VARCHAR(500) AFTER file_data;
ALTER TABLE project ADD COLUMN zip_file_name VARCHAR(500) AFTER zip_file_path;
ALTER TABLE project ADD COLUMN zip_file_size BIGINT AFTER zip_file_name;
ALTER TABLE project ADD COLUMN session VARCHAR(50) AFTER department;

-- =====================================================
-- 4. Add `is_authorized` column to `teacher` table
--    New teachers default to FALSE; authorize existing ones.
-- =====================================================
ALTER TABLE teacher ADD COLUMN is_authorized BOOLEAN DEFAULT FALSE AFTER phone;
UPDATE teacher SET is_authorized = TRUE;

-- =====================================================
-- 5. Create `supervisor_student` table
-- =====================================================
CREATE TABLE IF NOT EXISTS supervisor_student (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supervisor_id INT NOT NULL,
    student_id INT NOT NULL,
    year VARCHAR(20) DEFAULT NULL,
    semester VARCHAR(20) DEFAULT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supervisor_id) REFERENCES teacher(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (supervisor_id, student_id, year, semester),
    INDEX idx_supervisor (supervisor_id),
    INDEX idx_student (student_id)
);

-- =====================================================
-- 6. Create `notification` table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    recipient_type ENUM('student', 'teacher') NOT NULL,
    sender_id INT,
    sender_type ENUM('student', 'teacher'),
    type ENUM('project_submitted', 'project_approved', 'project_rejected', 'assignment', 'general') NOT NULL DEFAULT 'general',
    title VARCHAR(500) NOT NULL,
    message TEXT,
    project_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE SET NULL,
    INDEX idx_recipient (recipient_id, recipient_type),
    INDEX idx_read_status (is_read),
    INDEX idx_created (created_at)
);

-- =====================================================
-- 7. Create `project_view` table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_view (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    viewer_id INT NOT NULL,
    viewer_type ENUM('student', 'teacher') NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    UNIQUE KEY unique_view (project_id, viewer_id, viewer_type),
    INDEX idx_project_view_project (project_id)
);

-- =====================================================
-- 8. Update the SubmitProject stored procedure
-- =====================================================
DROP PROCEDURE IF EXISTS SubmitProject;

DELIMITER //
CREATE PROCEDURE SubmitProject(
    IN p_title VARCHAR(500),
    IN p_description TEXT,
    IN p_type VARCHAR(20),
    IN p_student_id INT,
    IN p_supervisor_id INT,
    IN p_keywords VARCHAR(500),
    IN p_year VARCHAR(20),
    IN p_semester VARCHAR(20),
    IN p_department VARCHAR(100),
    IN p_session VARCHAR(50)
)
BEGIN
    INSERT INTO project (title, description, type, student_id, supervisor_id, status, keywords, year, semester, department, session, submission_date)
    VALUES (p_title, p_description, p_type, p_student_id, p_supervisor_id, 'pending', p_keywords, p_year, p_semester, p_department, p_session, CURRENT_TIMESTAMP);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- =====================================================
-- 9. Update the project_details view
-- =====================================================
CREATE OR REPLACE VIEW project_details AS
SELECT 
    p.id, p.title, p.description, p.type, p.status, p.keywords,
    p.year, p.semester, p.department, p.session,
    p.file_path, p.zip_file_path, p.zip_file_name, p.github_link,
    p.submission_date, p.approval_date, p.created_at,
    CONCAT(s.first_name, ' ', s.last_name) AS student_name,
    s.email AS student_email,
    CONCAT(t.first_name, ' ', t.last_name) AS supervisor_name,
    t.email AS supervisor_email
FROM project p
JOIN student s ON p.student_id = s.id
JOIN teacher t ON p.supervisor_id = t.id;

SELECT '✓ Migration completed successfully!' AS Status;
