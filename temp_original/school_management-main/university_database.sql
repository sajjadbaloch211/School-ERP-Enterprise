-- Enterprise University Management System Database
-- Created for: University Level Scalability

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS `departments` (
  `id` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL UNIQUE,
  `code` varchar(20) NOT NULL UNIQUE,
  `head_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table (Core Auth)
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(100) UNIQUE DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','TEACHER','STUDENT','PARENT') NOT NULL DEFAULT 'STUDENT',
  `full_name` varchar(100) NOT NULL,
  `status` enum('active','suspended','graduated') DEFAULT 'active',
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS `courses` (
  `id` varchar(100) NOT NULL,
  `dept_id` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(20) NOT NULL UNIQUE,
  `credits` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`dept_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Teachers Table
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL UNIQUE,
  `dept_id` varchar(100) NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `specialization` text,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dept_id`) REFERENCES `departments`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Students Table
CREATE TABLE IF NOT EXISTS `students` (
  `id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL UNIQUE,
  `dept_id` varchar(100) NOT NULL,
  `enrollment_no` varchar(50) NOT NULL UNIQUE,
  `batch` varchar(20) NOT NULL,
  `semester` int(11) DEFAULT 1,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dept_id`) REFERENCES `departments`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Classes / Sessions
CREATE TABLE IF NOT EXISTS `classes` (
  `id` varchar(100) NOT NULL,
  `course_id` varchar(100) NOT NULL,
  `teacher_id` varchar(100) NOT NULL,
  `semester` int(11) NOT NULL,
  `section` varchar(10) NOT NULL,
  `schedule` text,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`),
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Digital Library (E-Books)
CREATE TABLE IF NOT EXISTS `ebooks` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT 'General',
  `file_path` varchar(255) NOT NULL,
  `uploaded_by` varchar(100) NOT NULL,
  `access_role` enum('ALL','TEACHER','ADMIN') DEFAULT 'ALL',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Data for Setup
INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `full_name`, `status`) VALUES
('cl-super-admin', 'superadmin', 'super@university.edu', '$2b$10$xKSLO1l6B7V7dA3OlcZ9Fu4GmEW1l5ibIfOF4Y.f3h7Xl/LHseq4', 'SUPER_ADMIN', 'System Master', 'active');

COMMIT;
