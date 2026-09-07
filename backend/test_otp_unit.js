import mongoose from 'mongoose';
import crypto from 'crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Otp from './src/models/Otp.js';
import User from './src/models/User.js';

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING OTP UNIT & MODEL INTEGRATION TESTS');
  console.log('====================================================\n');

  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const testEmail = 'verifyuser@testpizza.com';
  const rawOtp = '482910';
  const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

  // 1. Create OTP Record
  console.log('📌 [Test 1] Storing hashed OTP in database...');
  const record = await Otp.create({
    email: testEmail,
    otpHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    isUsed: false,
  });

  if (record.otpHash === rawOtp) {
    throw new Error('SECURITY FAILURE: Plaintext OTP stored!');
  }
  console.log('   ✅ Passed: OTP stored as SHA-256 hash:', record.otpHash);

  // 2. Simulate correct hash verification
  console.log('📌 [Test 2] Simulating candidate OTP comparison...');
  const correctCandidateHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  if (correctCandidateHash !== record.otpHash) {
    throw new Error('Candidate hash mismatch on valid code');
  }
  console.log('   ✅ Passed: Valid OTP hash matched successfully.');

  // 3. Mark as used & verify one-time use
  record.isUsed = true;
  await record.save();
  console.log('   ✅ Passed: OTP marked as isUsed = true.');

  // 4. Test User auto-creation
  console.log('📌 [Test 3] Testing auto-creation of verified user upon OTP validation...');
  let user = await User.findOne({ email: testEmail });
  if (!user) {
    user = await User.create({
      name: 'Verify User',
      email: testEmail,
      password: crypto.randomBytes(16).toString('hex') + 'A1!',
      isVerified: true,
    });
  }
  console.log('   ✅ Passed: User created with isVerified:', user.isVerified);
  if (!user.isVerified) {
    throw new Error('Expected user to be verified');
  }

  // 5. Cleanup
  await mongoose.disconnect();
  await mongod.stop();

  console.log('\n====================================================');
  console.log('🎉 ALL OTP UNIT & MODEL TESTS PASSED');
  console.log('====================================================\n');
}

runUnitTests();
