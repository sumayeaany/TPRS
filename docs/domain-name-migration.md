# Domain Name & SSL Migration Guide

If you need to change the public domain name of your TPRS application (e.g., from `olddomain.com` to `newdomain.com`) and secure it using SSL via Certbot, follow these steps meticulously.

## 1. DNS Configuration
Before making any changes to the server, ensure your new domain name correctly points to your server's public IP address.
- Create an **A record** pointing `@` to your server IP.
- Create a **CNAME** or **A record** pointing `www` to your server IP.
Wait a few minutes for DNS propagation before attempting Certbot.

---

## 2. Update the Web Server Configuration
You must update your web server (Nginx or Apache) to listen for requests under the new domain name.

**For Nginx:**
Edit your site configuration file (usually in `/etc/nginx/sites-available/your-site.conf`):
```nginx
server {
    listen 80;
    server_name newdomain.com www.newdomain.com;
    
    # Existing web server root config...
    root /var/www/html/TPRS;
    
    # Existing proxy pass config...
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
    }
}
```
Test the configuration and restart Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**For Apache:**
Edit your virtual host file (usually in `/etc/apache2/sites-available/your-site.conf`):
```apache
<VirtualHost *:80>
    ServerName newdomain.com
    ServerAlias www.newdomain.com
    DocumentRoot /var/www/html/TPRS
</VirtualHost>
```
Test and reload:
```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 3. Provisioning SSL Certificates Using Certbot
Once the web server acknowledges the new domain name and DNS has propagated, use Certbot to automatically provision and install SSL certificates.

**For Nginx:**
```bash
sudo certbot --nginx -d newdomain.com -d www.newdomain.com
```

**For Apache:**
```bash
sudo certbot --apache -d newdomain.com -d www.newdomain.com
```

Certbot will prompt you to automatically redirect HTTP traffic to HTTPS. Always select **Yes** or **Redirect** to enforce secure connections.

---

## 4. Updating the Source Code Reference
Certain parts of your application architecture may have hardcoded references or security mechanisms tied to the domain name.

### Frontend API Client
If your `scripts/api.js` explicitly defines an absolute URL for `API_BASE_URL`, update it:
```javascript
// Change this:
const API_BASE_URL = 'https://olddomain.com/api';
// To this:
const API_BASE_URL = 'https://newdomain.com/api';
```
*(If the application uses a relative URL like `/api`, no changes are needed here.)*

### Backend CORS Configuration
Your Java backend may strictly enforce Cross-Origin Resource Sharing (CORS). Open your `CORSFilter.java` file and update the allowed origins.
```java
// Change allowed origins to match the new SSL domain
response.setHeader("Access-Control-Allow-Origin", "https://newdomain.com");
```
After making this change, rebuild and redeploy the `.war` payload.
```bash
cd backend
mvn clean package
sudo cp target/thesis-project-repository-system-1.0-SNAPSHOT.war /var/lib/tomcat9/webapps/api.war
```

### Firebase Authorized Domains
If your application uses Firebase Authentication (as it does via `firebase-config.js`), Firebase will physically block logins from unidentified domains.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the sidebar, go to **Build** > **Authentication**, then select the **Settings** tab.
4. Click **Authorized domains**.
5. Click **Add domain** and enter exactly: `newdomain.com` (and `www.newdomain.com` if applicable).

### Google Cloud API Key Restrictions (Security)
If you have properly restricted your public Firebase `apiKey` to prevent unauthorized misuse, you must whitelist the new domain.

1. Go to your [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Find the API key used in your frontend (`firebase-config.js`).
3. Under **Application restrictions**, ensure "Websites" is checked.
4. Add the following entries to the Website restrictions list:
   - `*newdomain.com/*`
   - `*.newdomain.com/*`
5. Save your changes (Note: Restrictions may take up to 5 minutes to propagate).