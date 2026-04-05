USE tprs_db;

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

DROP PROCEDURE IF EXISTS GetProjectsByYear;

DELIMITER //
CREATE PROCEDURE GetProjectsByYear(IN p_year VARCHAR(20))
BEGIN
    SELECT * FROM project_details WHERE year = p_year ORDER BY created_at DESC;
END //
DELIMITER ;

-- Update the view to include session
CREATE OR REPLACE VIEW project_details AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.type,
    p.status,
    p.keywords,
    p.year,
    p.semester,
    p.department,
    p.session,
    p.file_path,
    p.submission_date,
    p.approval_date,
    p.created_at,
    CONCAT(s.first_name, ' ', s.last_name) AS student_name,
    s.email AS student_email,
    CONCAT(t.first_name, ' ', t.last_name) AS supervisor_name,
    t.email AS supervisor_email
FROM project p
JOIN student s ON p.student_id = s.id
JOIN teacher t ON p.supervisor_id = t.id;
