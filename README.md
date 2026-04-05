# 📚 TPRS — Thesis & Project Repository System

A comprehensive, full-stack web application designed to streamline the management of academic thesis submissions, project tracking, supervisor assignments, and automated approval workflows.

![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)
![Servlet](https://img.shields.io/badge/Servlet_API-4.0-green)
![Maven](https://img.shields.io/badge/Maven-3.9-C71A36?logo=apachemaven&logoColor=white)

---

## 📑 Table of Contents
- [Features](#-features)
- [Architecture & Technologies](#️-architecture--technologies)
- [Project Structure](#-project-structure)
- [Authentication Flow](#-authentication-flow)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)

---

## ✨ Features

### 🎓 Core Academic Workflows
- **Student Portal**: Secure registration, project/thesis submission with robust file uploads (up to 50MB), and real-time status tracking.
- **Supervisor Dashboard**: Dedicated interface to review submissions, approve/reject projects, and manage assigned students.
- **Administrator Panel**: Complete oversight for supervisor authorization, system-wide analytics, and manual user assignments.

### 🚀 Advanced Capabilities (New)
- **Context-Aware Co-Author Selection**: During project upload, co-authors are now dynamically filtered and selectable via dropdowns *only* if they share the same assigned supervisor, academic year, and semester as the primary uploader.
- **Smart Data Formatting**: Automatic capitalization and formatting of the alphabet portion of Student IDs during registration and profile updates to maintain institutional data consistency.
- **Comprehensive Real-Time Notifications**: Instant, socket-free alerts for project status changes, and newly introduced 3-way notifications during student reassignments (automatically alerting the old supervisor, the new supervisor, and the reassigned student).
- **Supervisor Authorization Gating**: Newly registered supervisors are placed in a "Pending" state and strictly barred from system access until explicitly authorized by a System Admin.

### 🔐 Enterprise-Grade Security (New)
- **Dual Authentication System**: Implements a robust mixed-authentication architecture. 
  - *Primary*: Secure Firebase ID Token verification via frontend integration.
  - *Fallback/Legacy*: Direct, encrypted backend database password validation seamlessly supporting distinct roles seamlessly (Admin, Teacher, Student).
- **Role-Based Access Control (RBAC)**: Strict segregation of permissions across Students, Supervisors, and system Administrators.

---

## 🏗️ Architecture & Technologies

The system follows a standard three-tier architecture, heavily utilizing Java Servlets for backend processing and vanilla JavaScript connecting to RESTful APIs.

```text
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (HTML/CSS/JS)                  │
│       Firebase SDK Auth · API Client (api.js)               │
│       Role Dashboards (Admin, Supervisor, Student)          │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP (JSON / Multipart / ID Tokens)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Java Servlets)                   │
│                                                             │
│   Servlet Layer     AuthServlet · ProjectServlet            │
│                     AdminServlet · NotificationServlet      │
│                                                             │
│   Service Layer     StudentService · TeacherService         │
│                     SupervisorStudentService                │
│                                                             │
│   DAO Layer         StudentDAO · TeacherDAO · ProjectDAO    │
└──────────────────────────┬──────────────────────────────────┘
                           │  JDBC / Connection Pooling
                           ▼
                 ┌───────────────────┐
                 │   MySQL (tprs_db) │
                 └───────────────────┘
```

---

## 📁 Project Structure

```text
TPRS/
├── backend/
│   ├── pom.xml                      # Maven dependencies and build configuration
│   ├── sql/
│   │   ├── create_database.sql      # Core DB schema, views, and procedures
│   │   └── migrate_firebase.sql     # Add Firebase UID columns to existing users
│   ├── src/main/java/com/tprs/
│   │   ├── config/                  # DB & Firebase Initialization Configs
│   │   ├── model/                   # Data transfer objects (Student, Teacher, etc.)
│   │   ├── dao/                     # SQL Data Access Objects
│   │   ├── service/                 # Core business validation logic
│   │   └── servlet/                 # REST API Controllers (CORS properly handled)
│   └── src/main/resources/
│       ├── db.properties            # Environment credentials (Git-ignored in prod)
│       └── settings.json            # Firebase Service Account JSON (Git-ignored)
├── html/                            # Frontend Views
├── scripts/                         # Frontend UI Logic & API Clients
└── styles/                          # CSS Stylesheets
```

---

## 🔐 Authentication Flow

1. **Frontend Attempt**: The application first attempts an API call to the backend for legacy accounts or immediate internal admin overrides.
2. **Backend Validation**: `AuthServlet` validates direct requests. Supervisors are checked against the `is_authorized` flag; unapproved supervisors receive a generic rejection to prevent state-leaking.
3. **Firebase Fallback**: If standard password auth fails or the user is primarily a modern student user, `login.js` delegates to `firebase.auth().signInWithEmailAndPassword()`.
4. **Token Verification**: A generated Firebase JWT (ID Token) is sent to the backend `/auth/login` endpoint where the Firebase Admin SDK securely decodes it, identifies the user, and authorizes the session.

---

## 🚀 Getting Started

### Prerequisites

| Component | Required Version |
|-----------|------------------|
| Java JDK  | 17 or 21+        |
| Apache Maven | 3.8+          |
| MySQL Server | 8.0+          |
| Web Server| Apache Tomcat 9/10 or Jetty |

### 1. Database Initialization
```sql
mysql -u root -p < backend/sql/create_database.sql
```

### 2. Configure Environment Variables
Inside `backend/src/main/resources/`, strictly ensure the following exist:
- `db.properties` (JDBC URL, Root User, Password)
- `settings.json` (Your generated Firebase Service Account Key)

### 3. Build & Deploy
Deploying via Maven into a local Apache Tomcat or Jetty container:

```bash
cd backend
mvn clean package
# Deploy the generated .war payload
sudo cp target/thesis-project-repository-system-1.0-SNAPSHOT.war /var/lib/tomcat9/webapps/tprs.war
```

### 4. Client Access
Once the backend container has unpacked the `.war`, access the application via your web server port (usually `8080`).

---

## �️ Migration & Maintenance Documentation

When moving the application to production or restructuring your environment, please refer to following architectural guides:

- [**Domain Name & SSL Migration Guide**](docs/domain-name-migration.md): Detailed steps for changing the application's domain name, setting up HTTPS/SSL using Certbot, and re-configuring Firebase/Google Cloud Authorized Domains.
- [**Web Server Migration Guide**](docs/web-server-migration.md): Instructions for switching the frontend/backend servers (e.g. Apache to Nginx, Jetty to Tomcat) and setting up secure reverse proxies.

---

## �📡 API Reference Overview

The backend exposes a highly structured RESTful API under the `/tprs/api` namespace.

**Authentication & Registration**
- `POST /auth/login` - Hybrid login accepting either `{email, password}` or `{idToken}`.
- `POST /auth/register` - Student Registration.
- `POST /auth/register-teacher` - Supervisor Registration.

**Core Resources**
- `GET /projects` - Fetches uploaded projects with robust filtering headers.
- `POST /projects` - Multipart/form-data endpoint for secure file uploads.
- `PUT /admin/teachers/{id}/authorize` - Admin-only endpoint to formalize supervisor access.
- `POST /admin/assignments` - Binds a student to a supervisor for a specific year/semester, seamlessly triggering the new 3-way notification event.

