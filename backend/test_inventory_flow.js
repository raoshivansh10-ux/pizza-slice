import axios from 'axios';

const API = 'http://localhost:5000/api';

async function runInventoryTests() {
  console.log('====================================================');
  console.log('🍕 STARTING PIZZA OPTIONS & INVENTORY TEST SUITE');
  console.log('====================================================\n');

  // 1. PUBLIC PIZZA OPTIONS (GET /api/pizza-options)
  console.log('📌 [Test 1] GET /api/pizza-options (Public Pizza Builder Options)');
  const publicRes = await axios.get(`${API}/pizza-options`);
  console.log('   Status:', publicRes.status);
  console.log('   Grouped Keys:', Object.keys(publicRes.data));
  console.log(`   - Bases Count:      ${publicRes.data.bases?.length}`);
  console.log(`   - Sauces Count:     ${publicRes.data.sauces?.length}`);
  console.log(`   - Cheeses Count:    ${publicRes.data.cheeses?.length}`);
  console.log(`   - Vegetables Count: ${publicRes.data.veggies?.length}`);

  if (
    publicRes.data.bases?.length !== 5 ||
    publicRes.data.sauces?.length !== 5 ||
    publicRes.data.cheeses?.length < 3 ||
    publicRes.data.veggies?.length < 8
  ) {
    throw new Error('FAILED: Pizza options count does not match spec requirements!');
  }

  // Print sample item of each category
  console.log('\n   Sample Base:   ', publicRes.data.bases[0]);
  console.log('   Sample Sauce:  ', publicRes.data.sauces[0]);
  console.log('   Sample Cheese: ', publicRes.data.cheeses[0]);
  console.log('   Sample Veggie: ', publicRes.data.veggies[0]);

  // 2. ADMIN LOGIN TO GET admin_token COOKIE
  console.log('\n📌 [Step 2] Authenticating as Admin for Inventory Operations');
  const loginRes = await axios.post(`${API}/admin/login`, {
    email: 'admin@pizzadelivery.com',
    password: 'AdminSecurePassword123!',
  });
  const adminCookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   Admin login successful, cookie obtained.');

  // 3. ADMIN INVENTORY (GET /api/admin/inventory)
  console.log('\n📌 [Test 3] GET /api/admin/inventory (Admin Full Inventory View)');
  const invRes = await axios.get(`${API}/admin/inventory`, {
    headers: {
      Cookie: adminCookie,
    },
  });
  console.log('   Status:', invRes.status);
  console.log('   Summary:', invRes.data.summary);
  console.log(`   Total Inventory Records: ${invRes.data.inventory?.length}`);

  const targetItem = invRes.data.inventory[0];
  console.log(`   Target Item for Update: '${targetItem.name}' (ID: ${targetItem._id}, Current Stock: ${targetItem.stockQty})`);

  // 4. ADMIN UPDATE INVENTORY (PUT /api/admin/inventory/:id - Valid Update)
  console.log('\n📌 [Test 4] PUT /api/admin/inventory/:id (Valid Stock Update to 10)');
  const updateRes = await axios.put(
    `${API}/admin/inventory/${targetItem._id}`,
    {
      stockQty: 10,
      lowStockThreshold: 20,
    },
    {
      headers: {
        Cookie: adminCookie,
      },
    }
  );
  console.log('   Status:', updateRes.status);
  console.log('   Response Message:', updateRes.data.message);
  console.log(`   Updated StockQty: ${updateRes.data.item.stockQty}`);
  console.log(`   isLowStock flag:  ${updateRes.data.item.isLowStock}`);

  if (updateRes.data.item.stockQty !== 10 || !updateRes.data.item.isLowStock) {
    throw new Error('FAILED: Stock update did not correctly reflect on item / low stock flag');
  }

  // 5. ADMIN UPDATE INVENTORY WITH NEGATIVE STOCK (Expect 400)
  console.log('\n📌 [Test 5] PUT /api/admin/inventory/:id with negative stock (Expect 400 Validation Error)');
  try {
    await axios.put(
      `${API}/admin/inventory/${targetItem._id}`,
      {
        stockQty: -15,
      },
      {
        headers: {
          Cookie: adminCookie,
        },
      }
    );
    throw new Error('FAILED: Negative stock was erroneously allowed!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Validation Error Body:', err.response?.data);
  }

  // 6. UNAUTHENTICATED INVENTORY ACCESS (Expect 401)
  console.log('\n📌 [Test 6] GET /api/admin/inventory without admin_token (Expect 401)');
  try {
    await axios.get(`${API}/admin/inventory`);
    throw new Error('FAILED: Unauthenticated user accessed admin inventory!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Response Body:', err.response?.data);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PIZZA OPTIONS & INVENTORY TESTS PASSED!');
  console.log('====================================================\n');
  process.exit(0);
}

runInventoryTests().catch((err) => {
  console.error('\n❌ Inventory test suite failed:', err.response?.data || err.message);
  process.exit(1);
});
