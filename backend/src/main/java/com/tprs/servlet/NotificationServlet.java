package com.tprs.servlet;

import com.tprs.service.NotificationService;
import com.tprs.model.Notification;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializer;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.List;

/**
 * Notification Servlet - Handles notification CRUD operations
 */
public class NotificationServlet extends HttpServlet {
    
    private NotificationService notificationService;
    private Gson gson;
    
    @Override
    public void init() throws ServletException {
        notificationService = new NotificationService();
        gson = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ")
            .registerTypeAdapter(Timestamp.class, (JsonSerializer<Timestamp>) (src, typeOfSrc, context) ->
                new JsonPrimitive(new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ").format(src)))
            .create();
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            String userId = request.getParameter("userId");
            String userType = request.getParameter("userType");
            String pathInfo = request.getPathInfo();
            
            if (userId == null || userType == null) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                jsonResponse.addProperty("success", false);
                jsonResponse.addProperty("message", "userId and userType are required");
            } else if (pathInfo != null && "/count".equals(pathInfo)) {
                // Get unread count
                int count = notificationService.getUnreadCount(Integer.parseInt(userId), userType);
                jsonResponse.addProperty("success", true);
                jsonResponse.addProperty("unreadCount", count);
            } else {
                // Get all notifications
                List<Notification> notifications = notificationService.getNotifications(
                        Integer.parseInt(userId), userType);
                jsonResponse.addProperty("success", true);
                jsonResponse.add("notifications", gson.toJsonTree(notifications));
                jsonResponse.addProperty("count", notifications.size());
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
            Notification notification = gson.fromJson(reader, Notification.class);
            
            boolean success = notificationService.createNotification(notification);
            jsonResponse.addProperty("success", success);
            jsonResponse.addProperty("message", success ? "Notification created" : "Failed to create notification");
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
        
        JsonObject jsonResponse = new JsonObject();
        
        try {
            String pathInfo = request.getPathInfo();
            
            if (pathInfo != null && "/read-all".equals(pathInfo)) {
                // Mark all as read
                BufferedReader reader = request.getReader();
                JsonObject data = gson.fromJson(reader, JsonObject.class);
                int userId = data.get("userId").getAsInt();
                String userType = data.get("userType").getAsString();
                
                boolean success = notificationService.markAllAsRead(userId, userType);
                jsonResponse.addProperty("success", success);
                jsonResponse.addProperty("message", success ? "All notifications marked as read" : "Failed to update");
            } else if (pathInfo != null && pathInfo.length() > 1) {
                // Mark single notification as read: /api/notifications/{id}
                int notificationId = Integer.parseInt(pathInfo.substring(1));
                boolean success = notificationService.markAsRead(notificationId);
                jsonResponse.addProperty("success", success);
                jsonResponse.addProperty("message", success ? "Notification marked as read" : "Failed to update");
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
