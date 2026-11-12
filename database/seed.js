const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

async function runSeed() {
  console.log('🌱 Starting CivicCare Database Initialization & Seeding...');
  
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const officerHash = await bcrypt.hash('Officer@123', 10);
  const citizenHash = await bcrypt.hash('Citizen@123', 10);

  // 1. Try MySQL seeding first
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const dbName = process.env.DB_NAME || 'civiccare_db';

  let mysqlConnected = false;
  try {
    const conn = await mysql.createConnection({ host, user, password, port, multipleStatements: true });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${dbName}\`;`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      await conn.query(fs.readFileSync(schemaPath, 'utf8'));
    }

    const seedSql = getSeedQueries(adminHash, officerHash, citizenHash);
    await conn.query(seedSql);
    await conn.end();
    console.log('✅ MySQL Database seeded successfully!');
    mysqlConnected = true;
  } catch (err) {
    console.warn(`⚠️ MySQL Seed Notice: ${err.message}`);
  }

  // 2. Also Seed local SQLite database file for guaranteed out-of-the-box functionality
  const sqlitePath = path.join(__dirname, 'civiccare.sqlite');
  try {
    if (fs.existsSync(sqlitePath)) fs.unlinkSync(sqlitePath);
  } catch (err) {
    // SQLite file locked by server process; proceed to open and insert schema safely
  }

  const db = new sqlite3.Database(sqlitePath);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, phone TEXT, password TEXT, role TEXT, address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    db.run(`CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, description TEXT);`);
    db.run(`CREATE TABLE IF NOT EXISTS officers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, department_id INTEGER, employee_id TEXT UNIQUE, active_status INTEGER DEFAULT 1);`);
    db.run(`CREATE TABLE IF NOT EXISTS complaints (id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_number TEXT UNIQUE, citizen_id INTEGER, category TEXT, title TEXT, description TEXT, image_url TEXT, latitude REAL, longitude REAL, location_address TEXT, priority TEXT, status TEXT, department_id INTEGER, officer_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    db.run(`CREATE TABLE IF NOT EXISTS complaint_status_history (id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_id INTEGER, status TEXT, comment TEXT, changed_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    db.run(`CREATE TABLE IF NOT EXISTS resolutions (id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_id INTEGER UNIQUE, officer_id INTEGER, description TEXT, evidence_image_url TEXT, resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    db.run(`CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_id INTEGER UNIQUE, citizen_id INTEGER, rating INTEGER, resolution_status TEXT, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    db.run(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, complaint_id INTEGER, message TEXT, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    db.run(`CREATE TABLE IF NOT EXISTS password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, otp_code TEXT NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);

    // Insert Departments
    db.run(`INSERT OR IGNORE INTO departments (id, name, description) VALUES (1, 'Public Works Department (PWD)', 'Road maintenance, potholes, pavement repairs, and public infrastructure.');`);
    db.run(`INSERT OR IGNORE INTO departments (id, name, description) VALUES (2, 'Sanitation & Solid Waste Management', 'Municipal waste collection, garbage clearing, overflow bins, and public hygiene.');`);
    db.run(`INSERT OR IGNORE INTO departments (id, name, description) VALUES (3, 'Electrical & Street Lighting', 'Streetlights, broken poles, exposed wiring, and public electrical fixtures.');`);
    db.run(`INSERT OR IGNORE INTO departments (id, name, description) VALUES (4, 'Water Supply & Sewage', 'Potable water distribution pipelines, main leakages, and clean water contamination issues.');`);
    db.run(`INSERT OR IGNORE INTO departments (id, name, description) VALUES (5, 'Urban Drainage Management', 'Stormwater drains, blocked gutters, monsoon overflow, and sewage line repairs.');`);

    // Insert Users
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (1, 'System Administrator', 'admin@civiccare.gov.in', '9876543210', '${adminHash}', 'admin', 'Civic HQ, Smart City');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (2, 'Rajesh Kumar (PWD Officer)', 'officer.pwd@civiccare.gov.in', '9876543211', '${officerHash}', 'officer', 'PWD Division Office, Sector 4');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (3, 'Priya Sharma (Sanitation Officer)', 'officer.sanitation@civiccare.gov.in', '9876543212', '${officerHash}', 'officer', 'Sanitation Zone 2, Green Park');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (4, 'Vikram Singh (Electrical Officer)', 'officer.electrical@civiccare.gov.in', '9876543213', '${officerHash}', 'officer', 'Electricity Board Office');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (5, 'Aarav Patel', 'citizen1@gmail.com', '9876543214', '${citizenHash}', 'citizen', 'Flat 402, Sunrise Apartments, MG Road');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (6, 'Sneha Reddy', 'citizen2@gmail.com', '9876543215', '${citizenHash}', 'citizen', 'House 12B, Rose Villa, Indiranagar');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (7, 'Rohan Mehta', 'citizen3@gmail.com', '9876543216', '${citizenHash}', 'citizen', 'Plot 88, Tech Park Avenue');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (8, 'Ananya Gupta', 'citizen4@gmail.com', '9876543217', '${citizenHash}', 'citizen', '7th Cross, Koramangala 4th Block');`);
    db.run(`INSERT OR IGNORE INTO users (id, name, email, phone, password, role, address) VALUES (9, 'Kabir Das', 'citizen5@gmail.com', '9876543218', '${citizenHash}', 'citizen', 'Villa 19, Palm Meadows');`);

    // Insert Officers
    db.run(`INSERT OR IGNORE INTO officers (id, user_id, department_id, employee_id, active_status) VALUES (1, 2, 1, 'EMP-PWD-001', 1);`);
    db.run(`INSERT OR IGNORE INTO officers (id, user_id, department_id, employee_id, active_status) VALUES (2, 3, 2, 'EMP-SAN-002', 1);`);
    db.run(`INSERT OR IGNORE INTO officers (id, user_id, department_id, employee_id, active_status) VALUES (3, 4, 3, 'EMP-ELE-003', 1);`);

    // Insert Complaints
    db.run(`INSERT OR IGNORE INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id) VALUES (1, 'CC-2026-0001', 5, 'Pothole', 'Deep crater pothole on Main Road near Bus Stop', 'A massive pothole has formed right near the bus stop causing severe traffic jams.', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop', 12.971598, 77.594566, 'MG Road Bus Stand, Near Metro Pillar 142', 'High', 'In Progress', 1, 1);`);
    db.run(`INSERT OR IGNORE INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id) VALUES (2, 'CC-2026-0002', 6, 'Waste Disposal', 'Overflowing garbage dump outside Residential School', 'Unattended garbage pile accumulating for 5 days. Foul smell spreading.', 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop', 12.978300, 77.640800, 'Outside St. Jude High School, Indiranagar 10th Main', 'Critical', 'Assigned', 2, 2);`);
    db.run(`INSERT OR IGNORE INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id) VALUES (3, 'CC-2026-0003', 7, 'Streetlight', 'Non-functional streetlights across entire 4th Cross Lane', 'All 6 streetlights on 4th Cross have been dark for a week.', 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=800&auto=format&fit=crop', 12.916500, 77.610100, '4th Cross Road, BTM Layout 2nd Stage', 'Medium', 'Resolved', 3, 3);`);
    db.run(`INSERT OR IGNORE INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id) VALUES (4, 'CC-2026-0004', 8, 'Water Leakage', 'Pipeline burst leaking thousands of liters of clean water', 'Main supply line ruptured near the public park entrance.', 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop', 12.935200, 77.624500, 'Koramangala 4th Block Park Gate', 'Critical', 'Under Review', 4, NULL);`);
    db.run(`INSERT OR IGNORE INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id) VALUES (5, 'CC-2026-0005', 9, 'Drainage', 'Blocked stormwater drain causing waterlogging after rain', 'Plastic waste and construction debris blocking the drain.', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop', 12.969800, 77.749900, 'Whitefield Main Road, Opposite ITPL Gate 2', 'High', 'Submitted', NULL, NULL);`);

    // Status history & resolutions & feedback
    db.run(`INSERT OR IGNORE INTO complaint_status_history (complaint_id, status, comment, changed_by) VALUES (1, 'Submitted', 'Grievance submitted by citizen', 5);`);
    db.run(`INSERT OR IGNORE INTO complaint_status_history (complaint_id, status, comment, changed_by) VALUES (1, 'In Progress', 'Asphalt repair team dispatched', 2);`);
    db.run(`INSERT OR IGNORE INTO complaint_status_history (complaint_id, status, comment, changed_by) VALUES (3, 'Resolved', 'Replaced 6 LED fixtures', 4);`);

    db.run(`INSERT OR IGNORE INTO resolutions (complaint_id, officer_id, description, evidence_image_url) VALUES (3, 3, 'Successfully inspected the 4th Cross Lane line. Replaced 6 burnt-out 120W LED fixtures and repaired broken underground wiring conduit. All streetlights tested and fully operational.', 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop');`);
    db.run(`INSERT OR IGNORE INTO feedback (complaint_id, citizen_id, rating, resolution_status, comment) VALUES (3, 7, 5, 'Satisfied', 'Prompt action by the Electrical Department! The street is well lit now.');`);

    db.run(`INSERT INTO notifications (user_id, complaint_id, message) VALUES (5, 1, 'Your complaint CC-2026-0001 status changed to In Progress.');`);
    db.run(`INSERT INTO notifications (user_id, complaint_id, message) VALUES (7, 3, 'Your complaint CC-2026-0003 has been marked as RESOLVED.');`);
  });

  db.close();
  console.log('✅ Local embedded database seeded successfully!');

  console.log('\n=======================================================');
  console.log('🎉 CivicCare Test Accounts Ready:');
  console.log('Admin:       admin@civiccare.gov.in              / Admin@123');
  console.log('Officer PWD: officer.pwd@civiccare.gov.in        / Officer@123');
  console.log('Officer SAN: officer.sanitation@civiccare.gov.in / Officer@123');
  console.log('Officer ELE: officer.electrical@civiccare.gov.in / Officer@123');
  console.log('Citizen 1:   citizen1@gmail.com                  / Citizen@123');
  console.log('=======================================================\n');
}

function getSeedQueries(adminHash, officerHash, citizenHash) {
  return `
    INSERT INTO departments (id, name, description) VALUES
    (1, 'Public Works Department (PWD)', 'Road maintenance, potholes, pavement repairs, and public infrastructure.'),
    (2, 'Sanitation & Solid Waste Management', 'Municipal waste collection, garbage clearing, overflow bins, and public hygiene.'),
    (3, 'Electrical & Street Lighting', 'Streetlights, broken poles, exposed wiring, and public electrical fixtures.'),
    (4, 'Water Supply & Sewage', 'Potable water distribution pipelines, main leakages, and clean water contamination issues.'),
    (5, 'Urban Drainage Management', 'Stormwater drains, blocked gutters, monsoon overflow, and sewage line repairs.')
    ON DUPLICATE KEY UPDATE name=VALUES(name);

    DELETE FROM users;
    INSERT INTO users (id, name, email, phone, password, role, address) VALUES
    (1, 'System Administrator', 'admin@civiccare.gov.in', '9876543210', '${adminHash}', 'admin', 'Civic HQ, Smart City'),
    (2, 'Rajesh Kumar (PWD Officer)', 'officer.pwd@civiccare.gov.in', '9876543211', '${officerHash}', 'officer', 'PWD Division Office, Sector 4'),
    (3, 'Priya Sharma (Sanitation Officer)', 'officer.sanitation@civiccare.gov.in', '9876543212', '${officerHash}', 'officer', 'Sanitation Zone 2, Green Park'),
    (4, 'Vikram Singh (Electrical Officer)', 'officer.electrical@civiccare.gov.in', '9876543213', '${officerHash}', 'officer', 'Electricity Board Office'),
    (5, 'Aarav Patel', 'citizen1@gmail.com', '9876543214', '${citizenHash}', 'citizen', 'Flat 402, Sunrise Apartments, MG Road'),
    (6, 'Sneha Reddy', 'citizen2@gmail.com', '9876543215', '${citizenHash}', 'citizen', 'House 12B, Rose Villa, Indiranagar'),
    (7, 'Rohan Mehta', 'citizen3@gmail.com', '9876543216', '${citizenHash}', 'citizen', 'Plot 88, Tech Park Avenue'),
    (8, 'Ananya Gupta', 'citizen4@gmail.com', '9876543217', '${citizenHash}', 'citizen', '7th Cross, Koramangala 4th Block'),
    (9, 'Kabir Das', 'citizen5@gmail.com', '9876543218', '${citizenHash}', 'citizen', 'Villa 19, Palm Meadows');

    DELETE FROM officers;
    INSERT INTO officers (id, user_id, department_id, employee_id, active_status) VALUES
    (1, 2, 1, 'EMP-PWD-001', 1),
    (2, 3, 2, 'EMP-SAN-002', 1),
    (3, 4, 3, 'EMP-ELE-003', 1);

    DELETE FROM complaints;
    INSERT INTO complaints (id, complaint_number, citizen_id, category, title, description, image_url, latitude, longitude, location_address, priority, status, department_id, officer_id, created_at) VALUES
    (1, 'CC-2026-0001', 5, 'Pothole', 'Deep crater pothole on Main Road near Bus Stop', 'A massive pothole has formed right near the bus stop causing severe traffic jams.', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop', 12.971598, 77.594566, 'MG Road Bus Stand, Near Metro Pillar 142', 'High', 'In Progress', 1, 1, NOW() - INTERVAL 4 DAY),
    (2, 'CC-2026-0002', 6, 'Waste Disposal', 'Overflowing garbage dump outside Residential School', 'Unattended garbage pile accumulating for 5 days.', 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop', 12.978300, 77.640800, 'Outside St. Jude High School, Indiranagar 10th Main', 'Critical', 'Assigned', 2, 2, NOW() - INTERVAL 3 DAY),
    (3, 'CC-2026-0003', 7, 'Streetlight', 'Non-functional streetlights across entire 4th Cross Lane', 'All 6 streetlights on 4th Cross have been dark for a week.', 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=800&auto=format&fit=crop', 12.916500, 77.610100, '4th Cross Road, BTM Layout 2nd Stage', 'Medium', 'Resolved', 3, 3, NOW() - INTERVAL 6 DAY),
    (4, 'CC-2026-0004', 8, 'Water Leakage', 'Pipeline burst leaking thousands of liters of clean water', 'Main supply line ruptured near the public park entrance.', 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop', 12.935200, 77.624500, 'Koramangala 4th Block Park Gate', 'Critical', 'Under Review', 4, NULL, NOW() - INTERVAL 1 DAY),
    (5, 'CC-2026-0005', 9, 'Drainage', 'Blocked stormwater drain causing waterlogging after rain', 'Plastic waste and construction debris blocking the drain.', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop', 12.969800, 77.749900, 'Whitefield Main Road, Opposite ITPL Gate 2', 'High', 'Submitted', NULL, NULL, NOW() - INTERVAL 12 HOUR);

    DELETE FROM complaint_status_history;
    INSERT INTO complaint_status_history (complaint_id, status, comment, changed_by, created_at) VALUES
    (1, 'Submitted', 'Grievance submitted by citizen', 5, NOW() - INTERVAL 4 DAY),
    (1, 'In Progress', 'Asphalt repair team dispatched', 2, NOW() - INTERVAL 2 DAY),
    (3, 'Resolved', 'Replaced 6 LED fixtures', 4, NOW() - INTERVAL 1 DAY);

    DELETE FROM resolutions;
    INSERT INTO resolutions (complaint_id, officer_id, description, evidence_image_url, resolved_at) VALUES
    (3, 3, 'Successfully inspected the 4th Cross Lane line. Replaced 6 burnt-out 120W LED fixtures and repaired broken underground wiring conduit.', 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop', NOW() - INTERVAL 1 DAY);

    DELETE FROM feedback;
    INSERT INTO feedback (complaint_id, citizen_id, rating, resolution_status, comment, created_at) VALUES
    (3, 7, 5, 'Satisfied', 'Prompt action by the Electrical Department! The street is well lit now.', NOW() - INTERVAL 12 HOUR);

    DELETE FROM notifications;
    INSERT INTO notifications (user_id, complaint_id, message, is_read, created_at) VALUES
    (5, 1, 'Your complaint CC-2026-0001 status changed to In Progress.', 0, NOW() - INTERVAL 2 DAY),
    (7, 3, 'Your complaint CC-2026-0003 has been marked as RESOLVED.', 1, NOW() - INTERVAL 1 DAY);
  `;
}

if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
