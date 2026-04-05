package com.tprs.dao;

import com.tprs.config.DatabaseConfig;

import java.sql.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ProjectViewDAO {

    private Connection getConnection() {
        return DatabaseConfig.getConnection();
    }

    /**
     * Record a unique view. INSERT IGNORE respects the UNIQUE constraint,
     * so duplicate (project_id, viewer_id, viewer_type) rows are silently skipped.
     */
    public boolean recordView(int projectId, int viewerId, String viewerType) {
        String sql = "INSERT IGNORE INTO project_view (project_id, viewer_id, viewer_type) VALUES (?, ?, ?)";
        Connection connection = getConnection();
        if (connection == null) return false;

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, projectId);
            stmt.setInt(2, viewerId);
            stmt.setString(3, viewerType);
            stmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("Error recording project view: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    /**
     * Get the unique view count for a single project.
     */
    public int getViewCount(int projectId) {
        String sql = "SELECT COUNT(*) FROM project_view WHERE project_id = ?";
        Connection connection = getConnection();
        if (connection == null) return 0;

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, projectId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.err.println("Error getting view count: " + e.getMessage());
            e.printStackTrace();
        }
        return 0;
    }

    /**
     * Get view counts for a batch of project IDs in one query.
     * Returns a map of projectId → viewCount.
     */
    public Map<Integer, Integer> getViewCounts(List<Integer> projectIds) {
        Map<Integer, Integer> counts = new HashMap<>();
        if (projectIds == null || projectIds.isEmpty()) return counts;

        StringBuilder sb = new StringBuilder("SELECT project_id, COUNT(*) AS cnt FROM project_view WHERE project_id IN (");
        for (int i = 0; i < projectIds.size(); i++) {
            sb.append(i > 0 ? ",?" : "?");
        }
        sb.append(") GROUP BY project_id");

        Connection connection = getConnection();
        if (connection == null) return counts;

        try (PreparedStatement stmt = connection.prepareStatement(sb.toString())) {
            for (int i = 0; i < projectIds.size(); i++) {
                stmt.setInt(i + 1, projectIds.get(i));
            }
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                counts.put(rs.getInt("project_id"), rs.getInt("cnt"));
            }
        } catch (SQLException e) {
            System.err.println("Error getting batch view counts: " + e.getMessage());
            e.printStackTrace();
        }
        return counts;
    }
}
