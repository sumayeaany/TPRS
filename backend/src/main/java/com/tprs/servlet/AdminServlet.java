package com.tprs.servlet;

import com.tprs.service.NotificationService;
import com.tprs.service.ProjectService;
import com.tprs.service.StudentService;
import com.tprs.service.SupervisorStudentService;
import com.tprs.service.TeacherService;
import com.tprs.model.Project;
import com.tprs.model.Student;
import com.tprs.model.Teacher;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
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
 * Admin Servlet - Handles admin dashboard operations
 * GET  /api/admin/students          - list all students (or ?search=keyword)
 * GET  /api/admin/teachers          - list all teachers (or ?search=keyword)
 * GET  /api/admin/projects          - list all projects (or ?search=keyword)
 * GET  /api/admin/stats             - dashboard statistics
 * PUT  /api/admin/students/{id}     - update student data (except email)
 * PUT  /api/admin/teachers/{id}     - update teacher data (except email)
 * PUT  /api/admin/teachers/{id}/authorize   - authorize a supervisor
 * PUT  /api/admin/teachers/{id}/deauthorize - revoke authorization
 */
public class AdminServlet extends HttpServlet {

    private StudentService studentService;
    private TeacherService teacherService;
    private ProjectService projectService;
    private SupervisorStudentService assignmentService;
    private NotificationService notificationService;
    private Gson gson;

    @Override
    public void init() throws ServletException {
        studentService = new StudentService();
        teacherService = new TeacherService();
        projectService = new ProjectService();
        assignmentService = new SupervisorStudentService();
        notificationService = new NotificationService();
        gson = new Gson();
    }

    /* ============ helpers ============ */

    private void sendJson(HttpServletResponse response, JsonObject json) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        out.print(gson.toJson(json));
        out.flush();
    }

    /** Strip password from student JSON */
    private JsonElement safeStudent(Student s) {
        JsonObject o = (JsonObject) gson.toJsonTree(s);
        o.remove("password");
        return o;
    }

    /** Strip password from teacher JSON */
    private JsonElement safeTeacher(Teacher t) {
        JsonObject o = (JsonObject) gson.toJsonTree(t);
        o.remove("password");
        return o;
    }

    private String getJsonString(JsonObject data, String key, String def) {
        if (data.has(key) && !data.get(key).isJsonNull()) return data.get(key).getAsString();
        return def;
    }

    /* ============ GET ============ */

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String pathInfo = request.getPathInfo();
        JsonObject json = new JsonObject();

        try {
            if (pathInfo == null || "/".equals(pathInfo)) {
                json.addProperty("success", false);
                json.addProperty("message", "Specify a resource: students, teachers, projects, stats");
                sendJson(response, json);
                return;
            }

            String resource = pathInfo.substring(1).split("/")[0];

            switch (resource) {
                case "students": {
                    String search = request.getParameter("search");
                    List<Student> list = (search != null && !search.isEmpty())
                            ? studentService.searchStudents(search)
                            : studentService.getAllStudents();
                    JsonArray arr = new JsonArray();
                    for (Student s : list) arr.add(safeStudent(s));
                    json.addProperty("success", true);
                    json.add("students", arr);
                    json.addProperty("count", list.size());
                    break;
                }
                case "teachers": {
                    String search = request.getParameter("search");
                    List<Teacher> list = (search != null && !search.isEmpty())
                            ? teacherService.searchTeachers(search)
                            : teacherService.getAllTeachers();
                    JsonArray arr = new JsonArray();
                    for (Teacher t : list) arr.add(safeTeacher(t));
                    json.addProperty("success", true);
                    json.add("teachers", arr);
                    json.addProperty("count", list.size());
                    break;
                }
                case "projects": {
                    String search = request.getParameter("search");
                    List<Project> list = (search != null && !search.isEmpty())
                            ? projectService.searchProjects(search)
                            : projectService.getAllProjects();
                    // enrich with names
                    for (Project p : list) {
                        try {
                            Student st = studentService.getById(p.getStudentId());
                            if (st != null) p.setStudentName(st.getFullName());
                            Teacher te = teacherService.getById(p.getSupervisorId());
                            if (te != null) p.setSupervisorName(te.getFullName());
                        } catch (Exception ignored) {}
                    }
                    projectService.populateViewCounts(list);
                    json.addProperty("success", true);
                    json.add("projects", gson.toJsonTree(list));
                    json.addProperty("count", list.size());
                    break;
                }
                case "assignments": {
                    // GET /api/admin/assignments?supervisorId=X or list all
                    String supIdStr = request.getParameter("supervisorId");
                    if (supIdStr != null && !supIdStr.isEmpty()) {
                        int supId = Integer.parseInt(supIdStr);
                        List<Student> assigned = assignmentService.getAssignedStudents(supId);
                        JsonArray arr = new JsonArray();
                        for (Student s : assigned) arr.add(safeStudent(s));
                        json.addProperty("success", true);
                        json.add("students", arr);
                    } else {
                        json.addProperty("success", false);
                        json.addProperty("message", "supervisorId parameter required");
                    }
                    break;
                }
                case "allAssignments": {
                    java.util.List<java.util.Map<String, Object>> all = assignmentService.getAllAssignments();
                    JsonArray arr = new JsonArray();
                    for (java.util.Map<String, Object> row : all) {
                        JsonObject obj = new JsonObject();
                        for (java.util.Map.Entry<String, Object> e : row.entrySet()) {
                            if (e.getValue() instanceof Number) {
                                obj.addProperty(e.getKey(), (Number) e.getValue());
                            } else {
                                obj.addProperty(e.getKey(), String.valueOf(e.getValue()));
                            }
                        }
                        arr.add(obj);
                    }
                    json.addProperty("success", true);
                    json.add("assignments", arr);
                    json.addProperty("count", all.size());
                    break;
                }
                case "stats": {
                    int totalStudents = studentService.getAllStudents().size();
                    int totalTeachers = teacherService.getAllTeachers().size();
                    List<Project> allProjects = projectService.getAllProjects();
                    int totalProjects = allProjects.size();
                    long pendingTeachers = teacherService.getAllTeachers().stream()
                            .filter(t -> !t.isAuthorized()).count();
                    long approvedProjects = allProjects.stream()
                            .filter(p -> "approved".equals(p.getStatus())).count();
                    long pendingProjects = allProjects.stream()
                            .filter(p -> "pending".equals(p.getStatus())).count();

                    JsonObject stats = new JsonObject();
                    stats.addProperty("totalStudents", totalStudents);
                    stats.addProperty("totalTeachers", totalTeachers);
                    stats.addProperty("totalProjects", totalProjects);
                    stats.addProperty("pendingTeachers", pendingTeachers);
                    stats.addProperty("approvedProjects", approvedProjects);
                    stats.addProperty("pendingProjects", pendingProjects);
                    json.addProperty("success", true);
                    json.add("stats", stats);
                    break;
                }
                default:
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    json.addProperty("success", false);
                    json.addProperty("message", "Unknown resource: " + resource);
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            json.addProperty("success", false);
            json.addProperty("message", "Server error: " + e.getMessage());
        }

        sendJson(response, json);
    }

    /* ============ PUT ============ */

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String pathInfo = request.getPathInfo();
        JsonObject json = new JsonObject();

        try {
            if (pathInfo == null || pathInfo.length() < 2) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                json.addProperty("success", false);
                json.addProperty("message", "Invalid path");
                sendJson(response, json);
                return;
            }

            String[] parts = pathInfo.substring(1).split("/");
            String resource = parts[0];

            if ("teachers".equals(resource) && parts.length >= 2) {
                int id = Integer.parseInt(parts[1]);

                if (parts.length == 3 && "authorize".equals(parts[2])) {
                    boolean ok = teacherService.updateAuthorization(id, true);
                    json.addProperty("success", ok);
                    json.addProperty("message", ok ? "Supervisor authorized" : "Failed to authorize");
                    sendJson(response, json);
                    return;
                }
                if (parts.length == 3 && "deauthorize".equals(parts[2])) {
                    boolean ok = teacherService.updateAuthorization(id, false);
                    json.addProperty("success", ok);
                    json.addProperty("message", ok ? "Authorization revoked" : "Failed to revoke");
                    sendJson(response, json);
                    return;
                }

                // General teacher update (except email & password)
                BufferedReader reader = request.getReader();
                JsonObject data = gson.fromJson(reader, JsonObject.class);
                Teacher existing = teacherService.getById(id);
                if (existing == null) {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    json.addProperty("success", false);
                    json.addProperty("message", "Teacher not found");
                    sendJson(response, json);
                    return;
                }

                if (data.has("firstName")) existing.setFirstName(data.get("firstName").getAsString());
                if (data.has("lastName")) existing.setLastName(data.get("lastName").getAsString());
                if (data.has("department")) existing.setDepartment(data.get("department").getAsString());
                if (data.has("designation")) existing.setDesignation(data.get("designation").getAsString());
                if (data.has("specialization")) existing.setSpecialization(data.get("specialization").getAsString());
                if (data.has("phone")) existing.setPhone(data.get("phone").getAsString());
                if (data.has("teacherId")) existing.setTeacherId(data.get("teacherId").getAsString());
                if (data.has("isAuthorized")) existing.setAuthorized(data.get("isAuthorized").getAsBoolean());

                boolean ok = teacherService.adminUpdateTeacher(existing);
                json.addProperty("success", ok);
                json.addProperty("message", ok ? "Teacher updated" : "Failed to update teacher");

            } else if ("students".equals(resource) && parts.length >= 2) {
                int id = Integer.parseInt(parts[1]);

                BufferedReader reader = request.getReader();
                JsonObject data = gson.fromJson(reader, JsonObject.class);
                Student existing = studentService.getById(id);
                if (existing == null) {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    json.addProperty("success", false);
                    json.addProperty("message", "Student not found");
                    sendJson(response, json);
                    return;
                }

                if (data.has("firstName")) existing.setFirstName(data.get("firstName").getAsString());
                if (data.has("lastName")) existing.setLastName(data.get("lastName").getAsString());
                if (data.has("department")) existing.setDepartment(data.get("department").getAsString());
                if (data.has("semester")) existing.setSemester(data.get("semester").getAsString());
                if (data.has("session")) existing.setSession(data.get("session").getAsString());
                if (data.has("phone")) existing.setPhone(data.get("phone").getAsString());
                if (data.has("studentId")) existing.setStudentId(data.get("studentId").getAsString());

                boolean ok = studentService.adminUpdateStudent(existing);
                json.addProperty("success", ok);
                json.addProperty("message", ok ? "Student updated" : "Failed to update student");

            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                json.addProperty("success", false);
                json.addProperty("message", "Invalid resource or path");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            json.addProperty("success", false);
            json.addProperty("message", "Server error: " + e.getMessage());
        }

        sendJson(response, json);
    }

    /* ============ DELETE ============ */

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String pathInfo = request.getPathInfo();
        JsonObject json = new JsonObject();

        try {
            if (pathInfo == null || pathInfo.length() < 2) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                json.addProperty("success", false);
                json.addProperty("message", "Invalid path");
                sendJson(response, json);
                return;
            }

            String[] parts = pathInfo.substring(1).split("/");
            String resource = parts[0];

            if (parts.length < 2) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                json.addProperty("success", false);
                json.addProperty("message", "ID required");
                sendJson(response, json);
                return;
            }

            int id = Integer.parseInt(parts[1]);

            switch (resource) {
                case "students": {
                    boolean ok = studentService.deleteStudent(id);
                    json.addProperty("success", ok);
                    json.addProperty("message", ok ? "Student deleted" : "Failed to delete student");
                    break;
                }
                case "teachers": {
                    boolean ok = teacherService.deleteTeacher(id);
                    json.addProperty("success", ok);
                    json.addProperty("message", ok ? "Supervisor deleted" : "Failed to delete supervisor");
                    break;
                }
                case "projects": {
                    String basePath = getServletContext().getRealPath("");
                    boolean ok = projectService.deleteProject(id, basePath);
                    json.addProperty("success", ok);
                    json.addProperty("message", ok ? "Project deleted" : "Failed to delete project");
                    break;
                }
                case "assignments": {
                    boolean ok = assignmentService.deleteAssignment(id);
                    json.addProperty("success", ok);
                    json.addProperty("message", ok ? "Assignment deleted" : "Failed to delete assignment");
                    break;
                }
                default:
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    json.addProperty("success", false);
                    json.addProperty("message", "Unknown resource: " + resource);
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            json.addProperty("success", false);
            json.addProperty("message", "Server error: " + e.getMessage());
        }

        sendJson(response, json);
    }

    /* ============ POST (assignments) ============ */

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String pathInfo = request.getPathInfo();
        JsonObject json = new JsonObject();

        try {
            if (pathInfo != null && pathInfo.startsWith("/assignments")) {
                BufferedReader reader = request.getReader();
                JsonObject data = gson.fromJson(reader, JsonObject.class);
                int supervisorId = data.get("supervisorId").getAsInt();
                int studentId = data.get("studentId").getAsInt();
                String year = data.has("year") && !data.get("year").isJsonNull() ? data.get("year").getAsString() : null;
                String semester = data.has("semester") && !data.get("semester").isJsonNull() ? data.get("semester").getAsString() : null;

                boolean ok = assignmentService.assignStudent(supervisorId, studentId, year, semester);
                json.addProperty("success", ok);
                json.addProperty("message", ok ? "Student assigned to supervisor" : "Failed to assign (may already exist)");

                // Send notifications to both teacher and student
                if (ok) {
                    try {
                        Teacher supervisor = teacherService.getById(supervisorId);
                        Student student = studentService.getById(studentId);
                        if (supervisor != null && student != null) {
                            String supervisorName = supervisor.getFirstName() + " " + supervisor.getLastName();
                            String studentName = student.getFirstName() + " " + student.getLastName();
                            // Notify student about their assigned supervisor
                            notificationService.notifyAssignment(studentId, supervisorId, supervisorName, year, semester);
                            // Notify supervisor about their new student
                            com.tprs.model.Notification teacherNotif = new com.tprs.model.Notification();
                            teacherNotif.setRecipientId(supervisorId);
                            teacherNotif.setRecipientType("teacher");
                            teacherNotif.setSenderId(studentId);
                            teacherNotif.setSenderType("student");
                            teacherNotif.setType("assignment");
                            teacherNotif.setTitle("New Student Assigned");
                            String ctx = "";
                            if (year != null && !year.isEmpty()) ctx += year + " Year";
                            if (semester != null && !semester.isEmpty()) {
                                if (!ctx.isEmpty()) ctx += ", ";
                                ctx += semester + " Semester";
                            }
                            teacherNotif.setMessage(studentName + " has been assigned to you" + (ctx.isEmpty() ? "." : " (" + ctx + ")."));
                            notificationService.createNotification(teacherNotif);
                        }
                    } catch (Exception notifErr) {
                        System.err.println("Notification send failed: " + notifErr.getMessage());
                    }
                }
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                json.addProperty("success", false);
                json.addProperty("message", "Unknown action");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            json.addProperty("success", false);
            json.addProperty("message", "Server error: " + e.getMessage());
        }

        sendJson(response, json);
    }
}
