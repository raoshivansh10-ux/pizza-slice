import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API = 'http://localhost:5000/api';

async function runRegisterOtpTests() {
  console.log('====================================================');
  console.log('🍕 STARTING REGISTRATION OTP INTEGRATION TESTS');
  console.log('====================================================\n');

  const testEmail = `pizzanewbie_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Luigi Rossi';

  // 1. Register new user and request OTP
  console.log(`📌 [Step 1] Calling POST /api/auth/register for: ${testEmail}`);
  try {
    const res = await axios.post(`${API}/auth/register`, {
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    console.log('   ✅ Register response status:', res.status);
    console.log('   ✅ Register response data:', res.data);

    if (!res.data.success) {
      throw new Error('Expected res.data.success to be true');
    }
    // Security check: ensure no OTP or token leaks
    if (res.data.otp || res.data.code || res.data.devToken) {
      throw new Error('SECURITY VIOLATION: Plaintext OTP or devToken leaked in register response!');
    }
    console.log('   🔒 Security check passed: Zero plaintext codes or tokens returned in response.');
  } catch (err) {
    console.error('   ❌ Register request failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 2. Test 60-second cooldown on registration resend
  console.log('\n📌 [Step 2] Testing 60-second resend cooldown on register endpoint...');
  try {
    await axios.post(`${API}/auth/register`, {
      name: testName,
      email: testEmail,
      password: testPassword,
    });
    console.error('   ❌ Cooldown failed to block immediate second registration request!');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 429) {
      console.log('   ✅ Passed: Cooldown properly blocked rapid resend (Status 429):', err.response.data.error);
    } else {
      console.error('   ❌ Unexpected status for cooldown:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // 3. Test wrong OTP on verify-otp
  console.log('\n📌 [Step 3] Testing verification with incorrect OTP...');
  try {
    await axios.post(`${API}/auth/verify-otp`, {
      email: testEmail,
      otp: '000000',
    });
    console.error('   ❌ Invalid OTP was accepted!');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 400 && err.response.data.error.includes('Invalid verification code')) {
      console.log('   ✅ Passed: Incorrect OTP rejected with "Invalid verification code":', err.response.data.error);
    } else {
      console.error('   ❌ Unexpected response for invalid OTP:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  // 4. Test legacy /verify-email/:token endpoint returns friendly OTP message
  console.log('\n📌 [Step 4] Testing deprecated /verify-email/:token endpoint...');
  try {
    await axios.get(`${API}/auth/verify-email/dummy_legacy_token`);
    console.error('   ❌ Legacy endpoint unexpectedly returned 200!');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 400 && err.response.data.useOtp) {
      console.log('   ✅ Passed: Legacy token route correctly redirects to OTP guidance:', err.response.data.error);
    } else {
      console.error('   ❌ Unexpected response for legacy route:', err.response?.status, err.response?.data);
      process.exit(1);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 REGISTRATION OTP API INTEGRATION TESTS PASSED');
  console.log('====================================================\n');
}

runRegisterOtpTests();
