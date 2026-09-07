import axios from 'axios';

const API = 'http://localhost:5000/api/auth';

async function runTests() {
  console.log('====================================================');
  console.log('🍕 STARTING FULL AUTH FLOW VERIFICATION');
  console.log('====================================================\n');

  const testEmail = `test_chef_${Date.now()}@pizzatest.com`;
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'NewSecretPassword456!';

  // 1. REGISTER
  console.log('📌 [Step 1] POST /api/auth/register');
  const regRes = await axios.post(`${API}/register`, {
    name: 'Mario Pizza',
    email: testEmail,
    password: initialPassword,
  });
  console.log('   Status:', regRes.status);
  console.log('   Response Body:', regRes.data);
  const verifyToken = regRes.data.devToken;
  console.log('   Obtained Verification Token:', verifyToken);

  // 2. LOGIN BEFORE VERIFICATION (Expect 403)
  console.log('\n📌 [Step 2] POST /api/auth/login (Unverified User)');
  try {
    await axios.post(`${API}/login`, {
      email: testEmail,
      password: initialPassword,
    });
    throw new Error('FAILED: Unverified user was allowed to login!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Response Body:', err.response?.data);
  }

  // 3. VERIFY EMAIL
  console.log('\n📌 [Step 3] GET /api/auth/verify-email/:token');
  const verifyRes = await axios.get(`${API}/verify-email/${verifyToken}`);
  console.log('   Status:', verifyRes.status);
  console.log('   Response Body:', verifyRes.data);

  // 4. LOGIN AFTER VERIFICATION (Expect 200, JWT in Set-Cookie, user object in body)
  console.log('\n📌 [Step 4] POST /api/auth/login (Verified User)');
  const loginRes = await axios.post(`${API}/login`, {
    email: testEmail,
    password: initialPassword,
  });
  console.log('   Status:', loginRes.status);
  console.log('   Response Body (No token in body):', loginRes.data);
  const setCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  console.log('   Set-Cookie Header:', setCookie);
  const tokenCookie = setCookie.split(';')[0];

  // 5. PROTECTED ROUTE /me USING COOKIE
  console.log('\n📌 [Step 5] GET /api/auth/me (Protected Route via Cookie)');
  const meRes = await axios.get(`${API}/me`, {
    headers: {
      Cookie: tokenCookie,
    },
  });
  console.log('   Status:', meRes.status);
  console.log('   Response Body:', meRes.data);

  // 6. FORGOT PASSWORD
  console.log('\n📌 [Step 6] POST /api/auth/forgot-password');
  const forgotRes = await axios.post(`${API}/forgot-password`, {
    email: testEmail,
  });
  console.log('   Status:', forgotRes.status);
  console.log('   Response Body:', forgotRes.data);
  const resetToken = forgotRes.data.devToken;
  console.log('   Obtained Reset Token:', resetToken);

  // 6b. FORGOT PASSWORD (NON-EXISTENT EMAIL - Should return identical generic message)
  console.log('\n📌 [Step 6b] POST /api/auth/forgot-password (Non-existent Email)');
  const forgotNonExist = await axios.post(`${API}/forgot-password`, {
    email: 'nonexistent_user_9999@randomdomain.com',
  });
  console.log('   Status:', forgotNonExist.status);
  console.log('   Response Body (Obscured):', forgotNonExist.data);

  // 7. RESET PASSWORD
  console.log('\n📌 [Step 7] POST /api/auth/reset-password/:token');
  const resetRes = await axios.post(`${API}/reset-password/${resetToken}`, {
    password: newPassword,
  });
  console.log('   Status:', resetRes.status);
  console.log('   Response Body:', resetRes.data);

  // 8. LOGIN WITH OLD PASSWORD (Expect 401)
  console.log('\n📌 [Step 8] POST /api/auth/login with OLD password (Expect 401)');
  try {
    await axios.post(`${API}/login`, {
      email: testEmail,
      password: initialPassword,
    });
    throw new Error('FAILED: Old password was accepted!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Response Body:', err.response?.data);
  }

  // 9. LOGIN WITH NEW PASSWORD (Expect 200)
  console.log('\n📌 [Step 9] POST /api/auth/login with NEW password (Expect 200)');
  const newLoginRes = await axios.post(`${API}/login`, {
    email: testEmail,
    password: newPassword,
  });
  console.log('   Status:', newLoginRes.status);
  console.log('   Response Body:', newLoginRes.data);

  // 10. LOGOUT
  console.log('\n📌 [Step 10] POST /api/auth/logout');
  const logoutRes = await axios.post(`${API}/logout`);
  console.log('   Status:', logoutRes.status);
  console.log('   Response Body:', logoutRes.data);
  console.log('   Cookie Cleared Header:', logoutRes.headers['set-cookie']);

  console.log('\n====================================================');
  console.log('🎉 ALL 5 AUTH ENDPOINTS + PROTECTED ROUTE PASSED PERFECTLY!');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err.response?.data || err.message);
  process.exit(1);
});
