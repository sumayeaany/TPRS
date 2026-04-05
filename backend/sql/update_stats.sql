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
