import axios from 'axios';

async function verifyLiveCatalog() {
  const res = await axios.get('http://localhost:5000/api/menu');
  const items = res.data.menuItems;
  const combosRes = await axios.get('http://localhost:5000/api/combos');
  const combos = combosRes.data.combos;

  console.log(`\n========================================================================================`);
  console.log(`🎉 LIVE API VERIFICATION: ${items.length} MENU ITEMS + ${combos.length} COMBOS`);
  console.log(`========================================================================================\n`);

  items.forEach((it, i) => {
    console.log(`[${i + 1}] [${it.category.toUpperCase().padEnd(12)}] "${it.name}" (Base: ₹${it.basePrice})`);
    console.log(`     📸 URL: ${it.image}`);
    if (it.tags && it.tags.length > 0) {
      console.log(`     🏷️  Tags: ${it.tags.join(', ')}`);
    }
  });

  console.log(`\n--- COMBOS ---`);
  combos.forEach((cb, i) => {
    console.log(`[Combo ${i + 1}] "${cb.name}" (₹${cb.comboPrice} / was ₹${cb.originalPrice})`);
    console.log(`     📸 URL: ${cb.image}`);
  });
}

verifyLiveCatalog().catch((err) => console.error(err.message));
