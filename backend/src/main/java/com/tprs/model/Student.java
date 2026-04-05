package com.tprs.model;

import java.sql.Timestamp;

/**
 * Student Model - Represents a student entity
 */
public class Student {
    
    private int id;
    private String studentId;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String department;
    private String semester;
    private String session;
    private String phone;
    private String firebaseUid;
    private boolean emailVerified;
    private Timestamp createdAt;
    private Timestamp updatedAt;
    
    // Fields for supervisor-student assignment context
    private String assignedYear;
    private String assignedSemester;
    
    // Default constructor
    public Student() {}
    
    // Parameterized constructor
    public Student(String studentId, String firstName, String lastName, String email, 
                   String password, String department, String semester, String session, String phone) {
        this.studentId = studentId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.department = department;
        this.semester = semester;
        this.session = session;
        this.phone = phone;
    }
    
    // Getters and Setters
    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    
    public String getStudentId() {
        return (studentId != null) ? studentId.toUpperCase() : null;
    }
    
    public void setStudentId(String studentId) {
        this.studentId = (studentId != null) ? studentId.toUpperCase() : null;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public String getDepartment() {
        return department;
    }
    
    public void setDepartment(String department) {
        this.department = department;
    }
    
    public String getSemester() {
        return semester;
    }
    
    public void setSemester(String semester) {
        this.semester = semester;
    }
    
    public String getSession() {
        return session;
    }
    
    public void setSession(String session) {
        this.session = session;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public Timestamp getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
    
    public Timestamp getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getAssignedYear() {
        return assignedYear;
    }
    
    public void setAssignedYear(String assignedYear) {
        this.assignedYear = assignedYear;
    }
    
    public String getAssignedSemester() {
        return assignedSemester;
    }
    
    public void setAssignedSemester(String assignedSemester) {
        this.assignedSemester = assignedSemester;
    }
    
    // Get full name
    public String getFullName() {
        return firstName + " " + lastName;
    }
    
    @Override
    public String toString() {
        return "Student{" +
                "id=" + id +
                ", studentId='" + studentId + '\'' +
                ", name='" + getFullName() + '\'' +
                ", email='" + email + '\'' +
                ", department='" + department + '\'' +
                ", semester='" + semester + '\'' +
                '}';
    }
    public String getFirebaseUid() { return firebaseUid; }
    public void setFirebaseUid(String firebaseUid) { this.firebaseUid = firebaseUid; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
}
