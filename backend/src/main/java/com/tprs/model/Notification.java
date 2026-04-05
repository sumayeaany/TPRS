package com.tprs.model;

import java.sql.Timestamp;

/**
 * Notification Model - Represents a notification entity
 */
public class Notification {
    
    private int id;
    private int recipientId;
    private String recipientType; // student or teacher
    private int senderId;
    private String senderType; // student or teacher
    private String type; // project_submitted, project_approved, project_rejected, assignment, general
    private String title;
    private String message;
    private Integer projectId;
    private boolean isRead;
    private Timestamp createdAt;
    
    // Extra fields for display (not stored in DB)
    private String senderName;
    private String projectTitle;
    
    // Default constructor
    public Notification() {}
    
    // Parameterized constructor
    public Notification(int recipientId, String recipientType, int senderId, String senderType,
                        String type, String title, String message, Integer projectId) {
        this.recipientId = recipientId;
        this.recipientType = recipientType;
        this.senderId = senderId;
        this.senderType = senderType;
        this.type = type;
        this.title = title;
        this.message = message;
        this.projectId = projectId;
        this.isRead = false;
    }
    
    // Getters and Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    
    public int getRecipientId() { return recipientId; }
    public void setRecipientId(int recipientId) { this.recipientId = recipientId; }
    
    public String getRecipientType() { return recipientType; }
    public void setRecipientType(String recipientType) { this.recipientType = recipientType; }
    
    public int getSenderId() { return senderId; }
    public void setSenderId(int senderId) { this.senderId = senderId; }
    
    public String getSenderType() { return senderType; }
    public void setSenderType(String senderType) { this.senderType = senderType; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Integer getProjectId() { return projectId; }
    public void setProjectId(Integer projectId) { this.projectId = projectId; }
    
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
    
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    
    public String getProjectTitle() { return projectTitle; }
    public void setProjectTitle(String projectTitle) { this.projectTitle = projectTitle; }
    
    @Override
    public String toString() {
        return "Notification{" +
                "id=" + id +
                ", type='" + type + '\'' +
                ", title='" + title + '\'' +
                ", isRead=" + isRead +
                '}';
    }
}
