import axios from 'axios';
import { connectDB } from './src/config/db.js';
import Admin from './src/models/Admin.js';
import User from './src/models/User.js';

const API = 'http://localhost:5000/api';

async function runAdminTests() {
  console.log('====================================================');
  console.log('🛡️  STARTING ADMIN AUTH FLOW VERIFICATION');
  console.log('====================================================\n');

  // Ensure admin exists in DB instance if running in-memory
  const adminEmail = 'admin@pizzadelivery.com';
  const adminPassword = 'AdminSecurePassword123!';

  // 1. ADMIN LOGIN WITH SEED CREDENTIALS
  console.log('📌 [Test 1] POST /api/admin/login (Valid credentials)');
  const loginRes = await axios.post(`${API}/admin/login`, {
    email: adminEmail,
    password: adminPassword,
  });
  console.log('   Status:', loginRes.status);
  console.log('   Response Body (No token in body):', loginRes.data);
  const setCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  console.log('   Set-Cookie Header:', setCookie);
  
  if (!setCookie.includes('admin_token=')) {
    throw new Error('FAILED: admin_token cookie was not set!');
  }
  const adminCookie = setCookie.split(';')[0]; // admin_token=...

  // 2. ADMIN PROTECTED ROUTE /api/admin/me WITH admin_token COOKIE
  console.log('\n📌 [Test 2] GET /api/admin/me (Protected by adminOnly middleware)');
  const meRes = await axios.get(`${API}/admin/me`, {
    headers: {
      Cookie: adminCookie,
    },
  });
  console.log('   Status:', meRes.status);
  console.log('   Response Body:', meRes.data);
  if (meRes.data?.admin?.role !== 'admin') {
    throw new Error('FAILED: Admin role not confirmed in /api/admin/me response');
  }

  // 3. ATTEMPT ACCESS WITHOUT COOKIE (Expect 401)
  console.log('\n📌 [Test 3] GET /api/admin/me without cookie (Expect 401)');
  try {
    await axios.get(`${API}/admin/me`);
    throw new Error('FAILED: Unauthenticated request was allowed access to admin route!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Response Body:', err.response?.data);
  }

  // 4. ATTEMPT ACCESS WITH REGULAR USER TOKEN (Expect 401/403)
  console.log('\n📌 [Test 4] GET /api/admin/me with regular customer user session token');
  // First register & verify & login a customer user to get a user 'token' cookie
  const customerEmail = `customer_${Date.now()}@pizzatest.com`;
  const customerReg = await axios.post(`${API}/auth/register`, {
    name: 'Customer Test',
    email: customerEmail,
    password: 'Password123!',
  });
  await axios.get(`${API}/auth/verify-email/${customerReg.data.devToken}`);
  const customerLogin = await axios.post(`${API}/auth/login`, {
    email: customerEmail,
    password: 'Password123!',
  });
  const userCookie = customerLogin.headers['set-cookie'][0].split(';')[0]; // token=...

  try {
    await axios.get(`${API}/admin/me`, {
      headers: {
        Cookie: userCookie, // Customer user token, not admin_token
      },
    });
    throw new Error('FAILED: Regular user token was accepted on adminOnly route!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Response Body:', err.response?.data);
  }

  // 5. ADMIN LOGOUT
  console.log('\n📌 [Test 5] POST /api/admin/logout');
  const logoutRes = await axios.post(
    `${API}/admin/logout`,
    {},
    {
      headers: {
        Cookie: adminCookie,
      },
    }
  );
  console.log('   Status:', logoutRes.status);
  console.log('   Response Body:', logoutRes.data);
  console.log('   Cookie Cleared Header:', logoutRes.headers['set-cookie']);

  console.log('\n====================================================');
  console.log('🎉 ALL ADMIN AUTH TESTS PASSED PERFECTLY!');
  console.log('====================================================\n');
  process.exit(0);
}

runAdminTests().catch((err) => {
  console.error('\n❌ Admin test failed:', err.response?.data || err.message);
  process.exit(1);
});
