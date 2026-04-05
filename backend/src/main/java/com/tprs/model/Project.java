package com.tprs.model;

import java.sql.Timestamp;

/**
 * Project Model - Represents a thesis/project entity
 */
public class Project {
    
    private int id;
    private String title;
    private String description;
    private String type; // thesis, project, research
    private int studentId;
    private int supervisorId;
    private String status; // pending, in_progress, completed, approved, rejected
    private String filePath;
    private String fileName;
    private transient byte[] fileData; // transient: excluded from Gson serialization
    private String zipFilePath;
    private String zipFileName;
    private long zipFileSize;
    private String githubLink;
    private String keywords;
    private String year;
    private String semester;
    private String department;
    private Timestamp submissionDate;
    private Timestamp approvalDate;
    private String session;
    private Timestamp createdAt;
    private Timestamp updatedAt;
    
    // Non-DB fields (populated at runtime for API responses)
    private String studentName;
    private String supervisorName;
    private String degreeType;
    private int views;
    
    // Default constructor
    public Project() {}
    
    // Parameterized constructor
    public Project(String title, String description, String type, int studentId,
                   int supervisorId, String keywords, String year, String semester, String department) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.studentId = studentId;
        this.supervisorId = supervisorId;
        this.keywords = keywords;
        this.year = year;
        this.semester = semester;
        this.department = department;
        this.status = "pending";
    }
    
    // Getters and Setters
    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public int getStudentId() {
        return studentId;
    }
    
    public void setStudentId(int studentId) {
        this.studentId = studentId;
    }
    
    public int getSupervisorId() {
        return supervisorId;
    }
    
    public void setSupervisorId(int supervisorId) {
        this.supervisorId = supervisorId;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getFilePath() {
        return filePath;
    }
    
    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }
    
    public String getFileName() {
        return fileName;
    }
    
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
    
    public byte[] getFileData() {
        return fileData;
    }
    
    public void setFileData(byte[] fileData) {
        this.fileData = fileData;
    }
    
    public String getZipFilePath() {
        return zipFilePath;
    }
    
    public void setZipFilePath(String zipFilePath) {
        this.zipFilePath = zipFilePath;
    }
    
    public String getZipFileName() {
        return zipFileName;
    }
    
    public void setZipFileName(String zipFileName) {
        this.zipFileName = zipFileName;
    }
    
    public long getZipFileSize() {
        return zipFileSize;
    }
    
    public void setZipFileSize(long zipFileSize) {
        this.zipFileSize = zipFileSize;
    }
    
    public String getGithubLink() {
        return githubLink;
    }
    
    public void setGithubLink(String githubLink) {
        this.githubLink = githubLink;
    }
    
    public String getKeywords() {
        return keywords;
    }
    
    public void setKeywords(String keywords) {
        this.keywords = keywords;
    }
    
    public String getYear() {
        return year;
    }
    
    public void setYear(String year) {
        this.year = year;
    }
    
    public String getSemester() {
        return semester;
    }
    
    public void setSemester(String semester) {
        this.semester = semester;
    }
    
    public String getDepartment() {
        return department;
    }
    
    public void setDepartment(String department) {
        this.department = department;
    }
    
    public Timestamp getSubmissionDate() {
        return submissionDate;
    }
    
    public void setSubmissionDate(Timestamp submissionDate) {
        this.submissionDate = submissionDate;
    }
    
    public Timestamp getApprovalDate() {
        return approvalDate;
    }
    
    public void setApprovalDate(Timestamp approvalDate) {
        this.approvalDate = approvalDate;
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
    
    public String getSession() {
        return session;
    }
    
    public void setSession(String session) {
        this.session = session;
    }
    
    public String getStudentName() {
        return studentName;
    }
    
    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }
    
    public String getSupervisorName() {
        return supervisorName;
    }
    
    public void setSupervisorName(String supervisorName) {
        this.supervisorName = supervisorName;
    }
    
    public int getViews() {
        return views;
    }
    
    public void setViews(int views) {
        this.views = views;
    }
    
    @Override
    public String toString() {
        return "Project{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", type='" + type + '\'' +
                ", status='" + status + '\'' +
                ", department='" + department + '\'' +
                ", year=" + year +
                '}';
    }
 
    public String getDegreeType() { return degreeType; }
    public void setDegreeType(String degreeType) { this.degreeType = degreeType; }
}
