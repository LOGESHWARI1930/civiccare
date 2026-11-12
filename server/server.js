const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets and pages
app.use(express.static(path.join(__dirname, '../client')));
app.use('/assets/uploads', express.static(path.join(__dirname, '../client/assets/uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/citizen', require('./routes/citizenRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/officers', require('./routes/officerRoutes'));
app.use('/api/officer', require('./routes/officerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

// Explicit Dashboard & Portal Route Aliases
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/profile.html'));
});
app.get('/citizen/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/citizen-dashboard.html'));
});

app.get('/citizen/report', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/create-complaint.html'));
});

app.get('/citizen/complaints', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/my-complaints.html'));
});

app.get('/citizen/complaints/:id/feedback', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/feedback.html'));
});

app.get('/citizen/complaints/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/complaint-details.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/notifications.html'));
});

app.get('/officer/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/officer-dashboard.html'));
});

app.get('/officer/complaints/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/officer-complaint-details.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin-dashboard.html'));
});

app.get('/admin/departments', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin-departments.html'));
});

app.get('/admin/officers', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin-officers.html'));
});

app.get('/admin/complaints', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin-complaints.html'));
});

app.get('/admin/complaints/:id/assign', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin-assign-complaint.html'));
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'CivicCare Smart City Grievance Management System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend SPA fallback / pages router
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Check if file exists directly in client folder
  const rootClientPath = path.join(__dirname, '../client', req.path);
  if (require('fs').existsSync(rootClientPath) && !require('fs').statSync(rootClientPath).isDirectory()) {
    return res.sendFile(rootClientPath);
  }

  // Default to index.html
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 CivicCare Server running on http://localhost:${PORT}`);
  console.log(`=======================================================`);
  await testConnection();
});
