import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import { seedMenuAndCombos } from './src/utils/seedMenuData.js';
import MenuItem from './src/models/MenuItem.js';
import ComboOffer from './src/models/ComboOffer.js';

dotenv.config();

async function runReseed() {
  await connectDB();
  console.log('🔄 Re-seeding menu catalog with force=true...');
  await seedMenuAndCombos(true);

  // Fetch sample items across categories to output and verify
  const samplePizza = await MenuItem.findOne({ category: 'pizza' });
  const sampleDessert = await MenuItem.findOne({ category: 'desserts' });
  const sampleDrink = await MenuItem.findOne({ category: 'drinks' });
  const sampleBread = await MenuItem.findOne({ category: 'garlic-bread' });
  const sampleSide = await MenuItem.findOne({ category: 'sides' });
  const sampleCombo = await ComboOffer.findOne({});

  console.log('\n======================================================');
  console.log('📸 SEEDED ITEM IMAGES VERIFICATION');
  console.log('======================================================');
  console.log(`🍕 PIZZA:    "${samplePizza.name}"`);
  console.log(`   Image URL: ${samplePizza.image}`);
  console.log(`\n🍰 DESSERT:  "${sampleDessert.name}"`);
  console.log(`   Image URL: ${sampleDessert.image}`);
  console.log(`\n🍹 DRINK:    "${sampleDrink.name}"`);
  console.log(`   Image URL: ${sampleDrink.image}`);
  console.log(`\n🥖 BREAD:    "${sampleBread.name}"`);
  console.log(`   Image URL: ${sampleBread.image}`);
  console.log(`\n🍟 SIDE:     "${sampleSide.name}"`);
  console.log(`   Image URL: ${sampleSide.image}`);
  console.log(`\n🎁 COMBO:    "${sampleCombo.name}"`);
  console.log(`   Image URL: ${sampleCombo.image}`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runReseed().catch((err) => {
  console.error('Reseed error:', err);
  process.exit(1);
});
