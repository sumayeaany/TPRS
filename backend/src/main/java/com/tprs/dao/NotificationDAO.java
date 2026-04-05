package com.tprs.dao;

import com.tprs.config.DatabaseConfig;
import com.tprs.model.Notification;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Notification Data Access Object (DAO)
 * Handles all database operations for Notification entity
 */
public class NotificationDAO {
    
    private Connection getConnection() {
        return DatabaseConfig.getConnection();
    }
    
    /**
     * Create a new notification
     */
    public boolean create(Notification notification) {
        String sql = "INSERT INTO notification (recipient_id, recipient_type, sender_id, sender_type, type, title, message, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        Connection connection = getConnection();
        
        if (connection == null) return false;
        
        try (PreparedStatement stmt = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, notification.getRecipientId());
            stmt.setString(2, notification.getRecipientType());
            stmt.setInt(3, notification.getSenderId());
            stmt.setString(4, notification.getSenderType());
            stmt.setString(5, notification.getType());
            stmt.setString(6, notification.getTitle());
            stmt.setString(7, notification.getMessage());
            if (notification.getProjectId() != null) {
                stmt.setInt(8, notification.getProjectId());
            } else {
                stmt.setNull(8, Types.INTEGER);
            }
            
            int rowsAffected = stmt.executeUpdate();
            if (rowsAffected > 0) {
                ResultSet generatedKeys = stmt.getGeneratedKeys();
                if (generatedKeys.next()) {
                    notification.setId(generatedKeys.getInt(1));
                }
                return true;
            }
        } catch (SQLException e) {
            System.err.println("Error creating notification: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Get notifications for a user
     */
    public List<Notification> getByRecipient(int recipientId, String recipientType) {
        List<Notification> notifications = new ArrayList<>();
        String sql = "SELECT n.*, " +
                     "CASE WHEN n.sender_type = 'student' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM student WHERE id = n.sender_id) " +
                     "     WHEN n.sender_type = 'teacher' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM teacher WHERE id = n.sender_id) " +
                     "     ELSE 'System' END AS sender_name, " +
                     "COALESCE((SELECT title FROM project WHERE id = n.project_id), '') AS project_title " +
                     "FROM notification n " +
                     "WHERE n.recipient_id = ? AND n.recipient_type = ? " +
                     "ORDER BY n.created_at DESC";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, recipientId);
            stmt.setString(2, recipientType);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                Notification n = mapResultSetToNotification(rs);
                n.setSenderName(rs.getString("sender_name"));
                n.setProjectTitle(rs.getString("project_title"));
                notifications.add(n);
            }
        } catch (SQLException e) {
            System.err.println("Error getting notifications: " + e.getMessage());
            e.printStackTrace();
        }
        return notifications;
    }
    
    /**
     * Get unread notification count
     */
    public int getUnreadCount(int recipientId, String recipientType) {
        String sql = "SELECT COUNT(*) AS unread_count FROM notification WHERE recipient_id = ? AND recipient_type = ? AND is_read = FALSE";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, recipientId);
            stmt.setString(2, recipientType);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return rs.getInt("unread_count");
            }
        } catch (SQLException e) {
            System.err.println("Error getting unread count: " + e.getMessage());
            e.printStackTrace();
        }
        return 0;
    }
    
    /**
     * Mark notification as read
     */
    public boolean markAsRead(int id) {
        String sql = "UPDATE notification SET is_read = TRUE WHERE id = ?";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, id);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error marking notification as read: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Mark all notifications as read for a user
     */
    public boolean markAllAsRead(int recipientId, String recipientType) {
        String sql = "UPDATE notification SET is_read = TRUE WHERE recipient_id = ? AND recipient_type = ? AND is_read = FALSE";
        Connection connection = getConnection();
        
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, recipientId);
            stmt.setString(2, recipientType);
            return stmt.executeUpdate() >= 0;
        } catch (SQLException e) {
            System.err.println("Error marking all notifications as read: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }
    
    /**
     * Map ResultSet to Notification object
     */
    private Notification mapResultSetToNotification(ResultSet rs) throws SQLException {
        Notification notification = new Notification();
        notification.setId(rs.getInt("id"));
        notification.setRecipientId(rs.getInt("recipient_id"));
        notification.setRecipientType(rs.getString("recipient_type"));
        notification.setSenderId(rs.getInt("sender_id"));
        notification.setSenderType(rs.getString("sender_type"));
        notification.setType(rs.getString("type"));
        notification.setTitle(rs.getString("title"));
        notification.setMessage(rs.getString("message"));
        int projectId = rs.getInt("project_id");
        notification.setProjectId(rs.wasNull() ? null : projectId);
        notification.setRead(rs.getBoolean("is_read"));
        notification.setCreatedAt(rs.getTimestamp("created_at"));
        return notification;
    }
}
