package com.tprs.service;

import com.tprs.dao.TeacherDAO;
import com.tprs.model.Teacher;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.tprs.util.PasswordUtil;

import java.util.List;
import java.util.UUID;

/**
 * Teacher Service Layer
 * Handles business logic for Teacher operations
 */
public class TeacherService {
    
    private TeacherDAO teacherDAO;
    
    public TeacherService() {
        this.teacherDAO = new TeacherDAO();
    }
    
    /**
     * Register a new teacher
     * @param teacher Teacher object
     * @return true if successful, false otherwise
     */
    public boolean register(Teacher teacher) {

        // Check if email already exists

        if (teacherDAO.getByEmail(teacher.getEmail()) != null) {

            System.out.println("Email already registered!");

            return false;

        }

        

        // Create Placeholder in Firebase Admin

        try {

            UserRecord.CreateRequest request = new UserRecord.CreateRequest()

                .setEmail(teacher.getEmail())

                .setEmailVerified(true)

                .setPassword("csembstu");

            UserRecord userRecord = FirebaseAuth.getInstance().createUser(request);

            teacher.setFirebaseUid(userRecord.getUid());

            teacher.setEmailVerified(true);

        } catch (Exception e) {

            // If the user already exists in Firebase, just leave the UIDs alone for now

            System.err.println("Firebase user creation failed: " + e.getMessage());

        }

        

        // Set default password per policy

        teacher.setPassword(com.tprs.util.PasswordUtil.hashPassword("csembstu"));

        

        return teacherDAO.create(teacher);

    }
    
    /**
     * Login teacher (returns teacher even if not authorized, for auth check)
     */
    public Teacher loginCheck(String email, String password) {
        Teacher teacher = teacherDAO.getByEmail(email);
        if (teacher != null && PasswordUtil.checkPassword(password, teacher.getPassword())) {
            return teacher;
        }
        return null;
    }
    
    /**
     * Login teacher
     * @param email Teacher email
     * @param password Teacher password
     * @return Teacher object if authenticated, null otherwise
     */
    public Teacher login(String email, String password) {
        Teacher teacher = teacherDAO.getByEmail(email);
        if (teacher != null && PasswordUtil.checkPassword(password, teacher.getPassword())) {
            return teacher;
        }
        return null;
    }
    
    /**
     * Get teacher by ID
     * @param id Teacher ID
     * @return Teacher object
     */
    public Teacher getById(int id) {
        return teacherDAO.getById(id);
    }
    
    /**
     * Get teacher by email
     * @param email Teacher email
     * @return Teacher object
     */
    public Teacher getByEmail(String email) {
        return teacherDAO.getByEmail(email);
    }
    
    /**
     * Get all teachers
     * @return List of all teachers
     */
    public List<Teacher> getAllTeachers() {
        return teacherDAO.getAll();
    }
    
    /**
     * Get teachers by department
     * @param department Department name
     * @return List of teachers in the department
     */
    public List<Teacher> getTeachersByDepartment(String department) {
        return teacherDAO.getByDepartment(department);
    }
    
    /**
     * Update teacher profile
     * @param teacher Teacher object with updated data
     * @return true if successful, false otherwise
     */
    public boolean updateProfile(Teacher teacher) {
        return teacherDAO.update(teacher);
    }
    
    /**
     * Delete teacher
     * @param id Teacher ID
     * @return true if successful, false otherwise
     */
    public boolean deleteTeacher(int id) {
        Teacher teacher = teacherDAO.getById(id);
        if (teacher != null) {
            String uid = teacher.getFirebaseUid();
            if (uid == null || uid.trim().isEmpty()) {
                try {
                    if (teacher.getEmail() != null) {
                        UserRecord userRecord = FirebaseAuth.getInstance().getUserByEmail(teacher.getEmail());
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
        return teacherDAO.delete(id);
    }
    
    /**
     * Change password
     * @param teacherId Teacher ID
     * @param oldPassword Old password
     * @param newPassword New password
     * @return true if successful, false otherwise
     */
    public boolean forceChangePassword(int teacherId, String newPassword) {
        String hashedPassword = com.tprs.util.PasswordUtil.hashPassword(newPassword);
        return teacherDAO.updatePassword(teacherId, hashedPassword);
    }

    public boolean changePassword(int teacherId, String oldPassword, String newPassword) {
        Teacher teacher = teacherDAO.getById(teacherId);
        if (teacher != null && PasswordUtil.checkPassword(oldPassword, teacher.getPassword())) {
            String hashedPassword = PasswordUtil.hashPassword(newPassword);
            return teacherDAO.updatePassword(teacherId, hashedPassword);
        }
        return false;
    }
    
    public boolean updateAuthorization(int teacherId, boolean authorized) {
        return teacherDAO.updateAuthorization(teacherId, authorized);
    }
    
    public List<Teacher> searchTeachers(String keyword) {
        return teacherDAO.search(keyword);
    }
    
    public boolean adminUpdateTeacher(Teacher teacher) {
        return teacherDAO.adminUpdate(teacher);
    }

    public boolean isUsingDefaultPassword(Teacher teacher) {
        return teacher != null
                && teacher.getPassword() != null
                && PasswordUtil.checkPassword("csembstu", teacher.getPassword());
    }

    public boolean disableDefaultPasswordByEmail(String email) {
        Teacher teacher = teacherDAO.getByEmail(email);
        if (teacher == null) return false;
        if (!isUsingDefaultPassword(teacher)) return true;

        String randomPassword = "disabled-" + UUID.randomUUID();
        String hashedPassword = PasswordUtil.hashPassword(randomPassword);
        return teacherDAO.updatePassword(teacher.getId(), hashedPassword);
    }
}
