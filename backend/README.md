# TPRS Backend - Thesis and Project Repository System

## Project Structure

```
backend/
├── pom.xml                              # Maven build file
├── lib/                                 # JAR dependencies (if not using Maven)
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── tprs/
│                   ├── config/           # Configuration classes
│                   │   └── DatabaseConfig.java
│                   ├── model/            # Entity/Model classes
│                   │   ├── Student.java
│                   │   ├── Teacher.java
│                   │   └── Project.java
│                   ├── dao/              # Data Access Objects
│                   │   ├── StudentDAO.java
│                   │   ├── TeacherDAO.java
│                   │   └── ProjectDAO.java
│                   ├── service/          # Service/Business Logic layer
│                   │   ├── StudentService.java
│                   │   ├── TeacherService.java
│                   │   └── ProjectService.java
│                   ├── servlet/          # HTTP Servlet controllers
│                   │   ├── AuthServlet.java
│                   │   ├── CORSFilter.java
│                   │   ├── DashboardServlet.java
│                   │   └── ProjectServlet.java
│                   └── Main.java         # Application entry point
├── WEB-INF/
│   └── web.xml                          # Web application descriptor
└── sql/
    └── create_database.sql              # Database creation script
```

## Tech Stack

- **Backend**: Java Servlet API 4.0
- **Database**: MySQL
- **JSON Processing**: Google Gson
- **Architecture**: MVC (Model-View-Controller) with DAO pattern

## Required Dependencies

The project requires the following JAR files:

| Dependency | Version | Download Link |
|------------|---------|---------------|
| javax.servlet-api | 4.0.1 | [Maven Central](https://repo1.maven.org/maven2/javax/servlet/javax.servlet-api/4.0.1/javax.servlet-api-4.0.1.jar) |
| gson | 2.10.1 | [Maven Central](https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar) |
| mysql-connector-java | 8.0.33 | [Maven Central](https://repo1.maven.org/maven2/mysql/mysql-connector-java/8.0.33/mysql-connector-java-8.0.33.jar) |

## Setup Instructions

### Option A: Using Maven (Recommended)

If you have Maven installed:

```bash
cd backend
mvn clean install
mvn dependency:resolve
```

### Option B: Manual JAR Setup

If Maven is not installed, download the JAR files manually:

1. Create a `lib` folder in the backend directory
2. Download the following JAR files and place them in the `lib` folder:
   - [javax.servlet-api-4.0.1.jar](https://repo1.maven.org/maven2/javax/servlet/javax.servlet-api/4.0.1/javax.servlet-api-4.0.1.jar)
   - [gson-2.10.1.jar](https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar)
   - [mysql-connector-java-8.0.33.jar](https://repo1.maven.org/maven2/mysql/mysql-connector-java/8.0.33/mysql-connector-java-8.0.33.jar)

3. Add the JAR files to your IDE's build path:
   - **Eclipse**: Right-click project → Build Path → Configure Build Path → Libraries → Add JARs
   - **IntelliJ IDEA**: File → Project Structure → Modules → Dependencies → Add JARs
   - **VS Code**: Add to `.classpath` or configure in settings

### 1. Prerequisites

- Java JDK 11 or higher
- MySQL 8.0 or higher
- Apache Tomcat 9.0 or higher (for deploying the web application)
- Maven (optional, for dependency management)

### 2. Database Setup

1. Start MySQL server
2. Run the database creation script:

```bash
mysql -u root -p < sql/create_database.sql
```

Or open MySQL Workbench and execute the `sql/create_database.sql` file.

### 3. Configure Database Connection

Edit `src/main/java/com/tprs/config/DatabaseConfig.java`:

```java
private static final String DB_URL = "jdbc:mysql://localhost:3306/tprs_db";
private static final String DB_USER = "root";
private static final String DB_PASSWORD = "your_password";  // Change this!
```

### 4. Deploy to Tomcat

1. Build the WAR file (if using Maven): `mvn package`
2. Copy the WAR file to Tomcat's `webapps` directory
3. Start Tomcat server
4. Access the API at `http://localhost:8080/thesis-project-repository-system/api/`

### 5. Compile and Run (Standalone)

```bash
# Navigate to src directory
cd backend/src/main/java

# Compile with all dependencies
javac -cp ".;../../../lib/*" com/tprs/*.java com/tprs/**/*.java

# Run
java -cp ".;../../../lib/*" com.tprs.Main
```

## Database Schema

### Tables

1. **student** - Stores student information
   - id, student_id, first_name, last_name, email, password, department, semester, phone

2. **teacher** - Stores teacher/supervisor information
   - id, teacher_id, first_name, last_name, email, password, department, designation, specialization, phone

3. **project** - Stores thesis/project information
   - id, title, description, type, student_id, supervisor_id, status, file_path, keywords, year, semester, department

## API/Service Methods

### StudentService
- `register(Student)` - Register new student
- `login(email, password)` - Authenticate student
- `getById(id)` - Get student by ID
- `getAllStudents()` - Get all students
- `updateProfile(Student)` - Update student profile
- `deleteStudent(id)` - Delete student

### TeacherService
- `register(Teacher)` - Register new teacher
- `login(email, password)` - Authenticate teacher
- `getById(id)` - Get teacher by ID
- `getAllTeachers()` - Get all teachers
- `getTeachersByDepartment(department)` - Get teachers by department
- `updateProfile(Teacher)` - Update teacher profile

### ProjectService
- `submitProject(Project)` - Submit new project
- `getById(id)` - Get project by ID
- `getAllProjects()` - Get all projects
- `getProjectsByStudent(studentId)` - Get projects by student
- `getProjectsBySupervisor(supervisorId)` - Get projects by supervisor
- `searchProjects(keyword)` - Search projects
- `approveProject(projectId)` - Approve project
- `rejectProject(projectId)` - Reject project
- `getPendingProjects()` - Get pending projects

## Future Enhancements

- [ ] Add password hashing (BCrypt)
- [ ] Implement JWT authentication
- [ ] Add REST API endpoints (using Servlet/Spring Boot)
- [ ] File upload functionality
- [ ] Email notifications
- [ ] Connection pooling (HikariCP)
