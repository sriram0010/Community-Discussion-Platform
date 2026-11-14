-- HostelCare MySQL Database Schema & Initial Seed Data

CREATE DATABASE IF NOT EXISTS `hostelcare` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `hostelcare`;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `reg_no` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `username` VARCHAR(60) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    `hostel` VARCHAR(50) NOT NULL,
    `room_no` VARCHAR(50) NOT NULL,
    `location` VARCHAR(150) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ISSUES TABLE
CREATE TABLE IF NOT EXISTS `issues` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `user_id` VARCHAR(50) NOT NULL,
    `student_name` VARCHAR(100) NOT NULL,
    `reg_no` VARCHAR(50) NOT NULL,
    `student_email` VARCHAR(150) NOT NULL,
    `hostel` VARCHAR(50) NOT NULL,
    `room_no` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` ENUM('Normal', 'High', 'Urgent') NOT NULL DEFAULT 'Normal',
    `status` ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `resolved_at` DATETIME DEFAULT NULL,
    `resolved_by` VARCHAR(100) DEFAULT NULL,
    `resolution_notes` TEXT DEFAULT NULL,
    INDEX `idx_hostel` (`hostel`),
    INDEX `idx_status` (`status`),
    INDEX `idx_reg_no` (`reg_no`),
    CONSTRAINT `fk_issues_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. EMAILS TABLE
CREATE TABLE IF NOT EXISTS `emails` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `issue_id` VARCHAR(50) NOT NULL,
    `recipient_email` VARCHAR(150) NOT NULL,
    `recipient_name` VARCHAR(100) NOT NULL,
    `reg_no` VARCHAR(50) NOT NULL,
    `hostel` VARCHAR(50) NOT NULL,
    `room_no` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Delivered',
    INDEX `idx_email_issue` (`issue_id`),
    CONSTRAINT `fk_emails_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED DATA: USERS (Admin + 4 Students from Amethyst, Amber, Sapphire, Jasper)
INSERT INTO `users` (`id`, `name`, `reg_no`, `email`, `username`, `password`, `role`, `hostel`, `room_no`, `location`)
VALUES
('user_admin', 'Chief Hostel Warden', 'ADMIN01', 'admin@hostel.edu', 'admin@hostel.edu', 'admin123', 'admin', 'All Hostels', 'Admin Office', 'Central Facilities Block'),
('user_aarav', 'Aarav Sharma', '21BCE1042', 'aarav.sharma@vitstudent.ac.in', '21BCE1042@at', 'password123', 'student', 'Amethyst', '302', 'North Block A'),
('user_priya', 'Priya Patel', '22BCE1104', 'priya.patel@vitstudent.ac.in', '22BCE1104@ab', 'password123', 'student', 'Amber', '204', 'East Wing Block C'),
('user_rohan', 'Rohan Iyer', '21BCI0088', 'rohan.iyer@vitstudent.ac.in', '21BCI0088@sp', 'password123', 'student', 'Sapphire', '112', 'South Quad'),
('user_sneha', 'Sneha Roy', '23BCE3021', 'sneha.roy@vitstudent.ac.in', '23BCE3021@js', 'password123', 'student', 'Jasper', '415', 'West Tower 2')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- SEED DATA: ISSUES (Calculated dates for days unresolved demonstration)
INSERT INTO `issues` (`id`, `user_id`, `student_name`, `reg_no`, `student_email`, `hostel`, `room_no`, `category`, `title`, `description`, `priority`, `status`, `created_at`, `updated_at`, `resolved_at`, `resolved_by`, `resolution_notes`)
VALUES
('ISS-1001', 'user_aarav', 'Aarav Sharma', '21BCE1042', 'aarav.sharma@vitstudent.ac.in', 'Amethyst', '302', 'Water Problem', 'Bathroom tap has low pressure and brownish water', 'Since last week, the cold water tap in room 302 bathroom has extremely weak pressure and occasionally discharges brownish muddy water in the morning.', 'Urgent', 'In Progress', NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 1 DAY, NULL, NULL, NULL),
('ISS-1002', 'user_aarav', 'Aarav Sharma', '21BCE1042', 'aarav.sharma@vitstudent.ac.in', 'Amethyst', '302', 'Fan / Electrical', 'Ceiling fan rotating very slowly and making humming sound', 'The ceiling fan speed controller is stuck at level 1 and the fan motor produces an electrical hum. It does not rotate at high speed even at dial 5.', 'Normal', 'Pending', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY, NULL, NULL, NULL),
('ISS-1003', 'user_priya', 'Priya Patel', '22BCE1104', 'priya.patel@vitstudent.ac.in', 'Amber', '204', 'Mosquito Net', 'Window mosquito mesh torn along the corner frame', 'The nylon mosquito netting on the main window frame is ripped along the right seam, letting insects and mosquitoes enter in the evenings.', 'High', 'Pending', NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY, NULL, NULL, NULL),
('ISS-1004', 'user_rohan', 'Rohan Iyer', '21BCI0088', 'rohan.iyer@vitstudent.ac.in', 'Sapphire', '112', 'WiFi / Internet', 'Hostel WiFi access point disconnects frequently', 'The corridor Wi-Fi router for 1st floor drops internet packet every 10 minutes. Eduroam keeps authenticating and timing out.', 'High', 'In Progress', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, NULL, NULL, NULL),
('ISS-1005', 'user_sneha', 'Sneha Roy', '23BCE3021', 'sneha.roy@vitstudent.ac.in', 'Jasper', '415', 'Water Problem', 'Flush cistern leak in attached washroom', 'Water continuously trickles down the toilet bowl from the flush tank valve, wasting water and creating noise at night.', 'Normal', 'Pending', NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 3 HOUR, NULL, NULL, NULL),
('ISS-1000', 'user_aarav', 'Aarav Sharma', '21BCE1042', 'aarav.sharma@vitstudent.ac.in', 'Amethyst', '302', 'Carpentry / Furniture', 'Study table drawer slider stuck', 'The right-side wooden drawer fell off its metal rail slider and could not close.', 'Normal', 'Resolved', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY, 'Warden Office (Carpentry Dept)', 'Carpenter re-aligned the steel ball-bearing slider and secured it with 4 new heavy-duty screws. Inspected and working properly.')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- SEED DATA: RESOLUTION EMAILS
INSERT INTO `emails` (`id`, `issue_id`, `recipient_email`, `recipient_name`, `reg_no`, `hostel`, `room_no`, `category`, `subject`, `body`, `sent_at`, `status`)
VALUES
('EML-9001', 'ISS-1000', 'aarav.sharma@vitstudent.ac.in', 'Aarav Sharma', '21BCE1042', 'Amethyst', '302', 'Carpentry / Furniture', '[Resolved] Hostel Maintenance Ticket #ISS-1000: Study table drawer slider stuck', 'Dear Aarav Sharma,\n\nYour maintenance issue regarding \"Study table drawer slider stuck\" (Room 302, Amethyst Hostel) has been marked as RESOLVED by the Hostel Management.\n\nResolution Remarks:\nCarpenter re-aligned the steel ball-bearing slider and secured it with 4 new heavy-duty screws. Inspected and working properly.\n\nIf you still experience issues, feel free to submit a follow-up ticket in the portal.\n\nWarm regards,\nHostel Administration & Facilities Support', NOW() - INTERVAL 7 DAY, 'Delivered')
ON DUPLICATE KEY UPDATE `subject`=VALUES(`subject`);
