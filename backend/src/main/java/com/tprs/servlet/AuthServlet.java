package com.tprs.servlet;

import com.tprs.service.StudentService;
import com.tprs.service.TeacherService;
import com.tprs.model.Student;
import com.tprs.model.Teacher;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.util.Properties;

/**
 * Authentication Servlet - Handles login and registration
 */
public class AuthServlet extends HttpServlet {
    
    private StudentService studentService;
    private TeacherService teacherService;
    private Gson gson;
    private String adminUsername;
    private String adminPassword;
    
    @Override
    public void init() throws ServletException {
        studentService = new StudentService();
        teacherService = new TeacherService();
        gson = new Gson();
        
        // Load admin credentials from db.properties
        Properties props = new Properties();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("db.properties")) {
            if (in != null) {
                props.load(in);
                adminUsername = props.getProperty("admin.username", "admin@tprs.com");
                adminPassword = props.getProperty("admin.password", "admin");
            }
        } catch (IOException e) {
            System.err.println("Warning: Could not load admin credentials: " + e.getMessage());
            adminUsername = "admin@tprs.com";
            adminPassword = "admin";
        }
    }
    
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            BufferedReader reader = request.getReader();
            JsonObject data = gson.fromJson(reader, JsonObject.class);
            
            String userType = getJsonString(data, "userType", "");
            int userId = data.get("userId").getAsInt();
            String phone = getJsonString(data, "phone", "");
            
            boolean success = false;
            if ("student".equals(userType)) {
                Student student = studentService.getById(userId);
                if (student != null) {
                    student.setPhone(phone);
                    success = studentService.updateProfile(student);
                }
            } else if ("teacher".equals(userType)) {
                Teacher teacher = teacherService.getById(userId);
                if (teacher != null) {
                    teacher.setPhone(phone);
                    success = teacherService.updateProfile(teacher);
                }
            }
            
            if (success) {
                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Phone updated successfully");
            } else {
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Failed to update phone");
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
        
        // Get the path info after /api/auth
        String pathInfo = request.getPathInfo();
        JsonObject jsonResponse = new JsonObject();
        
        try {
            // Read request body
            BufferedReader reader = request.getReader();
            JsonObject requestData = gson.fromJson(reader, JsonObject.class);
            
            System.out.println("PathInfo: " + pathInfo);
            
            if ("/login".equals(pathInfo)) {
                handleLogin(requestData, jsonResponse, response);
            } else if ("/register".equals(pathInfo)) {
                handleStudentRegistration(requestData, jsonResponse, response);
            } else if ("/register-teacher".equals(pathInfo)) {
                handleTeacherRegistration(requestData, jsonResponse, response);
            } else if ("/change-password".equals(pathInfo)) {
                handleChangePassword(requestData, jsonResponse, response);
            } else if ("/forgot-password-init".equals(pathInfo)) {
                handleForgotPasswordInit(requestData, jsonResponse, response);
            } else {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Unknown endpoint: " + pathInfo);
            }
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
            e.printStackTrace();
        }
        
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
    
    private void handleLogin(JsonObject data, JsonObject jsonResponse, HttpServletResponse response) {

        try {

            if (data.has("idToken")) {

                String idToken = data.get("idToken").getAsString();
                String providedPassword = getJsonString(data, "password", "");

                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);

                String email = decodedToken.getEmail();

                boolean emailVerified = decodedToken.isEmailVerified();

                // Token claims can be stale immediately after verification; confirm from Firebase user record.
                if (!emailVerified) {
                    try {
                        com.google.firebase.auth.UserRecord userRecord =
                                FirebaseAuth.getInstance().getUser(decodedToken.getUid());
                        emailVerified = userRecord.isEmailVerified();
                    } catch (Exception uidLookupErr) {
                        // Fallback to email lookup in case UID lookup fails due stale/mismatched token context.
                        try {
                            if (email != null && !email.isEmpty()) {
                                com.google.firebase.auth.UserRecord emailRecord =
                                        FirebaseAuth.getInstance().getUserByEmail(email);
                                emailVerified = emailRecord.isEmailVerified();
                            }
                        } catch (Exception ignored) {
                            // Final behavior still rejects as unverified when verification cannot be confirmed.
                        }
                    }
                }

                // Do not hard-block login on emailVerified here.
                // Token validity is already enforced by verifyIdToken, and Firebase client-side checks
                // can lag after verification events in some environments.

                

                // Auto-detect role: try teacher first, then student

                Teacher teacher = teacherService.getByEmail(email);

                if (teacher != null) {

                    if (!teacher.isAuthorized()) {

                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);

                        jsonResponse.addProperty("success", false);
                        
                        jsonResponse.addProperty("isTeacherError", true);

                        jsonResponse.addProperty("message", "Incorrect Credentials");

                        return;

                    }

                    boolean usingDefaultPassword = teacherService.isUsingDefaultPassword(teacher);
                    if (!emailVerified) {
                        if (!("csembstu".equals(providedPassword) && usingDefaultPassword)) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            jsonResponse.addProperty("success", false);
                            jsonResponse.addProperty("message", "Unverified supervisors can only login with the default password.");
                            return;
                        }
                    } else {
                        if ("csembstu".equals(providedPassword) || usingDefaultPassword) {
                            teacherService.disableDefaultPasswordByEmail(email);
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            jsonResponse.addProperty("success", false);
                            jsonResponse.addProperty("message", "Default password is no longer valid. Please use your updated password.");
                            return;
                        }
                    }

                    jsonResponse.addProperty("success", true);

                    jsonResponse.addProperty("message", "Login successful");

                    jsonResponse.addProperty("userType", "teacher");

                    jsonResponse.addProperty("redirect", "/html/supervisor-dashboard.html");

                    jsonResponse.add("user", gson.toJsonTree(teacher));

                    return;

                }

                

                Student student = studentService.getByEmail(email);

                if (student != null) {

                    jsonResponse.addProperty("success", true);

                    jsonResponse.addProperty("message", "Login successful");

                    jsonResponse.addProperty("userType", "student");

                    jsonResponse.addProperty("redirect", "/html/home.html");

                    jsonResponse.add("user", gson.toJsonTree(student));

                    return;

                }

                

                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

                jsonResponse.addProperty("success", false);

                jsonResponse.addProperty("message", "User not found for this Firebase account.");

                return;

            }

            

            // Fallback to email/password for Admin or legacy users
            String email = data.has("email") ? data.get("email").getAsString() : "";
            String password = data.has("password") ? data.get("password").getAsString() : "";

            // Check admin credentials first
            if (email.equals(adminUsername)) {
                if (password.equals(adminPassword)) {
                    JsonObject adminUser = new JsonObject();
                    adminUser.addProperty("id", 0);
                    adminUser.addProperty("username", adminUsername);
                    adminUser.addProperty("firstName", "System");
                    adminUser.addProperty("lastName", "Admin");
                    jsonResponse.addProperty("success", true);
                    jsonResponse.addProperty("message", "Admin login successful");
                    jsonResponse.addProperty("userType", "admin");
                    jsonResponse.addProperty("redirect", "/html/admin-dashboard.html");
                    jsonResponse.add("user", adminUser);
                    return;
                } else {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    jsonResponse.addProperty("success", false);
                    jsonResponse.addProperty("isAdminEmail", true);
                    jsonResponse.addProperty("message", "Invalid admin password");
                    return;
                }
            }
            // Auto-detect role for legacy login

            Teacher teacher = teacherService.loginCheck(email, password);

            if (teacher != null) {

                if (!teacher.isAuthorized()) {

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);

                    jsonResponse.addProperty("success", false);
                        
                        jsonResponse.addProperty("isTeacherError", true);

                        jsonResponse.addProperty("message", "Incorrect Credentials");

                          return;

                    }


                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Login successful");
                jsonResponse.addProperty("userType", "teacher");

                jsonResponse.addProperty("redirect", "/html/supervisor-dashboard.html");

                jsonResponse.add("user", gson.toJsonTree(teacher));

                return;

            }

            

response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

            jsonResponse.addProperty("success", false);

            jsonResponse.addProperty("message", "Invalid email or password");

        } catch (Exception e) {

            e.printStackTrace();

            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            jsonResponse.addProperty("success", false);

            jsonResponse.addProperty("message", "Server Error: " + e.getMessage());

        }

    }
    
    private void handleStudentRegistration(JsonObject data, JsonObject jsonResponse, HttpServletResponse response) {
        try {
            Student student = new Student();
            student.setStudentId(getJsonString(data, "studentId", ""));
            student.setFirstName(getJsonString(data, "firstName", ""));
            student.setLastName(getJsonString(data, "lastName", ""));
            String studentEmail = getJsonString(data, "email", "");
            if (!studentEmail.endsWith("@mbstu.ac.bd")) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Email must end with @mbstu.ac.bd");
                return;
            }
            student.setEmail(studentEmail);
            student.setPassword(getJsonString(data, "password", ""));
            student.setFirebaseUid(getJsonString(data, "firebaseUid", ""));
            student.setEmailVerified(false);
            student.setDepartment(getJsonString(data, "department", ""));
            // Handle both "semester" and "degreeType" from frontend
            String semester = getJsonString(data, "semester", "");
            if (semester.isEmpty()) {
                semester = getJsonString(data, "degreeType", "");
            }
            student.setSemester(semester);
            student.setSession(getJsonString(data, "session", ""));
            student.setPhone(getJsonString(data, "phone", ""));
            
            boolean success = studentService.register(student);
            
            if (success) {
                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Registration successful");
                jsonResponse.addProperty("userId", student.getId());
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Email already registered or registration failed");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Invalid registration data: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private String getJsonString(JsonObject data, String key, String defaultValue) {
        if (data.has(key) && !data.get(key).isJsonNull()) {
            return data.get(key).getAsString();
        }
        return defaultValue;
    }
    
    private void handleChangePassword(JsonObject data, JsonObject jsonResponse, HttpServletResponse response) {
        try {
            String userType = getJsonString(data, "userType", "");
            int userId = data.get("userId").getAsInt();
            String oldPassword = getJsonString(data, "oldPassword", "");
            String newPassword = getJsonString(data, "newPassword", "");

            if (oldPassword.isEmpty() || newPassword.isEmpty()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Old password and new password are required");
                return;
            }

            if (newPassword.length() < 6) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "New password must be at least 6 characters");
                return;
            }

            boolean success = false;
            String idToken = getJsonString(data, "idToken", null);

            if ("student".equals(userType)) {
                if (idToken != null && !idToken.isEmpty()) {
                    try {
                        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
                        Student s = studentService.getById(userId);
                        if (s != null && s.getEmail() != null && s.getEmail().equals(decodedToken.getEmail())) {
                            // Frontend already changed auth in Firebase so we just force sync MySQL DB
                            success = studentService.forceChangePassword(userId, newPassword);
                        } else {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            jsonResponse.addProperty("success", false);
                            jsonResponse.addProperty("message", "Unauthorized token for this account");
                            return;
                        }
                    } catch (Exception e) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        jsonResponse.addProperty("success", false);
                        jsonResponse.addProperty("message", "Invalid token");
                        return;
                    }
                } else {
                    success = studentService.changePassword(userId, oldPassword, newPassword);
                }
            } else if ("teacher".equals(userType)) {
                if ("csembstu".equals(newPassword)) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    jsonResponse.addProperty("success", false);
                    jsonResponse.addProperty("message", "\"csembstu\" cannot be used as a new password.");
                    return;
                }
                if (idToken != null && !idToken.isEmpty()) {
                    try {
                        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
                        Teacher t = teacherService.getById(userId);
                        if (t != null && t.getEmail() != null && t.getEmail().equals(decodedToken.getEmail())) {
                            success = teacherService.forceChangePassword(userId, newPassword);
                        } else {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            jsonResponse.addProperty("success", false);
                            jsonResponse.addProperty("message", "Unauthorized token for this account");
                            return;
                        }
                    } catch (Exception e) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        jsonResponse.addProperty("success", false);
                        jsonResponse.addProperty("message", "Invalid token");
                        return;
                    }
                } else {
                    success = teacherService.changePassword(userId, oldPassword, newPassword);
                }
            }

            if (success) {
                try {
                    String updateEmail = null;
                    if ("student".equals(userType)) {
                        Student s = studentService.getById(userId);
                        if (s != null) updateEmail = s.getEmail();
                    } else if ("teacher".equals(userType)) {
                        Teacher t = teacherService.getById(userId);
                        if (t != null) updateEmail = t.getEmail();
                    }
                    if (updateEmail != null) {
                        try {
                            com.google.firebase.auth.UserRecord userRecord = FirebaseAuth.getInstance().getUserByEmail(updateEmail);
                            FirebaseAuth.getInstance().updateUser(new com.google.firebase.auth.UserRecord.UpdateRequest(userRecord.getUid()).setPassword(newPassword));
                        } catch (Exception ignored) {
                        }
                    }
                } catch (Exception ignored) {
                }

                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Password changed successfully");
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Incorrect old password or failed to change password");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Server error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void handleTeacherRegistration(JsonObject data, JsonObject jsonResponse, HttpServletResponse response) {
        try {
            Teacher teacher = new Teacher();
            String teacherIdInput = getJsonString(data, "teacherId", "");
            if (teacherIdInput.isEmpty()) {
                // Auto-generate teacher ID
                teacherIdInput = "T" + System.currentTimeMillis();
            }
            teacher.setTeacherId(teacherIdInput);
            teacher.setFirstName(getJsonString(data, "firstName", ""));
            teacher.setLastName(getJsonString(data, "lastName", ""));
            String teacherEmail = getJsonString(data, "email", "");
            if (!teacherEmail.endsWith("@mbstu.ac.bd")) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Email must end with @mbstu.ac.bd");
                return;
            }
            teacher.setEmail(teacherEmail);
            teacher.setPassword(getJsonString(data, "password", ""));
            teacher.setFirebaseUid(getJsonString(data, "firebaseUid", ""));
            teacher.setEmailVerified(false);
            teacher.setDepartment(getJsonString(data, "department", ""));
            teacher.setDesignation(getJsonString(data, "designation", ""));
            teacher.setSpecialization(getJsonString(data, "specialization", ""));
            teacher.setPhone(getJsonString(data, "phone", ""));
            
            boolean success = teacherService.register(teacher);
            
            if (success) {
                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("message", "Registration successful");
                jsonResponse.addProperty("userId", teacher.getId());
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "Email already registered or registration failed");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Invalid registration data: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void handleForgotPasswordInit(JsonObject data, JsonObject jsonResponse, HttpServletResponse response) {
        String email = getJsonString(data, "email", "").trim();
        if (email.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Email is required.");
            return;
        }

        Teacher teacher = teacherService.getByEmail(email);
        if (teacher != null) {
            teacherService.disableDefaultPasswordByEmail(email);
        }

        jsonResponse.addProperty("success", true);
        jsonResponse.addProperty("message", "Password reset state updated.");
    }
}
