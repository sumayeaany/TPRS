-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: tprs_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipient_id` int NOT NULL,
  `recipient_type` enum('student','teacher') NOT NULL,
  `sender_id` int DEFAULT NULL,
  `sender_type` enum('student','teacher') DEFAULT NULL,
  `type` enum('project_submitted','project_approved','project_rejected','assignment','general') NOT NULL DEFAULT 'general',
  `title` varchar(500) NOT NULL,
  `message` text,
  `project_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `idx_recipient` (`recipient_id`,`recipient_type`),
  KEY `idx_read_status` (`is_read`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
INSERT INTO `notification` VALUES (1,1,'student',1,'teacher','assignment','Supervisor Assigned','You have been assigned to supervisor: Teacher Test (3rd Year, 1st Semester).',NULL,1,'2026-03-07 21:07:46'),(2,1,'teacher',1,'student','project_submitted','New Project Submission','Student Test has submitted a new project: \"Test1\" (3rd Year, 1st Semester). Please review and take action.',NULL,0,'2026-03-07 21:09:35'),(3,1,'student',1,'teacher','project_approved','Project Approved!','Your project \"Test1\" has been approved by Teacher Test (3rd Year, 1st Semester).',NULL,1,'2026-03-07 21:10:21'),(4,1,'teacher',1,'student','project_submitted','New Project Submission','Student Test has submitted a new project: \"Test2\" (3rd Year, 1st Semester). Please review and take action.',NULL,0,'2026-03-07 21:22:30'),(5,1,'student',1,'teacher','project_approved','Project Approved!','Your project \"Test2\" has been approved by Teacher Test (3rd Year, 1st Semester).',NULL,1,'2026-03-07 21:23:52'),(6,1,'teacher',1,'student','project_submitted','New Project Submission','Student Test has submitted a new project: \"Test3\" (3rd Year, 1st Semester). Please review and take action.',NULL,0,'2026-03-07 21:49:23'),(7,1,'student',1,'teacher','project_approved','Project Approved!','Your project \"Test3\" has been approved by Teacher Test (3rd Year, 1st Semester).',NULL,1,'2026-03-07 21:49:57'),(8,1,'teacher',1,'student','project_submitted','New Project Submission','Student Test has submitted a new project: \"Test4\" (3rd Year, 1st Semester). Please review and take action.',NULL,0,'2026-03-07 21:51:38'),(9,1,'student',1,'teacher','project_rejected','Project Rejected','Your project \"Test4\" has been rejected by Teacher Test (3rd Year, 1st Semester). Please review and resubmit.',NULL,1,'2026-03-07 21:51:58'),(10,1,'student',1,'teacher','assignment','Supervisor Assigned','You have been assigned to supervisor: Teacher Test (3rd Year, 1st Semester).',NULL,0,'2026-03-07 23:22:26'),(11,1,'teacher',1,'student','assignment','New Student Assigned','Student Test has been assigned to you (3rd Year, 1st Semester).',NULL,0,'2026-03-07 23:22:26');
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project`
--

DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `description` text,
  `type` enum('thesis','project','research') NOT NULL DEFAULT 'project',
  `student_id` int NOT NULL,
  `supervisor_id` int NOT NULL,
  `status` enum('pending','in_progress','completed','approved','rejected') DEFAULT 'pending',
  `file_path` varchar(500) DEFAULT NULL,
  `file_name` varchar(500) DEFAULT NULL,
  `file_data` longblob,
  `zip_file_path` varchar(500) DEFAULT NULL,
  `zip_file_name` varchar(500) DEFAULT NULL,
  `zip_file_size` bigint DEFAULT NULL,
  `github_link` varchar(500) DEFAULT NULL,
  `keywords` varchar(500) DEFAULT NULL,
  `year` varchar(20) DEFAULT NULL,
  `semester` varchar(20) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `session` varchar(20) DEFAULT NULL,
  `submission_date` timestamp NULL DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_student` (`student_id`),
  KEY `idx_project_supervisor` (`supervisor_id`),
  KEY `idx_project_status` (`status`),
  KEY `idx_project_department` (`department`),
  KEY `idx_project_year` (`year`),
  FULLTEXT KEY `idx_project_search` (`title`,`description`,`keywords`),
  CONSTRAINT `project_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_ibfk_2` FOREIGN KEY (`supervisor_id`) REFERENCES `teacher` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project`
--

LOCK TABLES `project` WRITE;
/*!40000 ALTER TABLE `project` DISABLE KEYS */;
/*!40000 ALTER TABLE `project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `project_details`
--

DROP TABLE IF EXISTS `project_details`;
/*!50001 DROP VIEW IF EXISTS `project_details`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `project_details` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `description`,
 1 AS `type`,
 1 AS `status`,
 1 AS `keywords`,
 1 AS `year`,
 1 AS `semester`,
 1 AS `department`,
 1 AS `file_path`,
 1 AS `submission_date`,
 1 AS `approval_date`,
 1 AS `created_at`,
 1 AS `student_name`,
 1 AS `student_email`,
 1 AS `supervisor_name`,
 1 AS `supervisor_email`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `project_view`
--

DROP TABLE IF EXISTS `project_view`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_view` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `viewer_id` int NOT NULL,
  `viewer_type` enum('student','teacher') NOT NULL,
  `viewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_view` (`project_id`,`viewer_id`,`viewer_type`),
  KEY `idx_project_view_project` (`project_id`),
  CONSTRAINT `project_view_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_view`
--

LOCK TABLES `project_view` WRITE;
/*!40000 ALTER TABLE `project_view` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_view` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student`
--

DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `department` varchar(100) NOT NULL,
  `semester` varchar(20) DEFAULT NULL,
  `session` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_student_email` (`email`),
  KEY `idx_student_department` (`department`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student`
--

LOCK TABLES `student` WRITE;
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` VALUES (2,'CE23060','Student','Test','s1@mbstu.ac.bd','$2a$10$CUjiZE..vaI4hRZf2JTaSu.UaoA38ab.sVTuIRcV.YGZRlelkxUSe','CSE','Bachelor','2022-2023','','2026-03-08 00:26:18','2026-03-08 00:26:18');
/*!40000 ALTER TABLE `student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supervisor_student`
--

DROP TABLE IF EXISTS `supervisor_student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supervisor_student` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supervisor_id` int NOT NULL,
  `student_id` int NOT NULL,
  `year` varchar(20) DEFAULT NULL,
  `semester` varchar(20) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_assignment` (`supervisor_id`,`student_id`,`year`,`semester`),
  KEY `idx_supervisor` (`supervisor_id`),
  KEY `idx_student` (`student_id`),
  CONSTRAINT `supervisor_student_ibfk_1` FOREIGN KEY (`supervisor_id`) REFERENCES `teacher` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supervisor_student_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supervisor_student`
--

LOCK TABLES `supervisor_student` WRITE;
/*!40000 ALTER TABLE `supervisor_student` DISABLE KEYS */;
/*!40000 ALTER TABLE `supervisor_student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher`
--

DROP TABLE IF EXISTS `teacher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `department` varchar(100) NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_authorized` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_id` (`teacher_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_teacher_email` (`email`),
  KEY `idx_teacher_department` (`department`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher`
--

LOCK TABLES `teacher` WRITE;
/*!40000 ALTER TABLE `teacher` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `project_details`
--

/*!50001 DROP VIEW IF EXISTS `project_details`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `project_details` AS select `p`.`id` AS `id`,`p`.`title` AS `title`,`p`.`description` AS `description`,`p`.`type` AS `type`,`p`.`status` AS `status`,`p`.`keywords` AS `keywords`,`p`.`year` AS `year`,`p`.`semester` AS `semester`,`p`.`department` AS `department`,`p`.`file_path` AS `file_path`,`p`.`submission_date` AS `submission_date`,`p`.`approval_date` AS `approval_date`,`p`.`created_at` AS `created_at`,concat(`s`.`first_name`,' ',`s`.`last_name`) AS `student_name`,`s`.`email` AS `student_email`,concat(`t`.`first_name`,' ',`t`.`last_name`) AS `supervisor_name`,`t`.`email` AS `supervisor_email` from ((`project` `p` join `student` `s` on((`p`.`student_id` = `s`.`id`))) join `teacher` `t` on((`p`.`supervisor_id` = `t`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-03 16:07:47
