import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pizza-delivery';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (primaryError) {
    console.warn(`[MongoDB] Primary MongoDB (${mongoUri}) unavailable (${primaryError.message}).`);

    // In development/test, fallback to in-memory MongoDB
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[MongoDB] Starting in-memory MongoDB instance for local dev...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create({
          instance: {
            launchTimeout: 60000,
          },
        });
        const memUri = mongoMemoryServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[MongoDB] In-memory MongoDB connected successfully at: ${memUri}`);

        // Ensure default seeded admin is populated in local in-memory dev DB
        const Admin = (await import('../models/Admin.js')).default;
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
          const email = process.env.ADMIN_SEED_EMAIL || 'admin@pizzadelivery.com';
          const password = process.env.ADMIN_SEED_PASSWORD || 'AdminSecurePassword123!';
          const name = process.env.ADMIN_SEED_NAME || 'Super Administrator';
          await Admin.create({ name, email: email.toLowerCase(), password, role: 'admin' });
          console.log(`[Admin Seed] Auto-seeded initial admin (${email}) for in-memory dev.`);
        }

        // Ensure default pizza options are seeded in local in-memory dev DB
        const PizzaOption = (await import('../models/PizzaOption.js')).default;
        const optionCount = await PizzaOption.countDocuments();
        if (optionCount === 0) {
          const { defaultPizzaOptions } = await import('../seed/seedPizzaOptions.js');
          await PizzaOption.insertMany(defaultPizzaOptions);
          console.log(`[Options Seed] Auto-seeded ${defaultPizzaOptions.length} pizza options for in-memory dev.`);
        }

        // Ensure menu items and combo offers are seeded
        const { seedMenuAndCombos } = await import('../utils/seedMenuData.js');
        await seedMenuAndCombos(false);

        return conn;
      } catch (fallbackError) {
        console.error(`[MongoDB] In-memory fallback failed: ${fallbackError.message}`);
      }
    }

    // If connected to primary DB, also ensure menu and combos seeded
    try {
      const { seedMenuAndCombos } = await import('../utils/seedMenuData.js');
      await seedMenuAndCombos(false);
    } catch (_) {}

    console.warn('[MongoDB] Database unavailable. Operations requiring database will fail.');
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
