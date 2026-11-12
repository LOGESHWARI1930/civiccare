-- CivicCare - Smart City Public Grievance Management System
-- Database Schema Script

CREATE DATABASE IF NOT EXISTS civiccare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE civiccare_db;

-- Drop tables if exists in correct dependency order
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS resolutions;
DROP TABLE IF EXISTS complaint_status_history;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS officers;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

-- 1. Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('citizen', 'officer', 'admin') NOT NULL DEFAULT 'citizen',
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Departments table
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Officers table
CREATE TABLE officers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  department_id INT NOT NULL,
  employee_id VARCHAR(100) NOT NULL UNIQUE,
  active_status TINYINT(1) DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Complaints table
CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_number VARCHAR(50) NOT NULL UNIQUE,
  citizen_id INT NOT NULL,
  category ENUM('Pothole', 'Waste Disposal', 'Streetlight', 'Water Leakage', 'Drainage', 'Other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_address TEXT NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  status ENUM('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected') NOT NULL DEFAULT 'Submitted',
  department_id INT NULL,
  officer_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Complaint Status History table
CREATE TABLE complaint_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  comment TEXT,
  changed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Resolutions table
CREATE TABLE resolutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL UNIQUE,
  officer_id INT NOT NULL,
  description TEXT NOT NULL,
  evidence_image_url VARCHAR(500),
  resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Feedback table
CREATE TABLE feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL UNIQUE,
  citizen_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  resolution_status VARCHAR(50) DEFAULT 'Satisfied',
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  complaint_id INT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
