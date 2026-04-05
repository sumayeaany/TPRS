package com.tprs.dao;

import com.tprs.config.DatabaseConfig;
import com.tprs.model.Teacher;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Teacher Data Access Object (DAO)
 * Handles all database operations for Teacher entity
 */
public class TeacherDAO {
    
    public TeacherDAO() {
        // Connection is now obtained fresh from DatabaseConfig.getConnection() for each operation
    }
    
    /**
     * Get a valid database connection
     */
    private Connection getConnection() {
        return DatabaseConfig.getConnection();
    }
    
    /**
     * Create a new teacher
     * @param teacher Teacher object to create
     * @return true if successful, false otherwise
     */
    public boolean create(Teacher teacher) {
        String sql = "INSERT INTO teacher (teacher_id, first_name, last_name, email, password, department, designation, specialization, phone, firebase_uid, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        Connection connection = getConnection();
        
        if (connection == null) {
            System.err.println("Error: Database connection is null");
            return false;
        }
        
        try (PreparedStatement stmt = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, teacher.getTeacherId());
            stmt.setString(2, teacher.getFirstName());
            stmt.setString(3, teacher.getLastName());
            stmt.setString(4, teacher.getEmail());
            stmt.setString(5, teacher.getPassword());
            stmt.setString(6, teacher.getDepartment());
            stmt.setString(7, teacher.getDesignation());
            stmt.setString(8, teacher.getSpecialization());
            stmt.setString(9, teacher.getPhone());
            stmt.setString(10, teacher.getFirebaseUid());
            stmt.setBoolean(11, teacher.isEmailVerified());
            
            int rowsAffected = stmt.executeUpdate();
            
            if (rowsAffected > 0) {
                ResultSet generatedKeys = stmt.getGeneratedKeys();
                if (generatedKeys.next()) {
                    teacher.setId(generatedKeys.getInt(1));
                }
                return true;
            }
        } catch (SQLException e) {
            System.err.println("Error creating teacher: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get teacher by ID
     * @param id Teacher ID
     * @return Teacher object or null if not found
     */
    public Teacher getById(int id) {
        String sql = "SELECT * FROM teacher WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToTeacher(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error getting teacher by ID: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get teacher by email
     * @param email Teacher email
     * @return Teacher object or null if not found
     */
    public Teacher getByEmail(String email) {
        String sql = "SELECT * FROM teacher WHERE email = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToTeacher(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error getting teacher by email: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get all teachers
     * @return List of all teachers
     */
    public List<Teacher> getAll() {
        List<Teacher> teachers = new ArrayList<>();
        String sql = "SELECT * FROM teacher ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                teachers.add(mapResultSetToTeacher(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting all teachers: " + e.getMessage());
            e.printStackTrace();
        }
        return teachers;
    }
    
    /**
     * Get teachers by department
     * @param department Department name
     * @return List of teachers in the department
     */
    public List<Teacher> getByDepartment(String department) {
        List<Teacher> teachers = new ArrayList<>();
        String sql = "SELECT * FROM teacher WHERE department = ? ORDER BY last_name";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, department);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                teachers.add(mapResultSetToTeacher(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting teachers by department: " + e.getMessage());
            e.printStackTrace();
        }
        return teachers;
    }
    
    /**
     * Update teacher
     * @param teacher Teacher object with updated data
     * @return true if successful, false otherwise
     */
    public boolean update(Teacher teacher) {
        String sql = "UPDATE teacher SET first_name = ?, last_name = ?, email = ?, department = ?, designation = ?, specialization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, teacher.getFirstName());
            stmt.setString(2, teacher.getLastName());
            stmt.setString(3, teacher.getEmail());
            stmt.setString(4, teacher.getDepartment());
            stmt.setString(5, teacher.getDesignation());
            stmt.setString(6, teacher.getSpecialization());
            stmt.setString(7, teacher.getPhone());
            stmt.setInt(8, teacher.getId());
            
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating teacher: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Delete teacher by ID
     * @param id Teacher ID
     * @return true if successful, false otherwise
     */
    public boolean delete(int id) {
        String sql = "DELETE FROM teacher WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error deleting teacher: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Update teacher password
     * @param id Teacher ID
     * @param hashedPassword New hashed password
     * @return true if successful, false otherwise
     */
    public boolean updatePassword(int id, String hashedPassword) {
        String sql = "UPDATE teacher SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedPassword);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating teacher password: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Authenticate teacher
     * @param email Teacher email
     * @param password Teacher password
     * @return Teacher object if authenticated, null otherwise
     */
    public Teacher authenticate(String email, String password) {
        String sql = "SELECT * FROM teacher WHERE email = ? AND password = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, email);
            stmt.setString(2, password);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToTeacher(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error authenticating teacher: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Update teacher authorization status
     */
    public boolean updateAuthorization(int id, boolean authorized) {
        String sql = "UPDATE teacher SET is_authorized = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setBoolean(1, authorized);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating teacher authorization: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Search teachers by name or email
     */
    public List<Teacher> search(String keyword) {
        List<Teacher> teachers = new ArrayList<>();
        String sql = "SELECT * FROM teacher WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR CONCAT(first_name, ' ', last_name) LIKE ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            String pattern = "%" + keyword + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setString(3, pattern);
            stmt.setString(4, pattern);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                teachers.add(mapResultSetToTeacher(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error searching teachers: " + e.getMessage());
            e.printStackTrace();
        }
        return teachers;
    }
    
    /**
     * Admin update teacher (all fields except email and password)
     */
    public boolean adminUpdate(Teacher teacher) {
        String sql = "UPDATE teacher SET first_name = ?, last_name = ?, department = ?, designation = ?, specialization = ?, phone = ?, teacher_id = ?, is_authorized = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, teacher.getFirstName());
            stmt.setString(2, teacher.getLastName());
            stmt.setString(3, teacher.getDepartment());
            stmt.setString(4, teacher.getDesignation());
            stmt.setString(5, teacher.getSpecialization());
            stmt.setString(6, teacher.getPhone());
            stmt.setString(7, teacher.getTeacherId());
            stmt.setBoolean(8, teacher.isAuthorized());
            stmt.setInt(9, teacher.getId());
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error admin updating teacher: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Map ResultSet to Teacher object
     */
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
        teacher.setAuthorized(rs.getBoolean("is_authorized"));
        teacher.setFirebaseUid(rs.getString("firebase_uid"));
        teacher.setCreatedAt(rs.getTimestamp("created_at"));
        teacher.setUpdatedAt(rs.getTimestamp("updated_at"));
        return teacher;
    }
}
