package com.tprs.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.tprs.dao.StudentDAO;
import com.tprs.model.Student;
import com.tprs.util.PasswordUtil;

import java.util.List;

/**
 * Student Service Layer
 * Handles business logic for Student operations
 */
public class StudentService {
    
    private StudentDAO studentDAO;
    
    public StudentService() {
        this.studentDAO = new StudentDAO();
    }
    
    /**
     * Register a new student
     * @param student Student object
     * @return true if successful, false otherwise
     */
    public boolean register(Student student) {
        // Check if email already exists
        if (studentDAO.getByEmail(student.getEmail()) != null) {
            System.out.println("Email already registered!");
            return false;
        }
        
        student.setPassword(PasswordUtil.hashPassword(student.getPassword()));
        
        return studentDAO.create(student);
    }
    
    /**
     * Login student
     * @param email Student email
     * @param password Student password
     * @return Student object if authenticated, null otherwise
     */
    public Student login(String email, String password) {
        Student student = studentDAO.getByEmail(email);
        if (student != null && PasswordUtil.checkPassword(password, student.getPassword())) {
            return student;
        }
        return null;
    }
    
    /**
     * Get student by ID
     * @param id Student ID
     * @return Student object
     */
    public Student getById(int id) {
        return studentDAO.getById(id);
    }
    
    /**
     * Get student by email
     * @param email Student email
     * @return Student object
     */
    public Student getByEmail(String email) {
        return studentDAO.getByEmail(email);
    }
    
    /**
     * Get all students
     * @return List of all students
     */
    public List<Student> getAllStudents() {
        return studentDAO.getAll();
    }
    
    /**
     * Update student profile
     * @param student Student object with updated data
     * @return true if successful, false otherwise
     */
    public boolean updateProfile(Student student) {
        return studentDAO.update(student);
    }
    
    /**
     * Delete student
     * @param id Student ID
     * @return true if successful, false otherwise
     */
    public boolean deleteStudent(int id) {
        Student student = studentDAO.getById(id);
        if (student != null) {
            String uid = student.getFirebaseUid();
            if (uid == null || uid.trim().isEmpty()) {
                try {
                    if (student.getEmail() != null) {
                        UserRecord userRecord = FirebaseAuth.getInstance().getUserByEmail(student.getEmail());
                        uid = userRecord.getUid();
                    }
                } catch (Exception e) {
                    System.err.println("Could not find Firebase user by email: " + e.getMessage());
                }
            }
            
            if (uid != null && !uid.trim().isEmpty()) {
                try {
                    FirebaseAuth.getInstance().deleteUser(uid);
                } catch (com.google.firebase.auth.FirebaseAuthException e) {
                    if (!"user-not-found".equals(e.getErrorCode())) {
                        System.err.println("Firebase Auth Error: " + e.getMessage());
                        return false;
                    }
                } catch (Exception e) {
                    System.err.println("Unexpected error deleting from Firebase: " + e.getMessage());
                    return false;
                }
            }
        }
        return studentDAO.delete(id);
    }
    
    /**
     * Change password
     * @param studentId Student ID
     * @param oldPassword Old password
     * @param newPassword New password
     * @return true if successful, false otherwise
     */
    public boolean changePassword(int studentId, String oldPassword, String newPassword) {
        Student student = studentDAO.getById(studentId);
        if (student != null && PasswordUtil.checkPassword(oldPassword, student.getPassword())) {
            String hashedPassword = PasswordUtil.hashPassword(newPassword);
            return studentDAO.updatePassword(studentId, hashedPassword);
        }
        return false;
    }
    
    public boolean forceChangePassword(int studentId, String newPassword) {
        String hashedPassword = PasswordUtil.hashPassword(newPassword);
        return studentDAO.updatePassword(studentId, hashedPassword);
    }
    
    public List<Student> searchStudents(String keyword) {
        return studentDAO.search(keyword);
    }
    
    public boolean adminUpdateStudent(Student student) {
        return studentDAO.adminUpdate(student);
    }
}
