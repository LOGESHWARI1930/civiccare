const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'civiccare_jwt_secret_key_2026_smart_city_system';

const tokenCitizen = jwt.sign({ id: 5, name: 'Aarav Patel', role: 'citizen' }, secret, { expiresIn: '1h' });
const tokenOfficer = jwt.sign({ id: 2, name: 'Rajesh Kumar', role: 'officer' }, secret, { expiresIn: '1h' });

async function testProfile() {
  const headersCit = { 'Authorization': 'Bearer ' + tokenCitizen, 'Content-Type': 'application/json' };
  const headersOff = { 'Authorization': 'Bearer ' + tokenOfficer, 'Content-Type': 'application/json' };

  // 1. GET Citizen Profile
  const r1 = await fetch('http://localhost:5000/api/profile', { headers: headersCit });
  const d1 = await r1.json();
  console.log('Test 1 - Citizen Profile:', d1.profile?.name, '| Email:', d1.profile?.email, '| Role:', d1.profile?.role);

  // 2. GET Officer Profile
  const r2 = await fetch('http://localhost:5000/api/profile', { headers: headersOff });
  const d2 = await r2.json();
  console.log('Test 2 - Officer Profile:', d2.profile?.name, '| Emp ID:', d2.profile?.employee_id, '| Dept:', d2.profile?.department_name, '| Active:', d2.profile?.active_status);

  // 3. PUT Profile update
  const r3 = await fetch('http://localhost:5000/api/profile', {
    method: 'PUT',
    headers: headersCit,
    body: JSON.stringify({ name: 'Aarav Patel', phone: '9876543214', address: 'MG Road Flat 402' })
  });
  const d3 = await r3.json();
  console.log('Test 3 - Update Profile:', d3.message);

  // 4. Role Change Prevention
  const r4 = await fetch('http://localhost:5000/api/profile', {
    method: 'PUT',
    headers: headersCit,
    body: JSON.stringify({ name: 'Aarav Patel', role: 'admin' })
  });
  const d4 = await r4.json();
  console.log('Test 4 - Role Change Prevention (Status ' + r4.status + '):', d4.message);

  // 5. Password Update with Bcrypt Verification
  const r5 = await fetch('http://localhost:5000/api/profile/password', {
    method: 'PUT',
    headers: headersCit,
    body: JSON.stringify({
      currentPassword: 'Citizen@123',
      newPassword: 'CitizenNew@123',
      confirmPassword: 'CitizenNew@123'
    })
  });
  const d5 = await r5.json();
  console.log('Test 5 - Password Update:', d5.message);

  // Reset Password Back
  const r6 = await fetch('http://localhost:5000/api/profile/password', {
    method: 'PUT',
    headers: headersCit,
    body: JSON.stringify({
      currentPassword: 'CitizenNew@123',
      newPassword: 'Citizen@123',
      confirmPassword: 'Citizen@123'
    })
  });
  const d6 = await r6.json();
  console.log('Password Reset Back:', d6.success);

  process.exit(0);
}

testProfile().catch(err => {
  console.error(err);
  process.exit(1);
});
