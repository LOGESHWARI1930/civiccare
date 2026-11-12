const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'civiccare_jwt_secret_key_2026_smart_city_system';
const tokenAdmin = jwt.sign({ id: 1, name: 'System Administrator', role: 'admin' }, secret, { expiresIn: '1h' });

async function testDept() {
  const headers = { 'Authorization': 'Bearer ' + tokenAdmin, 'Content-Type': 'application/json' };

  // 1. GET /api/admin/departments
  const r1 = await fetch('http://localhost:5000/api/admin/departments', { headers });
  const d1 = await r1.json();
  console.log('Test 1 - GET /api/admin/departments -> Count:', d1.departments?.length);
  if (d1.departments?.length > 0) {
    const sample = d1.departments[0];
    console.log('Sample Dept:', sample.name, '| Officers:', sample.officer_count, '| Active:', sample.active_complaints, '| Resolved:', sample.resolved_complaints);
  }

  // 2. POST /api/admin/departments (Create new department)
  const r2 = await fetch('http://localhost:5000/api/admin/departments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Parks & Public Gardens Maintenance',
      description: 'Public parks, urban trees, lawn maintenance, and botanical gardens.'
    })
  });
  const d2 = await r2.json();
  console.log('Test 2 - POST Department:', d2.message, '| Created ID:', d2.department?.id);
  const createdId = d2.department?.id;

  // 3. PUT /api/admin/departments/:id (Update)
  if (createdId) {
    const r3 = await fetch(`http://localhost:5000/api/admin/departments/${createdId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Parks & Public Gardens Maintenance',
        description: 'Updated description: Urban parks, children play areas, and green zones.'
      })
    });
    const d3 = await r3.json();
    console.log('Test 3 - PUT Department Update:', d3.message);
  }

  // 4. DELETE Dependent Department (Department 1 - expect 400 Bad Request error)
  const r4 = await fetch('http://localhost:5000/api/admin/departments/1', {
    method: 'DELETE',
    headers
  });
  const d4 = await r4.json();
  console.log('Test 4 - Safe Deletion Prevention for Dept 1 (Status ' + r4.status + '):', d4.message);

  // 5. DELETE Created Unused Department
  if (createdId) {
    const r5 = await fetch(`http://localhost:5000/api/admin/departments/${createdId}`, {
      method: 'DELETE',
      headers
    });
    const d5 = await r5.json();
    console.log('Test 5 - Safe Deletion of Unused Dept:', d5.message);
  }

  process.exit(0);
}

testDept().catch(err => {
  console.error(err);
  process.exit(1);
});
