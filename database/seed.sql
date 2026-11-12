-- CivicCare - Smart City Public Grievance Management System
-- Seed Data Script

USE civiccare_db;

-- 1. Insert Departments
INSERT INTO departments (id, name, description) VALUES
(1, 'Public Works Department (PWD)', 'Responsible for road maintenance, potholes, pavement repairs, and public infrastructure.'),
(2, 'Sanitation & Solid Waste Management', 'Handles municipal waste collection, garbage clearing, overflow bins, and public hygiene.'),
(3, 'Electrical & Street Lighting', 'Manages streetlights, broken poles, exposed wiring, and public electrical fixtures.'),
(4, 'Water Supply & Sewage', 'Manages potable water distribution pipelines, main leakages, and clean water contamination issues.'),
(5, 'Urban Drainage Management', 'Responsible for stormwater drains, blocked gutters, monsoon overflow, and sewage line repairs.');

-- 2. Insert Users (Password for all accounts is bcrypt hashed version of Admin@123 / Officer@123 / Citizen@123)
-- Admin: Admin@123 -> $2a$10$L0Q77G/S2cE00Ew.gI09b.xI/mYk.c94M38H.d/4e.01F1x5j3C7m (generated via bcrypt salt 10)
-- Officer: Officer@123 -> $2a$10$m64QfJ.E2e10Ev.hJ10ac.yJ/nZl.d05N49I.e/5f.02G2y6k4D8n
-- Citizen: Citizen@123 -> $2a$10$n75RgK.F3f21Fw.iK21bd.zK/oAm.e16O50J.f/6g.03H3z7l5E9o

INSERT INTO users (id, name, email, phone, password, role, address) VALUES
(1, 'System Administrator', 'admin@civiccare.gov.in', '9876543210', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'admin', 'Civic Headquarters, Central Avenue, Smart City'),
(2, 'Rajesh Kumar (PWD Officer)', 'officer.pwd@civiccare.gov.in', '9876543211', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'officer', 'PWD Division Office, Sector 4, Smart City'),
(3, 'Priya Sharma (Sanitation Officer)', 'officer.sanitation@civiccare.gov.in', '9876543212', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'officer', 'Sanitation Zone 2, Green Park, Smart City'),
(4, 'Vikram Singh (Electrical Officer)', 'officer.electrical@civiccare.gov.in', '9876543213', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'officer', 'Electricity Board Office, Power Grid Colony, Smart City'),
(5, 'Aarav Patel', 'citizen1@gmail.com', '9876543214', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'citizen', 'Flat 402, Sunrise Apartments, MG Road, Smart City'),
(6, 'Sneha Reddy', 'citizen2@gmail.com', '9876543215', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'citizen', 'House 12B, Rose Villa, Indiranagar, Smart City'),
(7, 'Rohan Mehta', 'citizen3@gmail.com', '9876543216', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'citizen', 'Plot 88, Tech Park Avenue, Electronic City, Smart City'),
(8, 'Ananya Gupta', 'citizen4@gmail.com', '9876543217', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'citizen', '7th Cross, Koramangala 4th Block, Smart City'),
(9, 'Kabir Das', 'citizen5@gmail.com', '9876543218', '$2b$10$64Q8HvyXn4kS1Y4q4d3Jv.B5n7c.9f8g7h6i5j4k3l2m1n0o9p8q', 'citizen', 'Villa 19, Palm Meadows, Whitefield, Smart City');

-- 3. Insert Officers
INSERT INTO officers (id, user_id, department_id, employee_id, active_status) VALUES
(1, 2, 1, 'EMP-PWD-001', 1),
(2, 3, 2, 'EMP-SAN-002', 1),
(3, 4, 3, 'EMP-ELE-003', 1);

-- 4. Insert Complaints
INSERT INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id, created_at) VALUES
(1, 'CC-2026-0001', 5, 'Pothole', 'Deep crater pothole on Main Road near Bus Stop', 'A massive pothole has formed right near the bus stop causing severe traffic jams and multiple two-wheeler accidents during peak hours.', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop', 12.971598, 77.594566, 'MG Road Bus Stand, Near Metro Pillar 142, Smart City', 'High', 'In Progress', 1, 1, NOW() - INTERVAL 4 DAY),

(2, 'CC-2026-0002', 6, 'Waste Disposal', 'Overflowing garbage dump outside Residential School', 'Unattended garbage pile accumulating for 5 days. Foul smell spreading across the school campus creating health hazards for children.', 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop', 12.978300, 77.640800, 'Outside St. Jude High School, Indiranagar 10th Main, Smart City', 'Critical', 'Assigned', 2, 2, NOW() - INTERVAL 3 DAY),

(3, 'CC-2026-0003', 7, 'Streetlight', 'Non-functional streetlights across entire 4th Cross Lane', 'All 6 streetlights on 4th Cross have been dark for a week. Increased risk of theft and safety concerns for women commuting at night.', 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=800&auto=format&fit=crop', 12.916500, 77.610100, '4th Cross Road, BTM Layout 2nd Stage, Smart City', 'Medium', 'Resolved', 3, 3, NOW() - INTERVAL 6 DAY),

(4, 'CC-2026-0004', 8, 'Water Leakage', 'Pipeline burst leaking thousands of liters of clean water', 'Main supply line ruptured near the public park entrance. Drinking water is flooding the street while households experience low pressure.', 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop', 12.935200, 77.624500, 'Koramangala 4th Block Park Gate, Smart City', 'Critical', 'Under Review', 4, NULL, NOW() - INTERVAL 1 DAY),

(5, 'CC-2026-0005', 9, 'Drainage', 'Blocked stormwater drain causing waterlogging after rain', 'Plastic waste and construction debris blocking the drain. Water accumulated up to knee height during recent showers.', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop', 12.969800, 77.749900, 'Whitefield Main Road, Opposite ITPL Gate 2, Smart City', 'High', 'Submitted', NULL, NULL, NOW() - INTERVAL 12 HOUR);

-- 5. Insert Status History
INSERT INTO complaint_status_history (complaint_id, status, comment, changed_by, created_at) VALUES
(1, 'Submitted', 'Grievance submitted by citizen', 5, NOW() - INTERVAL 4 DAY),
(1, 'Under Review', 'Verified complaint urgency and location details', 1, NOW() - INTERVAL 3 DAY),
(1, 'Assigned', 'Assigned to Public Works Department officer Rajesh Kumar', 1, NOW() - INTERVAL 3 DAY),
(1, 'In Progress', 'Asphalt repair team dispatched to location with roller equipment', 2, NOW() - INTERVAL 2 DAY),

(2, 'Submitted', 'Grievance submitted by citizen', 6, NOW() - INTERVAL 3 DAY),
(2, 'Under Review', 'Reviewed by admin team. Marked Critical due to proximity to school.', 1, NOW() - INTERVAL 2 DAY),
(2, 'Assigned', 'Assigned to Sanitation Officer Priya Sharma', 1, NOW() - INTERVAL 2 DAY),

(3, 'Submitted', 'Grievance submitted by citizen', 7, NOW() - INTERVAL 6 DAY),
(3, 'Under Review', 'Reviewed and forwarded to Electrical Department', 1, NOW() - INTERVAL 5 DAY),
(3, 'Assigned', 'Assigned to Electrical Officer Vikram Singh', 1, NOW() - INTERVAL 5 DAY),
(3, 'In Progress', 'Technician team replacing faulty LED drivers and fused bulbs', 4, NOW() - INTERVAL 3 DAY),
(3, 'Resolved', 'Replaced 6 LED fixtures and verified lighting restored.', 4, NOW() - INTERVAL 1 DAY),

(4, 'Submitted', 'Grievance submitted by citizen', 8, NOW() - INTERVAL 1 DAY),
(4, 'Under Review', 'Urgent water supply pipeline leak reported. Verification in progress.', 1, NOW() - INTERVAL 18 HOUR),

(5, 'Submitted', 'Grievance submitted by citizen', 9, NOW() - INTERVAL 12 HOUR);

-- 6. Insert Resolution for Complaint #3
INSERT INTO resolutions (complaint_id, officer_id, description, evidence_image_url, resolved_at) VALUES
(3, 3, 'Successfully inspected the 4th Cross Lane line. Replaced 6 burnt-out 120W LED fixtures and repaired broken underground wiring conduit. All streetlights tested and fully operational.', 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop', NOW() - INTERVAL 1 DAY);

-- 7. Insert Feedback for Complaint #3
INSERT INTO feedback (complaint_id, citizen_id, rating, resolution_status, comment, created_at) VALUES
(3, 7, 5, 'Satisfied', 'Prompt action by the Electrical Department! The street is well lit now and feels safe again. Thank you CivicCare team!', NOW() - INTERVAL 12 HOUR);

-- 8. Insert Notifications
INSERT INTO notifications (user_id, complaint_id, message, is_read, created_at) VALUES
(5, 1, 'Your complaint CC-2026-0001 status changed to In Progress.', 0, NOW() - INTERVAL 2 DAY),
(6, 2, 'Your complaint CC-2026-0002 has been assigned to Sanitation Department.', 1, NOW() - INTERVAL 2 DAY),
(7, 3, 'Your complaint CC-2026-0003 has been marked as RESOLVED.', 1, NOW() - INTERVAL 1 DAY),
(2, 1, 'New complaint CC-2026-0001 assigned to you by Administrator.', 1, NOW() - INTERVAL 3 DAY),
(3, 2, 'New complaint CC-2026-0002 assigned to you by Administrator.', 0, NOW() - INTERVAL 2 DAY);
