package com.tprs.servlet;

import com.tprs.service.ProjectService;
import com.tprs.service.NotificationService;
import com.tprs.service.SupervisorStudentService;
import com.tprs.service.StudentService;
import com.tprs.service.TeacherService;
import com.tprs.model.Project;
import com.tprs.model.Student;
import com.tprs.model.Teacher;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

/**
 * Project Servlet - Handles project CRUD operations
 */
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,      // 1 MB
    maxFileSize = 200 * 1024 * 1024,       // 200 MB (for zip files)
    maxRequestSize = 300 * 1024 * 1024     // 300 MB
)
public class ProjectServlet extends HttpServlet {
    
    private ProjectService projectService;
    private NotificationService notificationService;
    private SupervisorStudentService assignmentService;
    private StudentService studentService;
    private TeacherService teacherService;
    private Gson gson;
    private static final String UPLOAD_DIR = "uploads";
    
    @Override
    public void init() throws ServletException {
        projectService = new ProjectService();
        notificationService = new NotificationService();
        assignmentService = new SupervisorStudentService();
        studentService = new StudentService();
        teacherService = new TeacherService();
        gson = new Gson();
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String pathInfo = request.getPathInfo();
        
        // Handle download BEFORE getting PrintWriter (can't mix getWriter and getOutputStream)
        if (pathInfo != null && pathInfo.matches("/\\d+/download")) {
            String[] parts = pathInfo.substring(1).split("/");
            int projectId = Integer.parseInt(parts[0]);
            try {
                Project fileProject = projectService.getFileData(projectId);
                if (fileProject != null && fileProject.getFileData() != null) {
                    String fileName = fileProject.getFileName() != null ? fileProject.getFileName() : "document";
                    response.setContentType("application/octet-stream");
                    response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
                    response.setContentLength(fileProject.getFileData().length);
                    response.getOutputStream().write(fileProject.getFileData());
                    response.getOutputStream().flush();
                } else {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    response.setContentType("application/json");
                    response.getWriter().print("{\"success\":false,\"message\":\"File not found for this project\"}");
                }
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.setContentType("application/json");
                response.getWriter().print("{\"success\":false,\"message\":\"Server error: " + e.getMessage() + "\"}");
            }
            return;
        }
        
        // Handle zip download
        if (pathInfo != null && pathInfo.matches("/\\d+/download-zip")) {
            String[] parts = pathInfo.substring(1).split("/");
            int projectId = Integer.parseInt(parts[0]);
            try {
                Project zipProject = projectService.getZipFileInfo(projectId);
                if (zipProject != null && zipProject.getZipFilePath() != null) {
                    String zipPath = getServletContext().getRealPath("") + File.separator + zipProject.getZipFilePath();
                    File zipFile = new File(zipPath);
                    if (zipFile.exists()) {
                        String zipName = zipProject.getZipFileName() != null ? zipProject.getZipFileName() : "project.zip";
                        response.setContentType("application/zip");
                        response.setHeader("Content-Disposition", "attachment; filename=\"" + zipName + "\"");
                        response.setContentLengthLong(zipFile.length());
                        try (java.io.FileInputStream fis = new java.io.FileInputStream(zipFile)) {
                            fis.transferTo(response.getOutputStream());
                        }
                        response.getOutputStream().flush();
                    } else {
                        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        response.setContentType("application/json");
                        response.getWriter().print("{\"success\":false,\"message\":\"Zip file not found on server\"}");
                    }
                } else {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    response.setContentType("application/json");
                    response.getWriter().print("{\"success\":false,\"message\":\"No zip file for this project\"}");
                }
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.setContentType("application/json");
                response.getWriter().print("{\"success\":false,\"message\":\"Server error: " + e.getMessage() + "\"}");
            }
            return;
        }
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            if (pathInfo == null || "/".equals(pathInfo)) {
                // Get all projects or filter by query params
                String status = request.getParameter("status");
                String department = request.getParameter("department");
                String studentId = request.getParameter("studentId");
                String supervisorId = request.getParameter("supervisorId");
                String search = request.getParameter("search");
                String limit = request.getParameter("limit");
                
                List<Project> projects;
                
                if (search != null && !search.isEmpty()) {
                    projects = projectService.searchProjects(search);
                } else if (status != null && !status.isEmpty()) {
                    projects = projectService.getProjectsByStatus(status);
                } else if (department != null && !department.isEmpty()) {
                    projects = projectService.getProjectsByDepartment(department);
                } else if (studentId != null && !studentId.isEmpty()) {
                    projects = projectService.getProjectsByStudent(Integer.parseInt(studentId));
                } else if (supervisorId != null && !supervisorId.isEmpty()) {
                    projects = projectService.getProjectsBySupervisor(Integer.parseInt(supervisorId));
                } else {
                    projects = projectService.getAllProjects();
                }
                
                // Apply limit if specified (for recent projects)
                if (limit != null && !limit.isEmpty()) {
                    int limitNum = Integer.parseInt(limit);
                    if (projects.size() > limitNum) {
                        projects = projects.subList(0, limitNum);
                    }
                }
                
                enrichProjects(projects);
                jsonResponse.addProperty("success", true);
                jsonResponse.add("projects", gson.toJsonTree(projects));
                jsonResponse.addProperty("count", projects.size());
                
            } else {
                // Get specific project by ID or handle sub-paths
                String pathStr = pathInfo.substring(1);
                String[] pathParts = pathStr.split("/");
                
                // Download is handled above before getWriter()
                if ("recent".equals(pathParts[0])) {
                    // Get recent projects (last 10)
                    List<Project> projects = projectService.getAllProjects();
                    if (projects.size() > 10) {
                        projects = projects.subList(0, 10);
                    }
                    enrichProjects(projects);
                    jsonResponse.addProperty("success", true);
                    jsonResponse.add("projects", gson.toJsonTree(projects));
                } else if ("pending".equals(pathParts[0])) {
                    List<Project> projects = projectService.getPendingProjects();
                    enrichProjects(projects);
                    jsonResponse.addProperty("success", true);
                    jsonResponse.add("projects", gson.toJsonTree(projects));
                } else if ("approved".equals(pathParts[0])) {
                    List<Project> projects = projectService.getApprovedProjects();
                    enrichProjects(projects);
                    jsonResponse.addProperty("success", true);
                    jsonResponse.add("projects", gson.toJsonTree(projects));
                } else {
                    Project project = projectService.getById(Integer.parseInt(pathParts[0]));
                    if (project != null) {
                        enrichProject(project);
                        jsonResponse.addProperty("success", true);
                        jsonResponse.add("project", gson.toJsonTree(project));
                    } else {
                        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        jsonResponse.addProperty("success", false);
                        jsonResponse.addProperty("message", "Project not found");
                    }
                }
            }
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
        }
        
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // Handle view recording: POST /api/projects/{id}/view
        String pathInfo = request.getPathInfo();
        if (pathInfo != null && pathInfo.matches("/\\d+/view")) {
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            PrintWriter vOut = response.getWriter();
            JsonObject vResp = new JsonObject();
            try {
                int projectId = Integer.parseInt(pathInfo.substring(1).split("/")[0]);
                BufferedReader reader = request.getReader();
                JsonObject body = gson.fromJson(reader, JsonObject.class);
                int viewerId = body.get("viewerId").getAsInt();
                String viewerType = body.get("viewerType").getAsString();
                projectService.recordView(projectId, viewerId, viewerType);
                int count = projectService.getViewCount(projectId);
                vResp.addProperty("success", true);
                vResp.addProperty("views", count);
            } catch (Exception e) {
                vResp.addProperty("success", false);
                vResp.addProperty("message", "Error recording view: " + e.getMessage());
            }
            vOut.print(gson.toJson(vResp));
            vOut.flush();
            return;
        }
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            String contentType = request.getContentType();
            Project project = new Project();
            String filePath = null;
            
            if (contentType != null && contentType.contains("multipart/form-data")) {
                // Handle file upload
                project.setTitle(request.getParameter("title"));
                project.setDescription(request.getParameter("description"));
                project.setType(request.getParameter("type"));
                project.setStudentId(Integer.parseInt(request.getParameter("studentId")));
                project.setSupervisorId(Integer.parseInt(request.getParameter("supervisorId")));
                project.setKeywords(request.getParameter("keywords"));
                project.setYear(request.getParameter("year"));
                project.setSemester(request.getParameter("semester"));
                project.setDepartment(request.getParameter("department"));
                project.setSession(request.getParameter("session"));
                
                // Handle GitHub link
                String githubLink = request.getParameter("githubLink");
                if (githubLink != null && !githubLink.trim().isEmpty()) {
                    project.setGithubLink(githubLink.trim());
                }
                
                // Handle document file upload
                Part filePart = request.getPart("file");
                if (filePart != null && filePart.getSize() > 0) {
                    String fileName = getFileName(filePart);
                    
                    // Read file data for DB storage first
                    byte[] fileBytes;
                    try (java.io.InputStream is = filePart.getInputStream()) {
                        fileBytes = is.readAllBytes();
                    }
                    project.setFileName(fileName);
                    project.setFileData(fileBytes);
                    
                    // Also save to filesystem
                    String uploadPath = getServletContext().getRealPath("") + File.separator + UPLOAD_DIR;
                    
                    // Create upload directory if it doesn't exist
                    File uploadDir = new File(uploadPath);
                    if (!uploadDir.exists()) {
                        uploadDir.mkdir();
                    }
                    
                    // Generate unique filename
                    String uniqueFileName = System.currentTimeMillis() + "_" + fileName;
                    filePath = uploadPath + File.separator + uniqueFileName;
                    
                    // Write bytes to file
                    try (java.io.FileOutputStream fos = new java.io.FileOutputStream(filePath)) {
                        fos.write(fileBytes);
                    }
                    
                    project.setFilePath(UPLOAD_DIR + "/" + uniqueFileName);
                }
                
                // Handle zip file upload (stored on filesystem only, not in DB BLOB)
                Part zipPart = request.getPart("zipFile");
                if (zipPart != null && zipPart.getSize() > 0) {
                    String zipOrigName = getFileName(zipPart);
                    long zipSize = zipPart.getSize();
                    
                    String uploadPath = getServletContext().getRealPath("") + File.separator + UPLOAD_DIR;
                    File uploadDir = new File(uploadPath);
                    if (!uploadDir.exists()) {
                        uploadDir.mkdir();
                    }
                    
                    String uniqueZipName = System.currentTimeMillis() + "_" + zipOrigName;
                    String zipFullPath = uploadPath + File.separator + uniqueZipName;
                    
                    try (java.io.InputStream is = zipPart.getInputStream();
                         java.io.FileOutputStream fos = new java.io.FileOutputStream(zipFullPath)) {
                        is.transferTo(fos);
                    }
                    
                    project.setZipFilePath(UPLOAD_DIR + "/" + uniqueZipName);
                    project.setZipFileName(zipOrigName);
                    project.setZipFileSize(zipSize);
                }
            } else {
                // Handle JSON request
                BufferedReader reader = request.getReader();
                JsonObject requestData = gson.fromJson(reader, JsonObject.class);
                
                project.setTitle(requestData.get("title").getAsString());
                project.setDescription(requestData.has("description") ? requestData.get("description").getAsString() : "");
                project.setType(requestData.get("type").getAsString());
                project.setStudentId(requestData.get("studentId").getAsInt());
                project.setSupervisorId(requestData.get("supervisorId").getAsInt());
                project.setKeywords(requestData.has("keywords") ? requestData.get("keywords").getAsString() : "");
                project.setYear(requestData.get("year").getAsString());
                project.setSemester(requestData.has("semester") ? requestData.get("semester").getAsString() : "");
                project.setDepartment(requestData.get("department").getAsString());
                project.setSession(requestData.has("session") ? requestData.get("session").getAsString() : "");
                if (requestData.has("githubLink") && !requestData.get("githubLink").getAsString().isEmpty()) {
                    project.setGithubLink(requestData.get("githubLink").getAsString());
                }
            }
            
            boolean success = projectService.submitProject(project);
            
            if (success) {
                // Send notification to the assigned supervisor
                try {
                    int studentDbId = project.getStudentId();
                    Student student = studentService.getById(studentDbId);
                    String studentName = student != null ? student.getFullName() : "A student";
                    
                    // Get assigned supervisors for this student and de-duplicate by ID
                    java.util.List<Teacher> supervisors = assignmentService.getSupervisorsForStudent(studentDbId);
                    java.util.Set<Integer> notifiedSupervisorIds = new java.util.HashSet<>();
                    for (Teacher supervisor : supervisors) {
                        if (notifiedSupervisorIds.add(supervisor.getId())) {
                            notificationService.notifyProjectSubmission(
                                supervisor.getId(), studentDbId, studentName,
                                project.getId(), project.getTitle(),
                                project.getYear(), project.getSemester());
                        }
                    }
                    
                    // Also notify the specific supervisor selected in the form if not already notified
                    if (project.getSupervisorId() > 0 && !notifiedSupervisorIds.contains(project.getSupervisorId())) {
                        notificationService.notifyProjectSubmission(
                            project.getSupervisorId(), studentDbId, studentName,
                            project.getId(), project.getTitle(),
                            project.getYear(), project.getSemester());
                    }
                } catch (Exception ex) {
                    System.err.println("Warning: Failed to send notification: " + ex.getMessage());
                }
                
                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Project submitted successfully");
                jsonResponse.addProperty("projectId", project.getId());
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Failed to submit project");
            }
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
        }
        
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
    
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        String pathInfo = request.getPathInfo();
        JsonObject jsonResponse = new JsonObject();
        
        try {
            if (pathInfo != null && pathInfo.length() > 1) {
                String[] pathParts = pathInfo.substring(1).split("/");
                int projectId = Integer.parseInt(pathParts[0]);
                
                BufferedReader reader = request.getReader();
                JsonObject requestData = gson.fromJson(reader, JsonObject.class);
                
                if (pathParts.length > 1) {
                    // Handle status updates: /api/projects/{id}/approve or /api/projects/{id}/reject
                    String action = pathParts[1];
                    boolean success = false;
                    
                    // Get project details before updating for notification
                    Project projectForNotify = projectService.getById(projectId);
                    
                    if ("approve".equals(action)) {
                        success = projectService.approveProject(projectId);
                        if (success && projectForNotify != null) {
                            try {
                                int supervisorId = requestData != null && requestData.has("supervisorId") 
                                    ? requestData.get("supervisorId").getAsInt() 
                                    : projectForNotify.getSupervisorId();
                                Teacher supervisor = teacherService.getById(supervisorId);
                                String supervisorName = supervisor != null ? supervisor.getFullName() : "Your supervisor";
                                notificationService.notifyProjectApproved(
                                    projectForNotify.getStudentId(), supervisorId, supervisorName,
                                    projectId, projectForNotify.getTitle(),
                                    projectForNotify.getYear(), projectForNotify.getSemester());
                            } catch (Exception ex) {
                                System.err.println("Warning: Failed to send approval notification: " + ex.getMessage());
                            }
                        }
                    } else if ("reject".equals(action)) {
                        success = projectService.rejectProject(projectId);
                        if (success && projectForNotify != null) {
                            try {
                                int supervisorId = requestData != null && requestData.has("supervisorId")
                                    ? requestData.get("supervisorId").getAsInt()
                                    : projectForNotify.getSupervisorId();
                                Teacher supervisor = teacherService.getById(supervisorId);
                                String supervisorName = supervisor != null ? supervisor.getFullName() : "Your supervisor";
                                String reason = requestData != null && requestData.has("reason")
                                    ? requestData.get("reason").getAsString() : null;
                                notificationService.notifyProjectRejected(
                                    projectForNotify.getStudentId(), supervisorId, supervisorName,
                                    projectId, projectForNotify.getTitle(), reason,
                                    projectForNotify.getYear(), projectForNotify.getSemester());
                            } catch (Exception ex) {
                                System.err.println("Warning: Failed to send rejection notification: " + ex.getMessage());
                            }
                        }
                    } else if ("status".equals(action)) {
                        String status = requestData.get("status").getAsString();
                        success = projectService.updateStatus(projectId, status);
                    }
                    
                    if (success) {
                        jsonResponse.addProperty("success", true);
                        jsonResponse.addProperty("message", "Project updated successfully");
                    } else {
                        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        jsonResponse.addProperty("success", false);
                        jsonResponse.addProperty("message", "Failed to update project");
                    }
                } else {
                    // Update project details
                    Project project = projectService.getById(projectId);
                    if (project != null) {
                        if (requestData.has("title")) project.setTitle(requestData.get("title").getAsString());
                        if (requestData.has("description")) project.setDescription(requestData.get("description").getAsString());
                        if (requestData.has("type")) project.setType(requestData.get("type").getAsString());
                        if (requestData.has("keywords")) project.setKeywords(requestData.get("keywords").getAsString());
                        
                        boolean success = projectService.updateProject(project);
                        
                        if (success) {
                            jsonResponse.addProperty("success", true);
                            jsonResponse.addProperty("message", "Project updated successfully");
                        } else {
                            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                            jsonResponse.addProperty("success", false);
                            jsonResponse.addProperty("message", "Failed to update project");
                        }
                    } else {
                        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        jsonResponse.addProperty("success", false);
                        jsonResponse.addProperty("message", "Project not found");
                    }
                }
            }
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
        }
        
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
    
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        String pathInfo = request.getPathInfo();
        JsonObject jsonResponse = new JsonObject();
        
        try {
            if (pathInfo != null && pathInfo.length() > 1) {
                int projectId = Integer.parseInt(pathInfo.substring(1));
                String basePath = getServletContext().getRealPath("");
                boolean success = projectService.deleteProject(projectId, basePath);
                
                if (success) {
                    jsonResponse.addProperty("success", true);
                    jsonResponse.addProperty("message", "Project deleted successfully");
                } else {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    jsonResponse.addProperty("success", false);
                    jsonResponse.addProperty("message", "Failed to delete project");
                }
            }
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
        }
        
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
    
    private String getFileName(Part part) {
        String contentDisposition = part.getHeader("content-disposition");
        for (String token : contentDisposition.split(";")) {
            if (token.trim().startsWith("filename")) {
                return token.substring(token.indexOf("=") + 2, token.length() - 1);
            }
        }
        return "unknown";
    }
    
    /**
     * Enrich a list of projects with student and supervisor names and view counts
     */
    private void enrichProjects(List<Project> projects) {
        for (Project project : projects) {
            enrichProject(project);
        }
        projectService.populateViewCounts(projects);
    }
    
    /**
     * Enrich a single project with student and supervisor names and view count
     */
    private void enrichProject(Project project) {
        try {
            Student student = studentService.getById(project.getStudentId());
            if (student != null) {
                project.setStudentName(student.getFullName());
                project.setDegreeType(student.getSemester()); // For Student, semester is the degree type (e.g. bscengg)
            }
            Teacher teacher = teacherService.getById(project.getSupervisorId());
            if (teacher != null) {
                project.setSupervisorName(teacher.getFullName());
            }
            project.setViews(projectService.getViewCount(project.getId()));
        } catch (Exception e) {
            // Ignore enrichment errors
        }
    }
}
