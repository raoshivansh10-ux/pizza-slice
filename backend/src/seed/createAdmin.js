import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/db.js';
import Admin from '../models/Admin.js';

// Load environment variables from backend root .env
dotenv.config();

const createAdmin = async () => {
  console.log('\n======================================================');
  console.log('🍕 Pizza App - Admin Seeding Script');
  console.log('======================================================');

  const email = process.env.ADMIN_SEED_EMAIL || 'admin@pizzadelivery.com';
  const password = process.env.ADMIN_SEED_PASSWORD || 'AdminSecurePassword123!';
  const name = process.env.ADMIN_SEED_NAME || 'Super Administrator';

  if (!email || !password) {
    console.error('❌ Error: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be configured.');
    process.exit(1);
  }

  try {
    console.log(`[Seed] Connecting to database...`);
    await connectDB();

    // Check if an admin with this email already exists
    let admin = await Admin.findOne({ email: email.toLowerCase() });

    if (admin) {
      console.log(`[Seed] Admin already exists for email: ${admin.email}`);
      console.log(`[Seed] Updating password and details for existing admin...`);
      admin.name = name;
      admin.password = password; // pre-save hook will hash the new password
      await admin.save();
      console.log(`✅ Admin account updated successfully!`);
    } else {
      console.log(`[Seed] Creating new admin account...`);
      admin = new Admin({
        name,
        email: email.toLowerCase(),
        password, // pre-save hook will hash password with bcrypt
        role: 'admin',
      });
      await admin.save();
      console.log(`✅ New Admin account created successfully!`);
    }

    console.log('------------------------------------------------------');
    console.log(`👑 Admin Name:  ${admin.name}`);
    console.log(`📧 Admin Email: ${admin.email}`);
    console.log(`🛡️  Role:        ${admin.role}`);
    console.log(`🆔 ID:          ${admin._id}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Admin seed failed:', error.message);
    process.exit(1);
  } finally {
    await closeDB();
    console.log('[Seed] Database connection closed cleanly.');
  }
};

createAdmin();
