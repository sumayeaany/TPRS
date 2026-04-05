package com.tprs.dao;

import com.tprs.config.DatabaseConfig;
import com.tprs.model.Project;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Project Data Access Object (DAO)
 * Handles all database operations for Project entity
 */
public class ProjectDAO {
    
    public ProjectDAO() {
        // Connection is now obtained fresh from DatabaseConfig.getConnection() for each operation
    }
    
    /**
     * Get a valid database connection
     */
    private Connection getConnection() {
        return DatabaseConfig.getConnection();
    }
    
    /**
     * Create a new project
     * @param project Project object to create
     * @return true if successful, false otherwise
     */
    public boolean create(Project project) {
        String sql = "INSERT INTO project (title, description, type, student_id, supervisor_id, status, file_path, file_name, file_data, zip_file_path, zip_file_name, zip_file_size, github_link, keywords, year, semester, department, session) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        Connection connection = getConnection();
        
        if (connection == null) {
            System.err.println("Error: Database connection is null");
            return false;
        }
        
        try (PreparedStatement stmt = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, project.getTitle());
            stmt.setString(2, project.getDescription());
            stmt.setString(3, project.getType());
            stmt.setInt(4, project.getStudentId());
            stmt.setInt(5, project.getSupervisorId());
            stmt.setString(6, project.getStatus());
            stmt.setString(7, project.getFilePath());
            stmt.setString(8, project.getFileName());
            if (project.getFileData() != null) {
                stmt.setBytes(9, project.getFileData());
            } else {
                stmt.setNull(9, Types.BLOB);
            }
            stmt.setString(10, project.getZipFilePath());
            stmt.setString(11, project.getZipFileName());
            stmt.setLong(12, project.getZipFileSize());
            stmt.setString(13, project.getGithubLink());
            stmt.setString(14, project.getKeywords());
            stmt.setString(15, project.getYear());
            stmt.setString(16, project.getSemester());
            stmt.setString(17, project.getDepartment());
            stmt.setString(18, project.getSession());
            
            int rowsAffected = stmt.executeUpdate();
            
            if (rowsAffected > 0) {
                ResultSet generatedKeys = stmt.getGeneratedKeys();
                if (generatedKeys.next()) {
                    project.setId(generatedKeys.getInt(1));
                }
                return true;
            }
        } catch (SQLException e) {
            System.err.println("Error creating project: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get project by ID
     * @param id Project ID
     * @return Project object or null if not found
     */
    public Project getById(int id) {
        String sql = "SELECT * FROM project WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return mapResultSetToProject(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error getting project by ID: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get all projects
     * @return List of all projects
     */
    public List<Project> getAll() {
        List<Project> projects = new ArrayList<>();
        String sql = "SELECT * FROM project ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting all projects: " + e.getMessage());
            e.printStackTrace();
        }
        return projects;
    }
    
    /**
     * Get projects by student ID
     * @param studentId Student ID
     * @return List of projects by the student
     */
    public List<Project> getByStudentId(int studentId) {
        List<Project> projects = new ArrayList<>();
        String sql = "SELECT * FROM project WHERE student_id = ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, studentId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting projects by student: " + e.getMessage());
            e.printStackTrace();
        }
        return projects;
    }
    
    /**
     * Get projects by supervisor ID
     * @param supervisorId Supervisor/Teacher ID
     * @return List of projects supervised by the teacher
     */
    public List<Project> getBySupervisorId(int supervisorId) {
        List<Project> projects = new ArrayList<>();
        String sql = "SELECT * FROM project WHERE supervisor_id = ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, supervisorId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting projects by supervisor: " + e.getMessage());
            e.printStackTrace();
        }
        return projects;
    }
    
    /**
     * Get projects by department
     * @param department Department name
     * @return List of projects in the department
     */
    public List<Project> getByDepartment(String department) {
        List<Project> projects = new ArrayList<>();
        String sql = "SELECT * FROM project WHERE department = ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, department);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting projects by department: " + e.getMessage());
            e.printStackTrace();
        }
        return projects;
    }
    
    /**
     * Get projects by status
     * @param status Project status
     * @return List of projects with the given status
     */
    public List<Project> getByStatus(String status) {
        List<Project> projects = new ArrayList<>();
        String sql = "SELECT * FROM project WHERE status = ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, status);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error getting projects by status: " + e.getMessage());
            e.printStackTrace();
        }
        return projects;
    }
    
    /**
     * Search projects by keyword
     * @param keyword Search keyword
     * @return List of matching projects
     */
    public List<Project> searchByKeyword(String keyword) {
        List<Project> projects = new ArrayList<>();
        String sql = "SELECT * FROM project WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ? ORDER BY created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            String searchPattern = "%" + keyword + "%";
            stmt.setString(1, searchPattern);
            stmt.setString(2, searchPattern);
            stmt.setString(3, searchPattern);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                projects.add(mapResultSetToProject(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error searching projects: " + e.getMessage());
            e.printStackTrace();
        }
        return projects;
    }
    
    /**
     * Update project
     * @param project Project object with updated data
     * @return true if successful, false otherwise
     */
    public boolean update(Project project) {
        String sql = "UPDATE project SET title = ?, description = ?, type = ?, status = ?, file_path = ?, keywords = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, project.getTitle());
            stmt.setString(2, project.getDescription());
            stmt.setString(3, project.getType());
            stmt.setString(4, project.getStatus());
            stmt.setString(5, project.getFilePath());
            stmt.setString(6, project.getKeywords());
            stmt.setInt(7, project.getId());
            
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating project: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Update project status
     * @param id Project ID
     * @param status New status
     * @return true if successful, false otherwise
     */
    public boolean updateStatus(int id, String status) {
        String sql = "UPDATE project SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error updating project status: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Approve project
     * @param id Project ID
     * @return true if successful, false otherwise
     */
    public boolean approve(int id) {
        String sql = "UPDATE project SET status = 'approved', approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error approving project: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Delete project by ID
     * @param id Project ID
     * @return true if successful, false otherwise
     */
    public boolean delete(int id) {
        String sql = "DELETE FROM project WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error deleting project: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get file data and file name for a project (for download)
     * @param projectId Project ID
     * @return Project with only fileName and fileData populated, or null
     */
    public Project getFileDataById(int projectId) {
        String sql = "SELECT file_name, file_data FROM project WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, projectId);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                Project project = new Project();
                project.setId(projectId);
                project.setFileName(rs.getString("file_name"));
                project.setFileData(rs.getBytes("file_data"));
                return project;
            }
        } catch (SQLException e) {
            System.err.println("Error getting file data: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get zip file path and name for a project (for download)
     * @param projectId Project ID
     * @return Project with only zipFileName and zipFilePath populated, or null
     */
    public Project getZipFileInfoById(int projectId) {
        String sql = "SELECT zip_file_name, zip_file_path FROM project WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, projectId);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                Project project = new Project();
                project.setId(projectId);
                project.setZipFileName(rs.getString("zip_file_name"));
                project.setZipFilePath(rs.getString("zip_file_path"));
                return project;
            }
        } catch (SQLException e) {
            System.err.println("Error getting zip file info: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Map ResultSet to Project object
     */
    private Project mapResultSetToProject(ResultSet rs) throws SQLException {
        Project project = new Project();
        project.setId(rs.getInt("id"));
        project.setTitle(rs.getString("title"));
        project.setDescription(rs.getString("description"));
        project.setType(rs.getString("type"));
        project.setStudentId(rs.getInt("student_id"));
        project.setSupervisorId(rs.getInt("supervisor_id"));
        project.setStatus(rs.getString("status"));
        project.setFilePath(rs.getString("file_path"));
        project.setFileName(rs.getString("file_name"));
        project.setZipFilePath(rs.getString("zip_file_path"));
        project.setZipFileName(rs.getString("zip_file_name"));
        project.setZipFileSize(rs.getLong("zip_file_size"));
        project.setGithubLink(rs.getString("github_link"));
        project.setKeywords(rs.getString("keywords"));
        project.setYear(rs.getString("year"));
        project.setSemester(rs.getString("semester"));
        project.setDepartment(rs.getString("department"));
        project.setSession(rs.getString("session"));
        project.setSubmissionDate(rs.getTimestamp("submission_date"));
        project.setApprovalDate(rs.getTimestamp("approval_date"));
        project.setCreatedAt(rs.getTimestamp("created_at"));
        project.setUpdatedAt(rs.getTimestamp("updated_at"));
        return project;
    }
}
