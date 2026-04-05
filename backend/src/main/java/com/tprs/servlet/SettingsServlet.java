package com.tprs.servlet;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.util.Properties;

@WebServlet("/api/settings")
public class SettingsServlet extends HttpServlet {

    private Gson gson;
    private File settingsFile;

    @Override
    public void init() throws ServletException {
        gson = new Gson();
        // The file is placed inside the resources folder
        settingsFile = new File("/var/www/html/TPRS/backend/src/main/resources/settings.json");
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        if (!settingsFile.exists()) {
            JsonObject error = new JsonObject();
            error.addProperty("success", false);
            error.addProperty("message", "Settings file not found");
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            out.print(gson.toJson(error));
            return;
        }

        try (Reader reader = new FileReader(settingsFile)) {
            JsonObject settings = JsonParser.parseReader(reader).getAsJsonObject();
            out.print(gson.toJson(settings));
        } catch (Exception e) {
            JsonObject error = new JsonObject();
            error.addProperty("success", false);
            error.addProperty("message", "Error reading settings: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.print(gson.toJson(error));
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        JsonObject jsonResponse = new JsonObject();

        try {
            // Need simple auth logic for admin update here (to be secure, we should verify the admin token or session)
            
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = request.getReader();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            
            JsonObject newSettings = JsonParser.parseString(sb.toString()).getAsJsonObject();
            
            // Save to file
            try (Writer writer = new FileWriter(settingsFile)) {
                gson.toJson(newSettings, writer);
            }
            
            jsonResponse.addProperty("success", true);
            jsonResponse.addProperty("message", "Settings updated successfully");
            out.print(gson.toJson(jsonResponse));
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            jsonResponse.addProperty("success", false);
            jsonResponse.addProperty("message", "Error saving settings: " + e.getMessage());
            out.print(gson.toJson(jsonResponse));
        }
    }
}
