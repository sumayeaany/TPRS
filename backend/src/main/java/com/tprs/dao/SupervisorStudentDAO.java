package com.tprs.dao;

import com.tprs.config.DatabaseConfig;
import com.tprs.model.Student;
import com.tprs.model.Teacher;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Supervisor-Student Assignment DAO
 * Handles supervisor-student relationship operations
 */
public class SupervisorStudentDAO {
    
    private Connection getConnection() {
        return DatabaseConfig.getConnection();
    }
    
    /**
     * Assign a student to a supervisor
     */
    public boolean assign(int supervisorId, int studentId) {
        return assign(supervisorId, studentId, null, null);
    }
    
    /**
     * Assign a student to a supervisor for a specific year and semester
     */
    public boolean assign(int supervisorId, int studentId, String year, String semester) {
        String sql = "INSERT IGNORE INTO supervisor_student (supervisor_id, student_id, year, semester) VALUES (?, ?, ?, ?)";
        Connection connection = getConnection();
        
        if (connection == null) return false;
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, supervisorId);
            stmt.setInt(2, studentId);
            stmt.setString(3, year);
            stmt.setString(4, semester);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error assigning student to supervisor: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Remove a student from a supervisor (all entries)
     */
    public boolean unassign(int supervisorId, int studentId) {
        String sql = "DELETE FROM supervisor_student WHERE supervisor_id = ? AND student_id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, supervisorId);
            stmt.setInt(2, studentId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error removing student from supervisor: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Remove a student from a supervisor for a specific year/semester
     */
    public boolean unassign(int supervisorId, int studentId, String year, String semester) {
        String sql = "DELETE FROM supervisor_student WHERE supervisor_id = ? AND student_id = ? AND year = ? AND semester = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, supervisorId);
            stmt.setInt(2, studentId);
            stmt.setString(3, year);
            stmt.setString(4, semester);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error removing student from supervisor: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get all students assigned to a supervisor
     */
    public List<Student> getStudentsBySupervisor(int supervisorId) {
        List<Student> students = new ArrayList<>();
        String sql = "SELECT s.*, ss.year AS assigned_year, ss.semester AS assigned_semester FROM student s JOIN supervisor_student ss ON s.id = ss.student_id WHERE ss.supervisor_id = ? ORDER BY s.last_name, s.first_name";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, supervisorId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                Student student = mapResultSetToStudent(rs);
                student.setAssignedYear(rs.getString("assigned_year"));
                student.setAssignedSemester(rs.getString("assigned_semester"));
                students.add(student);
            }
        } catch (SQLException e) {
            System.err.println("Error getting assigned students: " + e.getMessage());
            e.printStackTrace();
        }
        return students;
    }
    
    /**
     * Get the supervisor(s) assigned to a student
     */
    public List<Teacher> getSupervisorsForStudent(int studentId) {
        return getSupervisorsForStudent(studentId, null, null);
    }
    
    /**
     * Get the supervisor(s) assigned to a student for a specific year/semester
     */
    public List<Teacher> getSupervisorsForStudent(int studentId, String year, String semester) {
        List<Teacher> teachers = new ArrayList<>();
        String sql;
        if (year != null && semester != null) {
            sql = "SELECT t.* FROM teacher t JOIN supervisor_student ss ON t.id = ss.supervisor_id WHERE ss.student_id = ? AND ss.year = ? AND ss.semester = ? ORDER BY t.last_name";
        } else {
            sql = "SELECT t.* FROM teacher t JOIN supervisor_student ss ON t.id = ss.supervisor_id WHERE ss.student_id = ? ORDER BY t.last_name";
        }
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, studentId);
            if (year != null && semester != null) {
                stmt.setString(2, year);
                stmt.setString(3, semester);
            }
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                teachers.add(mapResultSetToTeacher(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting supervisors for student: " + e.getMessage());
            e.printStackTrace();
        }
        return teachers;
    }
    
    /**
     * Check if a student is assigned to a supervisor
     */
    public boolean isAssigned(int supervisorId, int studentId) {
        String sql = "SELECT COUNT(*) AS cnt FROM supervisor_student WHERE supervisor_id = ? AND student_id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, supervisorId);
            stmt.setInt(2, studentId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getInt("cnt") > 0;
            }
        } catch (SQLException e) {
            System.err.println("Error checking assignment: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get all students available for assignment (includes already-assigned students
     * since assignments are year/semester-specific)
     */
    public List<Student> getUnassignedStudents(int supervisorId) {
        List<Student> students = new ArrayList<>();
        String sql = "SELECT s.* FROM student s ORDER BY s.last_name, s.first_name";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                students.add(mapResultSetToStudent(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting unassigned students: " + e.getMessage());
            e.printStackTrace();
        }
        return students;
    }

    /**
     * Get all assignments with student and supervisor info
     */
    public List<java.util.Map<String, Object>> getAllAssignments() {
        List<java.util.Map<String, Object>> results = new ArrayList<>();
        String sql = "SELECT ss.id AS assignment_id, ss.year AS assigned_year, ss.semester AS assigned_semester, " +
                "ss.assigned_at, s.id AS student_id, s.student_id AS student_code, s.first_name AS stu_first, " +
                "s.last_name AS stu_last, s.email AS stu_email, s.department AS stu_dept, s.session AS stu_session, " +
                "t.id AS teacher_id, t.first_name AS sup_first, t.last_name AS sup_last, t.department AS sup_dept " +
                "FROM supervisor_student ss " +
                "JOIN student s ON s.id = ss.student_id " +
                "JOIN teacher t ON t.id = ss.supervisor_id " +
                "ORDER BY t.last_name, t.first_name, s.last_name, s.first_name";
        Connection connection = getConnection();
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                java.util.Map<String, Object> row = new java.util.HashMap<>();
                row.put("assignmentId", rs.getInt("assignment_id"));
                row.put("assignedYear", rs.getString("assigned_year"));
                row.put("assignedSemester", rs.getString("assigned_semester"));
                row.put("assignedAt", rs.getTimestamp("assigned_at") != null ? rs.getTimestamp("assigned_at").toString() : null);
                row.put("studentId", rs.getInt("student_id"));
                row.put("studentCode", rs.getString("student_code"));
                row.put("studentName", rs.getString("stu_first") + " " + rs.getString("stu_last"));
                row.put("studentEmail", rs.getString("stu_email"));
                row.put("studentDepartment", rs.getString("stu_dept"));
                row.put("studentSession", rs.getString("stu_session"));
                row.put("supervisorId", rs.getInt("teacher_id"));
                row.put("supervisorName", rs.getString("sup_first") + " " + rs.getString("sup_last"));
                row.put("supervisorDepartment", rs.getString("sup_dept"));
                results.add(row);
            }
        } catch (SQLException e) {
            System.err.println("Error getting all assignments: " + e.getMessage());
            e.printStackTrace();
        }
        return results;
    }

    /**
     * Delete an assignment by its primary key ID
     */
    public boolean deleteAssignment(int assignmentId) {
        String sql = "DELETE FROM supervisor_student WHERE id = ?";
        Connection connection = getConnection();
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, assignmentId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error deleting assignment: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    private Student mapResultSetToStudent(ResultSet rs) throws SQLException {
        Student student = new Student();
        student.setId(rs.getInt("id"));
        student.setStudentId(rs.getString("student_id"));
        student.setFirstName(rs.getString("first_name"));
        student.setLastName(rs.getString("last_name"));
        student.setEmail(rs.getString("email"));
        student.setPassword(rs.getString("password"));
        student.setDepartment(rs.getString("department"));
        student.setSemester(rs.getString("semester"));
        student.setPhone(rs.getString("phone"));
        student.setCreatedAt(rs.getTimestamp("created_at"));
        student.setUpdatedAt(rs.getTimestamp("updated_at"));
        return student;
    }
    
    private Teacher mapResultSetToTeacher(ResultSet rs) throws SQLException {
        Teacher teacher = new Teacher();
        teacher.setId(rs.getInt("id"));
        teacher.setTeacherId(rs.getString("teacher_id"));
        teacher.setFirstName(rs.getString("first_name"));
        teacher.setLastName(rs.getString("last_name"));
        teacher.setEmail(rs.getString("email"));
        teacher.setPassword(rs.getString("password"));
        teacher.setDepartment(rs.getString("department"));
        teacher.setDesignation(rs.getString("designation"));
        teacher.setSpecialization(rs.getString("specialization"));
        teacher.setPhone(rs.getString("phone"));
        teacher.setCreatedAt(rs.getTimestamp("created_at"));
        teacher.setUpdatedAt(rs.getTimestamp("updated_at"));
        return teacher;
    }
}
