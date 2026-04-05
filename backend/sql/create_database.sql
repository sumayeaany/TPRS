-- =====================================================
-- TPRS - Thesis and Project Repository System
-- Database Creation Script for MySQL
-- =====================================================

-- Create the database
CREATE DATABASE IF NOT EXISTS tprs_db;
USE tprs_db;

-- =====================================================
-- STUDENT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS student (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(20),
    session VARCHAR(50),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_student_email (email),
    INDEX idx_student_department (department)
);

-- =====================================================
-- TEACHER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    specialization VARCHAR(255),
    phone VARCHAR(20),
    is_authorized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_teacher_email (email),
    INDEX idx_teacher_department (department)
);

-- =====================================================
-- PROJECT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS project (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type ENUM('thesis', 'project', 'research') NOT NULL DEFAULT 'project',
    student_id INT NOT NULL,
    supervisor_id INT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected') DEFAULT 'pending',
    file_path VARCHAR(500),
    file_name VARCHAR(500),
    file_data LONGBLOB,
    zip_file_path VARCHAR(500),
    zip_file_name VARCHAR(500),
    zip_file_size BIGINT,
    github_link VARCHAR(500),
    keywords VARCHAR(500),
    year VARCHAR(20),
    semester VARCHAR(20),
    department VARCHAR(100),
    session VARCHAR(50),
    submission_date TIMESTAMP NULL,
    approval_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES teacher(id) ON DELETE CASCADE,
    
    INDEX idx_project_student (student_id),
    INDEX idx_project_supervisor (supervisor_id),
    INDEX idx_project_status (status),
    INDEX idx_project_department (department),
    INDEX idx_project_year (year),
    FULLTEXT INDEX idx_project_search (title, description, keywords)
);

-- =====================================================
-- SUPERVISOR-STUDENT ASSIGNMENT TABLE
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
-- NOTIFICATION TABLE
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
-- PROJECT VIEW TRACKING TABLE
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
-- INSERT SAMPLE DATA
-- =====================================================


-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- View: Project with Student and Supervisor names
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
    p.zip_file_path,
    p.zip_file_name,
    p.github_link,
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

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- =====================================================
-- STUDENT PROCEDURES
-- =====================================================

-- Procedure: Register new student
DELIMITER //
CREATE PROCEDURE RegisterStudent(
    IN p_student_id VARCHAR(50),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_department VARCHAR(100),
    IN p_semester VARCHAR(20),
    IN p_phone VARCHAR(20)
)
BEGIN
    INSERT INTO student (student_id, first_name, last_name, email, password, department, semester, phone)
    VALUES (p_student_id, p_first_name, p_last_name, p_email, p_password, p_department, p_semester, p_phone);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Procedure: Authenticate student login
DELIMITER //
CREATE PROCEDURE AuthenticateStudent(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255)
)
BEGIN
    SELECT * FROM student WHERE email = p_email AND password = p_password;
END //
DELIMITER ;

-- Procedure: Get student by ID
DELIMITER //
CREATE PROCEDURE GetStudentById(IN p_id INT)
BEGIN
    SELECT * FROM student WHERE id = p_id;
END //
DELIMITER ;

-- Procedure: Get student by email
DELIMITER //
CREATE PROCEDURE GetStudentByEmail(IN p_email VARCHAR(255))
BEGIN
    SELECT * FROM student WHERE email = p_email;
END //
DELIMITER ;

-- Procedure: Get all students
DELIMITER //
CREATE PROCEDURE GetAllStudents()
BEGIN
    SELECT * FROM student ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get students by department
DELIMITER //
CREATE PROCEDURE GetStudentsByDepartment(IN p_department VARCHAR(100))
BEGIN
    SELECT * FROM student WHERE department = p_department ORDER BY last_name;
END //
DELIMITER ;

-- Procedure: Update student profile
DELIMITER //
CREATE PROCEDURE UpdateStudent(
    IN p_id INT,
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_department VARCHAR(100),
    IN p_semester VARCHAR(20),
    IN p_phone VARCHAR(20)
)
BEGIN
    UPDATE student 
    SET first_name = p_first_name, last_name = p_last_name, email = p_email,
        department = p_department, semester = p_semester, phone = p_phone,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Update student password
DELIMITER //
CREATE PROCEDURE UpdateStudentPassword(
    IN p_id INT,
    IN p_old_password VARCHAR(255),
    IN p_new_password VARCHAR(255)
)
BEGIN
    UPDATE student SET password = p_new_password, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id AND password = p_old_password;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Delete student
DELIMITER //
CREATE PROCEDURE DeleteStudent(IN p_id INT)
BEGIN
    DELETE FROM student WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- =====================================================
-- TEACHER PROCEDURES
-- =====================================================

-- Procedure: Register new teacher
DELIMITER //
CREATE PROCEDURE RegisterTeacher(
    IN p_teacher_id VARCHAR(50),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_department VARCHAR(100),
    IN p_designation VARCHAR(100),
    IN p_specialization VARCHAR(255),
    IN p_phone VARCHAR(20)
)
BEGIN
    INSERT INTO teacher (teacher_id, first_name, last_name, email, password, department, designation, specialization, phone)
    VALUES (p_teacher_id, p_first_name, p_last_name, p_email, p_password, p_department, p_designation, p_specialization, p_phone);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Procedure: Authenticate teacher login
DELIMITER //
CREATE PROCEDURE AuthenticateTeacher(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255)
)
BEGIN
    SELECT * FROM teacher WHERE email = p_email AND password = p_password;
END //
DELIMITER ;

-- Procedure: Get teacher by ID
DELIMITER //
CREATE PROCEDURE GetTeacherById(IN p_id INT)
BEGIN
    SELECT * FROM teacher WHERE id = p_id;
END //
DELIMITER ;

-- Procedure: Get teacher by email
DELIMITER //
CREATE PROCEDURE GetTeacherByEmail(IN p_email VARCHAR(255))
BEGIN
    SELECT * FROM teacher WHERE email = p_email;
END //
DELIMITER ;

-- Procedure: Get all teachers
DELIMITER //
CREATE PROCEDURE GetAllTeachers()
BEGIN
    SELECT * FROM teacher ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get teachers by department
DELIMITER //
CREATE PROCEDURE GetTeachersByDepartment(IN p_department VARCHAR(100))
BEGIN
    SELECT * FROM teacher WHERE department = p_department ORDER BY last_name;
END //
DELIMITER ;

-- Procedure: Update teacher profile
DELIMITER //
CREATE PROCEDURE UpdateTeacher(
    IN p_id INT,
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_department VARCHAR(100),
    IN p_designation VARCHAR(100),
    IN p_specialization VARCHAR(255),
    IN p_phone VARCHAR(20)
)
BEGIN
    UPDATE teacher 
    SET first_name = p_first_name, last_name = p_last_name, email = p_email,
        department = p_department, designation = p_designation, 
        specialization = p_specialization, phone = p_phone,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Delete teacher
DELIMITER //
CREATE PROCEDURE DeleteTeacher(IN p_id INT)
BEGIN
    DELETE FROM teacher WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- =====================================================
-- PROJECT PROCEDURES
-- =====================================================

-- Procedure: Submit new project
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

-- Procedure: Get project by ID
DELIMITER //
CREATE PROCEDURE GetProjectById(IN p_id INT)
BEGIN
    SELECT * FROM project_details WHERE id = p_id;
END //
DELIMITER ;

-- Procedure: Get all projects
DELIMITER //
CREATE PROCEDURE GetAllProjects()
BEGIN
    SELECT * FROM project_details ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get projects by student
DELIMITER //
CREATE PROCEDURE GetProjectsByStudent(IN p_student_id INT)
BEGIN
    SELECT * FROM project_details WHERE id IN (SELECT id FROM project WHERE student_id = p_student_id) ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get projects by supervisor
DELIMITER //
CREATE PROCEDURE GetProjectsBySupervisor(IN p_supervisor_id INT)
BEGIN
    SELECT * FROM project_details WHERE id IN (SELECT id FROM project WHERE supervisor_id = p_supervisor_id) ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get projects by department
DELIMITER //
CREATE PROCEDURE GetProjectsByDepartment(IN p_department VARCHAR(100))
BEGIN
    SELECT * FROM project_details WHERE department = p_department ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get projects by status with student and supervisor info
DELIMITER //
CREATE PROCEDURE GetProjectsByStatus(IN p_status VARCHAR(20))
BEGIN
    SELECT * FROM project_details WHERE status = p_status ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get projects by year
DELIMITER //
CREATE PROCEDURE GetProjectsByYear(IN p_year VARCHAR(20))
BEGIN
    SELECT * FROM project_details WHERE year = p_year ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Search projects
DELIMITER //
CREATE PROCEDURE SearchProjects(IN search_term VARCHAR(255))
BEGIN
    SELECT * FROM project_details 
    WHERE MATCH(title, description, keywords) AGAINST(search_term IN NATURAL LANGUAGE MODE)
    OR title LIKE CONCAT('%', search_term, '%')
    OR keywords LIKE CONCAT('%', search_term, '%')
    ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Update project
DELIMITER //
CREATE PROCEDURE UpdateProject(
    IN p_id INT,
    IN p_title VARCHAR(500),
    IN p_description TEXT,
    IN p_type VARCHAR(20),
    IN p_keywords VARCHAR(500)
)
BEGIN
    UPDATE project 
    SET title = p_title, description = p_description, type = p_type, 
        keywords = p_keywords, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Update project status
DELIMITER //
CREATE PROCEDURE UpdateProjectStatus(
    IN p_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE project SET status = p_status, updated_at = CURRENT_TIMESTAMP WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Approve project
DELIMITER //
CREATE PROCEDURE ApproveProject(IN p_id INT)
BEGIN
    UPDATE project 
    SET status = 'approved', approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Reject project
DELIMITER //
CREATE PROCEDURE RejectProject(IN p_id INT)
BEGIN
    UPDATE project SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Upload project file
DELIMITER //
CREATE PROCEDURE UploadProjectFile(
    IN p_id INT,
    IN p_file_path VARCHAR(500)
)
BEGIN
    UPDATE project SET file_path = p_file_path, updated_at = CURRENT_TIMESTAMP WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Delete project
DELIMITER //
CREATE PROCEDURE DeleteProject(IN p_id INT)
BEGIN
    DELETE FROM project WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- =====================================================
-- STATISTICS & DASHBOARD PROCEDURES
-- =====================================================

-- Procedure: Get dashboard statistics
DELIMITER //
CREATE PROCEDURE GetDashboardStats()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM student) AS total_students,
        (SELECT COUNT(*) FROM teacher) AS total_teachers,
        (SELECT COUNT(*) FROM project) AS total_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'pending') AS pending_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'approved') AS approved_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'in_progress') AS in_progress_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'completed') AS completed_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'rejected') AS rejected_projects,
        (SELECT COUNT(*) FROM project WHERE type = 'thesis' AND status = 'approved') AS total_thesis,
        (SELECT COUNT(*) FROM project WHERE type = 'project' AND status = 'approved') AS total_project,
        (SELECT COUNT(DISTINCT student_id) FROM project WHERE status = 'approved') AS total_authors;
END //
DELIMITER ;

-- Procedure: Get projects count by department
DELIMITER //
CREATE PROCEDURE GetProjectsCountByDepartment()
BEGIN
    SELECT department, COUNT(*) AS project_count 
    FROM project 
    GROUP BY department 
    ORDER BY project_count DESC;
END //
DELIMITER ;

-- Procedure: Get projects count by year
DELIMITER //
CREATE PROCEDURE GetProjectsCountByYear()
BEGIN
    SELECT year, COUNT(*) AS project_count 
    FROM project 
    GROUP BY year 
    ORDER BY year DESC;
END //
DELIMITER ;

-- Procedure: Get recent projects
DELIMITER //
CREATE PROCEDURE GetRecentProjects(IN p_limit INT)
BEGIN
    SELECT * FROM project_details ORDER BY created_at DESC LIMIT p_limit;
END //
DELIMITER ;

-- =====================================================
-- SUPERVISOR-STUDENT ASSIGNMENT PROCEDURES
-- =====================================================

-- Procedure: Assign student to supervisor
DELIMITER //
CREATE PROCEDURE AssignStudentToSupervisor(
    IN p_supervisor_id INT,
    IN p_student_id INT
)
BEGIN
    INSERT IGNORE INTO supervisor_student (supervisor_id, student_id)
    VALUES (p_supervisor_id, p_student_id);
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Remove student from supervisor
DELIMITER //
CREATE PROCEDURE RemoveStudentFromSupervisor(
    IN p_supervisor_id INT,
    IN p_student_id INT
)
BEGIN
    DELETE FROM supervisor_student WHERE supervisor_id = p_supervisor_id AND student_id = p_student_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Get students assigned to a supervisor
DELIMITER //
CREATE PROCEDURE GetAssignedStudents(IN p_supervisor_id INT)
BEGIN
    SELECT s.* FROM student s
    JOIN supervisor_student ss ON s.id = ss.student_id
    WHERE ss.supervisor_id = p_supervisor_id
    ORDER BY s.last_name, s.first_name;
END //
DELIMITER ;

-- Procedure: Get supervisor for a student
DELIMITER //
CREATE PROCEDURE GetSupervisorForStudent(IN p_student_id INT)
BEGIN
    SELECT t.* FROM teacher t
    JOIN supervisor_student ss ON t.id = ss.supervisor_id
    WHERE ss.student_id = p_student_id;
END //
DELIMITER ;

-- =====================================================
-- NOTIFICATION PROCEDURES
-- =====================================================

-- Procedure: Create notification
DELIMITER //
CREATE PROCEDURE CreateNotification(
    IN p_recipient_id INT,
    IN p_recipient_type VARCHAR(10),
    IN p_sender_id INT,
    IN p_sender_type VARCHAR(10),
    IN p_type VARCHAR(30),
    IN p_title VARCHAR(500),
    IN p_message TEXT,
    IN p_project_id INT
)
BEGIN
    INSERT INTO notification (recipient_id, recipient_type, sender_id, sender_type, type, title, message, project_id)
    VALUES (p_recipient_id, p_recipient_type, p_sender_id, p_sender_type, p_type, p_title, p_message, p_project_id);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Procedure: Get notifications for a user
DELIMITER //
CREATE PROCEDURE GetNotifications(
    IN p_recipient_id INT,
    IN p_recipient_type VARCHAR(10)
)
BEGIN
    SELECT * FROM notification
    WHERE recipient_id = p_recipient_id AND recipient_type = p_recipient_type
    ORDER BY created_at DESC;
END //
DELIMITER ;

-- Procedure: Get unread notification count
DELIMITER //
CREATE PROCEDURE GetUnreadNotificationCount(
    IN p_recipient_id INT,
    IN p_recipient_type VARCHAR(10)
)
BEGIN
    SELECT COUNT(*) AS unread_count FROM notification
    WHERE recipient_id = p_recipient_id AND recipient_type = p_recipient_type AND is_read = FALSE;
END //
DELIMITER ;

-- Procedure: Mark notification as read
DELIMITER //
CREATE PROCEDURE MarkNotificationRead(IN p_id INT)
BEGIN
    UPDATE notification SET is_read = TRUE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

-- Procedure: Mark all notifications as read
DELIMITER //
CREATE PROCEDURE MarkAllNotificationsRead(
    IN p_recipient_id INT,
    IN p_recipient_type VARCHAR(10)
)
BEGIN
    UPDATE notification SET is_read = TRUE
    WHERE recipient_id = p_recipient_id AND recipient_type = p_recipient_type AND is_read = FALSE;
    SELECT ROW_COUNT() AS affected_rows;
END //
DELIMITER ;

SELECT '✓ TPRS Database created successfully!' AS Status;
