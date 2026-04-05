package com.tprs.service;

import com.tprs.dao.ProjectDAO;
import com.tprs.dao.ProjectViewDAO;
import com.tprs.model.Project;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Project Service Layer
 * Handles business logic for Project operations
 */
public class ProjectService {
    
    private ProjectDAO projectDAO;
    private ProjectViewDAO projectViewDAO;
    
    public ProjectService() {
        this.projectDAO = new ProjectDAO();
        this.projectViewDAO = new ProjectViewDAO();
    }
    
    /**
     * Submit a new project
     * @param project Project object
     * @return true if successful, false otherwise
     */
    public boolean submitProject(Project project) {
        project.setStatus("pending");
        return projectDAO.create(project);
    }
    
    /**
     * Get project by ID
     * @param id Project ID
     * @return Project object
     */
    public Project getById(int id) {
        return projectDAO.getById(id);
    }
    
    /**
     * Get all projects
     * @return List of all projects
     */
    public List<Project> getAllProjects() {
        return projectDAO.getAll();
    }
    
    /**
     * Get projects by student
     * @param studentId Student ID
     * @return List of projects
     */
    public List<Project> getProjectsByStudent(int studentId) {
        return projectDAO.getByStudentId(studentId);
    }
    
    /**
     * Get projects by supervisor
     * @param supervisorId Supervisor/Teacher ID
     * @return List of projects
     */
    public List<Project> getProjectsBySupervisor(int supervisorId) {
        return projectDAO.getBySupervisorId(supervisorId);
    }
    
    /**
     * Get projects by department
     * @param department Department name
     * @return List of projects
     */
    public List<Project> getProjectsByDepartment(String department) {
        return projectDAO.getByDepartment(department);
    }
    
    /**
     * Get projects by status
     * @param status Project status
     * @return List of projects
     */
    public List<Project> getProjectsByStatus(String status) {
        return projectDAO.getByStatus(status);
    }
    
    /**
     * Search projects by keyword
     * @param keyword Search keyword
     * @return List of matching projects
     */
    public List<Project> searchProjects(String keyword) {
        return projectDAO.searchByKeyword(keyword);
    }
    
    /**
     * Update project
     * @param project Project object with updated data
     * @return true if successful, false otherwise
     */
    public boolean updateProject(Project project) {
        return projectDAO.update(project);
    }
    
    /**
     * Update project status
     * @param projectId Project ID
     * @param status New status
     * @return true if successful, false otherwise
     */
    public boolean updateStatus(int projectId, String status) {
        return projectDAO.updateStatus(projectId, status);
    }
    
    /**
     * Approve project (by supervisor)
     * @param projectId Project ID
     * @return true if successful, false otherwise
     */
    public boolean approveProject(int projectId) {
        return projectDAO.approve(projectId);
    }
    
    /**
     * Reject project
     * @param projectId Project ID
     * @return true if successful, false otherwise
     */
    public boolean rejectProject(int projectId) {
        return projectDAO.updateStatus(projectId, "rejected");
    }
    
    /**
     * Delete project and its associated files from disk
     * @param id Project ID
     * @param uploadBasePath Absolute base path for resolving stored file paths (e.g. servlet context real path)
     * @return true if successful, false otherwise
     */
    public boolean deleteProject(int id, String uploadBasePath) {
        // Fetch project to get file paths before deleting from DB
        Project project = projectDAO.getById(id);
        if (project == null) return false;

        // Delete DB row first
        boolean deleted = projectDAO.delete(id);
        if (deleted && uploadBasePath != null) {
            deleteFileIfExists(uploadBasePath, project.getFilePath());
            deleteFileIfExists(uploadBasePath, project.getZipFilePath());
        }
        return deleted;
    }

    /**
     * Delete project (DB only, no file cleanup — prefer the overload with uploadBasePath)
     */
    public boolean deleteProject(int id) {
        return deleteProject(id, null);
    }

    private void deleteFileIfExists(String basePath, String relativePath) {
        if (relativePath == null || relativePath.isEmpty()) return;
        try {
            java.io.File file = new java.io.File(basePath, relativePath);
            if (file.exists()) {
                file.delete();
            }
        } catch (Exception e) {
            System.err.println("Error deleting file " + relativePath + ": " + e.getMessage());
        }
    }
    
    /**
     * Get pending projects for approval
     * @return List of pending projects
     */
    public List<Project> getPendingProjects() {
        return projectDAO.getByStatus("pending");
    }
    
    /**
     * Get approved projects
     * @return List of approved projects
     */
    public List<Project> getApprovedProjects() {
        return projectDAO.getByStatus("approved");
    }
    
    /**
     * Get file data for download
     * @param projectId Project ID
     * @return Project with file data and file name
     */
    public Project getFileData(int projectId) {
        return projectDAO.getFileDataById(projectId);
    }
    
    /**
     * Get zip file info for download
     * @param projectId Project ID
     * @return Project with zip file name and path
     */
    public Project getZipFileInfo(int projectId) {
        return projectDAO.getZipFileInfoById(projectId);
    }
    
    /**
     * Record a unique view for a project
     */
    public boolean recordView(int projectId, int viewerId, String viewerType) {
        return projectViewDAO.recordView(projectId, viewerId, viewerType);
    }
    
    /**
     * Get view count for a single project
     */
    public int getViewCount(int projectId) {
        return projectViewDAO.getViewCount(projectId);
    }
    
    /**
     * Populate view counts on a list of projects (batch for efficiency)
     */
    public void populateViewCounts(List<Project> projects) {
        if (projects == null || projects.isEmpty()) return;
        List<Integer> ids = projects.stream().map(Project::getId).collect(Collectors.toList());
        Map<Integer, Integer> counts = projectViewDAO.getViewCounts(ids);
        for (Project p : projects) {
            p.setViews(counts.getOrDefault(p.getId(), 0));
        }
    }
}
