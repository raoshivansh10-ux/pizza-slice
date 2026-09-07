import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/db.js';
import PizzaOption from '../models/PizzaOption.js';

dotenv.config();

export const defaultPizzaOptions = [
  // --- 5 BASES (lowStockThreshold: 20, stockQty: 50) ---
  {
    name: 'Classic Hand Tossed',
    type: 'base',
    price: 50,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Crispy Thin Crust',
    type: 'base',
    price: 60,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Cheese Burst Crust',
    type: 'base',
    price: 120,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Whole Wheat Organic Crust',
    type: 'base',
    price: 75,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Gluten-Free Artisan Crust',
    type: 'base',
    price: 130,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },

  // --- 5 SAUCES (lowStockThreshold: 20, stockQty: 50) ---
  {
    name: 'Classic San Marzano Marinara',
    type: 'sauce',
    price: 30,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Spicy Arrabiata Fire Sauce',
    type: 'sauce',
    price: 35,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Creamy Garlic Alfredo',
    type: 'sauce',
    price: 45,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Smoky Texas BBQ',
    type: 'sauce',
    price: 40,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Fresh Basil & Herb Pesto',
    type: 'sauce',
    price: 55,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },

  // --- 4 CHEESES (lowStockThreshold: 20, stockQty: 50) ---
  {
    name: 'Fresh Fior Di Latte Mozzarella',
    type: 'cheese',
    price: 50,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Aged Sharp Cheddar Blend',
    type: 'cheese',
    price: 60,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Smoked Gouda & Provolone',
    type: 'cheese',
    price: 75,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Creamy Italian Ricotta',
    type: 'cheese',
    price: 65,
    stockQty: 50,
    lowStockThreshold: 20,
    isActive: true,
    lastNotifiedAt: null,
  },

  // --- 8 VEGETABLES (lowStockThreshold: 15, stockQty: 50) ---
  {
    name: 'Tricolor Bell Pepper Medley',
    type: 'veggie',
    price: 25,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Caramelized Red Onions',
    type: 'veggie',
    price: 20,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Sliced Fresh Button Mushrooms',
    type: 'veggie',
    price: 30,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Kalamata Black Olives',
    type: 'veggie',
    price: 35,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Fire-Roasted Jalapeños',
    type: 'veggie',
    price: 25,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Sweet Tender Golden Corn',
    type: 'veggie',
    price: 20,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Fresh Farm Baby Spinach',
    type: 'veggie',
    price: 25,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
  {
    name: 'Sun-Dried Cherry Tomatoes',
    type: 'veggie',
    price: 40,
    stockQty: 50,
    lowStockThreshold: 15,
    isActive: true,
    lastNotifiedAt: null,
  },
];

const seedPizzaOptions = async () => {
  console.log('\n======================================================');
  console.log('🍕 Pizza App - Pizza Options & Inventory Seeding');
  console.log('======================================================');

  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log(`[Seed] Seeding ${defaultPizzaOptions.length} pizza options...`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of defaultPizzaOptions) {
      const existing = await PizzaOption.findOne({ name: item.name, type: item.type });
      if (existing) {
        existing.price = item.price;
        existing.stockQty = item.stockQty;
        existing.lowStockThreshold = item.lowStockThreshold;
        existing.isActive = item.isActive;
        await existing.save();
        updatedCount++;
      } else {
        await PizzaOption.create(item);
        createdCount++;
      }
    }

    const counts = {
      bases: await PizzaOption.countDocuments({ type: 'base' }),
      sauces: await PizzaOption.countDocuments({ type: 'sauce' }),
      cheeses: await PizzaOption.countDocuments({ type: 'cheese' }),
      veggies: await PizzaOption.countDocuments({ type: 'veggie' }),
    };

    console.log('------------------------------------------------------');
    console.log(`✅ Seeding Complete: ${createdCount} created, ${updatedCount} updated.`);
    console.log(`📦 Summary by Type:`);
    console.log(`   - Bases:       ${counts.bases}`);
    console.log(`   - Sauces:      ${counts.sauces}`);
    console.log(`   - Cheeses:     ${counts.cheeses}`);
    console.log(`   - Vegetables:  ${counts.veggies}`);
    console.log(`   - Total Items: ${counts.bases + counts.sauces + counts.cheeses + counts.veggies}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Seeding pizza options failed:', error.message);
    process.exit(1);
  } finally {
    await closeDB();
    console.log('[Seed] Database connection closed.');
  }
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seedPizzaOptions.js')) {
  seedPizzaOptions();
}

export default seedPizzaOptions;
