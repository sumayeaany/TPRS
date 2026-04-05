# Web Server Migration Guide

If you need to switch the web server hosting the TPRS application (e.g., moving from Jetty to Tomcat, or replacing an Apache frontend with Nginx), follow these steps to ensure the application continues to run smoothly.

## Architecture Overview
The TPRS application relies on two primary server components:
1. **Frontend Web Server**: Serves the static HTML, CSS, and JS files (e.g., Apache, Nginx, or an integrated Tomcat/Jetty handler).
2. **Backend Application Server**: A Java Servlet container (e.g., Tomcat, Jetty, GlassFish) that runs the `api.war` file.

---

## Migrating the Backend (Java App Server)

If you are switching from Jetty to Tomcat (or vice versa):

### 1. Build the Backend
First, ensure you have a fresh build of the backend application:
```bash
cd backend
mvn clean package
```
This generates a `.war` file in the `backend/target/` directory (e.g., `thesis-project-repository-system-1.0-SNAPSHOT.war`).

### 2. Deploy to the New Application Server
**For Tomcat:**
Copy the `.war` file to the Tomcat `webapps` directory. If you want the API to be accessible at `/api`, rename the file to `api.war`.
```bash
sudo cp target/thesis-project-repository-system-1.0-SNAPSHOT.war /var/lib/tomcat9/webapps/api.war
sudo systemctl restart tomcat9
```

**For Jetty (Standalone):**
Copy the `.war` file to the Jetty `webapps` directory.
```bash
sudo cp target/thesis-project-repository-system-1.0-SNAPSHOT.war /var/lib/jetty9/webapps/api.war
sudo systemctl restart jetty9
```

### 3. Verify Database Connections
Ensure that your new application server has access to the `db.properties` and `settings.json` files. If your new server runs under a different system user (e.g., `tomcat` instead of `root`), ensure that user has read permissions for any external configuration files or Firebase service account JSONs.

---

## Migrating the Frontend (Static Web Server)

If you decide to separate the frontend from the Java backend and serve the static files using a dedicated web server like Nginx or Apache:

### 1. Update the Web Server Document Root
Point your new web server's document root to the `html` folder, or the root of the `TPRS` directory depending on your routing setup.

**Nginx Example:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html/TPRS;
    index html/home.html;
}
```

**Apache Example:**
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/html/TPRS
    DirectoryIndex html/home.html
</VirtualHost>
```

### 2. Configure the Reverse Proxy for the API
Your frontend JavaScript files expect the backend API to be available on the same domain (or a specific configured domain) to avoid CORS issues. You must configure your new web server to proxy `/api` requests to your Java Application Server (which runs on port 8080 by default).

**Nginx Reverse Proxy:**
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Apache Reverse Proxy:**
```apache
ProxyPass /api/ http://127.0.0.1:8080/api/
ProxyPassReverse /api/ http://127.0.0.1:8080/api/
```

### 3. Restart the Web Server
Restart your new web server to apply the changes:
```bash
sudo systemctl restart nginx
# OR
sudo systemctl restart apache2
```

### 4. Verify the Frontend API Configuration
Check `scripts/api.js` in the frontend code. Ensure that the `API_BASE_URL` correctly points to the path or absolute URL where your new proxy is routing traffic.