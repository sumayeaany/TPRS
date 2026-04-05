package com.tprs.dao;

import com.tprs.config.DatabaseConfig;
import com.tprs.model.Student;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Student Data Access Object (DAO)
 * Handles all database operations for Student entity
 */
public class StudentDAO {
    
    public StudentDAO() {
        // Connection is now obtained fresh from DatabaseConfig.getConnection() for each operation
    }
    
    /**
     * Get a valid database connection
     */
    private Connection getConnection() {
        return DatabaseConfig.getConnection();
    }
    
    /**
     * Create a new student
     * @param student Student object to create
     * @return true if successful, false otherwise
     */
    public boolean create(Student student) {
        String sql = "INSERT INTO student (student_id, first_name, last_name, email, password, department, semester, session, phone, firebase_uid, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        Connection connection = getConnection();
        
        if (connection == null) {
            System.err.println("Error: Database connection is null");
            return false;
        }
        
        try (PreparedStatement stmt = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, student.getStudentId());
            stmt.setString(2, student.getFirstName());
            stmt.setString(3, student.getLastName());
            stmt.setString(4, student.getEmail());
            stmt.setString(5, student.getPassword());
            stmt.setString(6, student.getDepartment());
            stmt.setString(7, student.getSemester());
            stmt.setString(8, student.getSession());
            stmt.setString(9, student.getPhone());
            stmt.setString(10, student.getFirebaseUid());
            stmt.setBoolean(11, student.isEmailVerified());
            stmt.setString(10, student.getFirebaseUid());
            stmt.setBoolean(11, student.isEmailVerified());
            
            int rowsAffected = stmt.executeUpdate();
            
            if (rowsAffected > 0) {
                ResultSet generatedKeys = stmt.getGeneratedKeys();
                if (generatedKeys.next()) {
                    student.setId(generatedKeys.getInt(1));
                }
                return true;
            }
        } catch (SQLException e) {
            System.err.println("Error creating student: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get student by ID
     * @param id Student ID
     * @return Student object or null if not found
     */
    public Student getById(int id) {
        String sql = "SELECT * FROM student WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToStudent(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error getting student by ID: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get student by email
     * @param email Student email
     * @return Student object or null if not found
     */
    public Student getByEmail(String email) {
        String sql = "SELECT * FROM student WHERE email = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToStudent(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error getting student by email: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get all students
     * @return List of all students
     */
    public List<Student> getAll() {
        List<Student> students = new ArrayList<>();
        String sql = "SELECT * FROM student ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                students.add(mapResultSetToStudent(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting all students: " + e.getMessage());
            e.printStackTrace();
        }
        return students;
    }
    
    /**
     * Update student
     * @param student Student object with updated data
     * @return true if successful, false otherwise
     */
    public boolean update(Student student) {
        String sql = "UPDATE student SET first_name = ?, last_name = ?, email = ?, department = ?, semester = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, student.getFirstName());
            stmt.setString(2, student.getLastName());
            stmt.setString(3, student.getEmail());
            stmt.setString(4, student.getDepartment());
            stmt.setString(5, student.getSemester());
            stmt.setString(6, student.getPhone());
            stmt.setInt(7, student.getId());
            
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating student: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Delete student by ID
     * @param id Student ID
     * @return true if successful, false otherwise
     */
    public boolean delete(int id) {
        String sql = "DELETE FROM student WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error deleting student: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Update student password
     * @param id Student ID
     * @param hashedPassword New hashed password
     * @return true if successful, false otherwise
     */
    public boolean updatePassword(int id, String hashedPassword) {
        String sql = "UPDATE student SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedPassword);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating student password: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Search students by name or email
     */
    public List<Student> search(String keyword) {
        List<Student> students = new ArrayList<>();
        String sql = "SELECT * FROM student WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR CONCAT(first_name, ' ', last_name) LIKE ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setString(3, pattern);
            stmt.setString(4, pattern);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                students.add(mapResultSetToStudent(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error searching students: " + e.getMessage());
            e.printStackTrace();
        }
        return students;
    }
    
    /**
     * Admin update student (all fields except email and password)
     */
    public boolean adminUpdate(Student student) {
        String sql = "UPDATE student SET first_name = ?, last_name = ?, department = ?, semester = ?, session = ?, phone = ?, student_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, student.getFirstName());
            stmt.setString(2, student.getLastName());
            stmt.setString(3, student.getDepartment());
            stmt.setString(4, student.getSemester());
            stmt.setString(5, student.getSession());
            stmt.setString(6, student.getPhone());
            stmt.setString(7, student.getStudentId());
            stmt.setInt(8, student.getId());
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error admin updating student: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Authenticate student
     * @param email Student email
     * @param password Student password
     * @return Student object if authenticated, null otherwise
     */
    public Student authenticate(String email, String password) {
        String sql = "SELECT * FROM student WHERE email = ? AND password = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, email);
            stmt.setString(2, password);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToStudent(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error authenticating student: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Map ResultSet to Student object
     */
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
        student.setSession(rs.getString("session"));
        student.setPhone(rs.getString("phone"));
        student.setFirebaseUid(rs.getString("firebase_uid"));
        student.setCreatedAt(rs.getTimestamp("created_at"));
        student.setUpdatedAt(rs.getTimestamp("updated_at"));
        return student;
    }
}
