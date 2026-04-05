package com.tprs.servlet;

import com.tprs.service.SupervisorStudentService;
import com.tprs.service.NotificationService;
import com.tprs.service.TeacherService;
import com.tprs.model.Student;
import com.tprs.model.Teacher;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

/**
 * Supervisor Assignment Servlet - Handles supervisor-student assignment operations
 */
public class SupervisorAssignmentServlet extends HttpServlet {
    
    private SupervisorStudentService assignmentService;
    private NotificationService notificationService;
    private TeacherService teacherService;
    private Gson gson;
    
    @Override
    public void init() throws ServletException {
        assignmentService = new SupervisorStudentService();
        notificationService = new NotificationService();
        teacherService = new TeacherService();
        gson = new Gson();
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            String pathInfo = request.getPathInfo();
            String supervisorId = request.getParameter("supervisorId");
            String studentId = request.getParameter("studentId");
            
            if (pathInfo != null && "/unassigned".equals(pathInfo)) {
                // Get students not yet assigned to this supervisor
                if (supervisorId != null) {
                    List<Student> students = assignmentService.getUnassignedStudents(Integer.parseInt(supervisorId));
                    jsonResponse.addProperty("success", true);
                    jsonResponse.add("students", gson.toJsonTree(students));
                } else {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    jsonResponse.addProperty("success", false);
                    jsonResponse.addProperty("message", "supervisorId is required");
                }
            } else if (pathInfo != null && "/by-supervisor".equals(pathInfo)) {
                // Get assigned students for a supervisor
                if (supervisorId != null) {
                    List<Student> students = assignmentService.getAssignedStudents(Integer.parseInt(supervisorId));
                    jsonResponse.addProperty("success", true);
                    jsonResponse.add("students", gson.toJsonTree(students));
                    jsonResponse.addProperty("count", students.size());
                } else {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    jsonResponse.addProperty("success", false);
                    jsonResponse.addProperty("message", "supervisorId is required");
                }
            } else if (pathInfo != null && "/by-student".equals(pathInfo)) {
                // Get supervisors for a student
                if (studentId != null) {
                    String year = request.getParameter("year");
                    String semester = request.getParameter("semester");
                    List<Teacher> supervisors;
                    if (year != null && semester != null) {
                        supervisors = assignmentService.getSupervisorsForStudent(Integer.parseInt(studentId), year, semester);
                    } else {
                        supervisors = assignmentService.getSupervisorsForStudent(Integer.parseInt(studentId));
                    }
                    jsonResponse.addProperty("success", true);
                    jsonResponse.add("supervisors", gson.toJsonTree(supervisors));
                } else {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    jsonResponse.addProperty("success", false);
                    jsonResponse.addProperty("message", "studentId is required");
                }
            } else if (pathInfo != null && "/approved".equals(pathInfo)) {
                // Get all admin-approved supervisors
                List<Teacher> teachers = teacherService.getAllTeachers();
                JsonArray approvedSupervisors = new JsonArray();

                for (Teacher teacher : teachers) {
                    if (teacher != null && teacher.isAuthorized()) {
                        JsonObject safeTeacher = new JsonObject();
                        safeTeacher.addProperty("id", teacher.getId());
                        safeTeacher.addProperty("firstName", teacher.getFirstName());
                        safeTeacher.addProperty("lastName", teacher.getLastName());
                        safeTeacher.addProperty("fullName", teacher.getFullName());
                        safeTeacher.addProperty("department", teacher.getDepartment());
                        approvedSupervisors.add(safeTeacher);
                    }
                }

                jsonResponse.addProperty("success", true);
                jsonResponse.add("supervisors", approvedSupervisors);
                jsonResponse.addProperty("count", approvedSupervisors.size());
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
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            BufferedReader reader = request.getReader();
            JsonObject data = gson.fromJson(reader, JsonObject.class);
            
            int supId = data.get("supervisorId").getAsInt();
            int stuId = data.get("studentId").getAsInt();
            String year = data.has("year") && !data.get("year").isJsonNull() ? data.get("year").getAsString() : null;
            String semester = data.has("semester") && !data.get("semester").isJsonNull() ? data.get("semester").getAsString() : null;
            
            boolean success = assignmentService.assignStudent(supId, stuId, year, semester);
            
            if (success) {
                // Send notification to the student
                Teacher supervisor = teacherService.getById(supId);
                if (supervisor != null) {
                    notificationService.notifyAssignment(stuId, supId, supervisor.getFullName(), year, semester);
                }
                
                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Student assigned successfully");
            } else {
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Student already assigned or assignment failed");
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
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            String supervisorId = request.getParameter("supervisorId");
            String studentId = request.getParameter("studentId");
            String year = request.getParameter("year");
            String semester = request.getParameter("semester");
            
            if (supervisorId != null && studentId != null) {
                boolean success;
                if (year != null && !year.isEmpty() && semester != null && !semester.isEmpty()) {
                    success = assignmentService.unassignStudent(
                            Integer.parseInt(supervisorId), Integer.parseInt(studentId), year, semester);
                } else {
                    success = assignmentService.unassignStudent(
                            Integer.parseInt(supervisorId), Integer.parseInt(studentId));
                }
                
                jsonResponse.addProperty("success", success);
                jsonResponse.addProperty("message", success ? "Student removed successfully" : "Failed to remove student");
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "supervisorId and studentId are required");
            }
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
        }
        
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
}
