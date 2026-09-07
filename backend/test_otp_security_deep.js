import axios from 'axios';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Otp from './src/models/Otp.js';
import User from './src/models/User.js';

const API = 'http://localhost:5000/api';

async function runDeepSecurityTests() {
  console.log('====================================================');
  console.log('🛡️ RUNNING DEEP SECURITY & LOCKOUT TESTS');
  console.log('====================================================\n');

  // Connect to dev in-memory DB or local DB
  // Check the DB connection from server log: mongodb://127.0.0.1:49688/ or find connection
  // Instead of querying MongoDB directly if port varies, let's test via a controlled test endpoint or direct test!
  // Wait! In node, we can import Otp and test the hashing and model directly, AND we can run end-to-end tests!
  
  // Let's test lockout via 5 consecutive wrong attempts on an email
  const lockoutEmail = `lockout_user_${Date.now()}@example.com`;
  console.log(`📌 [Step 1] Requesting OTP for brute-force lockout test: ${lockoutEmail}`);
  await axios.post(`${API}/auth/send-otp`, { email: lockoutEmail });

  console.log('📌 [Step 2] Sending 5 consecutive incorrect OTP attempts...');
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await axios.post(`${API}/auth/verify-otp`, {
        email: lockoutEmail,
        otp: `11111${attempt}`,
      });
      console.error(`   ❌ Attempt ${attempt} was unexpectedly accepted!`);
      process.exit(1);
    } catch (err) {
      console.log(`   Attempt ${attempt} rejected as expected. Remaining: ${err.response?.data?.remainingAttempts}`);
    }
  }

  // 5th attempt should lock out the code!
  try {
    await axios.post(`${API}/auth/verify-otp`, {
      email: lockoutEmail,
      otp: '111115',
    });
    console.error('   ❌ 5th attempt was unexpectedly accepted!');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 429 && err.response.data.isLocked) {
      console.log('   ✅ Passed: 5th failed attempt successfully triggered security lockout (Status 429)!');
      console.log('      Response:', err.response.data.error);
    } else {
      console.error('   ❌ Expected 429 lockout but received:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // 6th attempt should also remain blocked/inactive
  try {
    await axios.post(`${API}/auth/verify-otp`, {
      email: lockoutEmail,
      otp: '999999',
    });
    console.error('   ❌ Subsequent attempt on locked code was accepted!');
    process.exit(1);
  } catch (err) {
    console.log('   ✅ Passed: Subsequent attempts on locked code remain rejected.');
  }

  console.log('\n====================================================');
  console.log('🎉 DEEP SECURITY & LOCKOUT TESTS PASSED');
  console.log('====================================================\n');
}

runDeepSecurityTests();
