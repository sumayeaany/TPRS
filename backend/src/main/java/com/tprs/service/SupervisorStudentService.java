package com.tprs.service;

import com.tprs.dao.SupervisorStudentDAO;
import com.tprs.model.Student;
import com.tprs.model.Teacher;

import java.util.List;

/**
 * Supervisor-Student Assignment Service Layer
 */
public class SupervisorStudentService {
    
    private SupervisorStudentDAO supervisorStudentDAO;
    
    public SupervisorStudentService() {
        this.supervisorStudentDAO = new SupervisorStudentDAO();
    }
    
    /**
     * Assign a student to a supervisor
     */
    public boolean assignStudent(int supervisorId, int studentId) {
        return supervisorStudentDAO.assign(supervisorId, studentId);
    }
    
    /**
     * Assign a student to a supervisor for a specific year and semester
     */
    public boolean assignStudent(int supervisorId, int studentId, String year, String semester) {
        return supervisorStudentDAO.assign(supervisorId, studentId, year, semester);
    }
    
    /**
     * Remove a student from a supervisor
     */
    public boolean unassignStudent(int supervisorId, int studentId) {
        return supervisorStudentDAO.unassign(supervisorId, studentId);
    }
    
    /**
     * Remove a student from a supervisor for specific year/semester
     */
    public boolean unassignStudent(int supervisorId, int studentId, String year, String semester) {
        return supervisorStudentDAO.unassign(supervisorId, studentId, year, semester);
    }
    
    /**
     * Get all students assigned to a supervisor
     */
    public List<Student> getAssignedStudents(int supervisorId) {
        return supervisorStudentDAO.getStudentsBySupervisor(supervisorId);
    }
    
    /**
     * Get supervisors for a student
     */
    public List<Teacher> getSupervisorsForStudent(int studentId) {
        return supervisorStudentDAO.getSupervisorsForStudent(studentId);
    }
    
    /**
     * Get supervisors for a student by year and semester
     */
    public List<Teacher> getSupervisorsForStudent(int studentId, String year, String semester) {
        return supervisorStudentDAO.getSupervisorsForStudent(studentId, year, semester);
    }
    
    /**
     * Check if student is assigned to supervisor
     */
    public boolean isAssigned(int supervisorId, int studentId) {
        return supervisorStudentDAO.isAssigned(supervisorId, studentId);
    }
    
    /**
     * Get students not yet assigned to this supervisor
     */
    public List<Student> getUnassignedStudents(int supervisorId) {
        return supervisorStudentDAO.getUnassignedStudents(supervisorId);
    }

    /**
     * Get all assignments with full student/supervisor details
     */
    public java.util.List<java.util.Map<String, Object>> getAllAssignments() {
        return supervisorStudentDAO.getAllAssignments();
    }

    /**
     * Delete an assignment by its primary key ID
     */
    public boolean deleteAssignment(int assignmentId) {
        return supervisorStudentDAO.deleteAssignment(assignmentId);
    }
}
