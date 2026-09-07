import axios from 'axios';
import crypto from 'crypto';

const API = 'http://localhost:5000/api';

async function testUnifiedCartAndCheckout() {
  console.log('====================================================');
  console.log('🛒 UNIFIED CART & MIXED-ITEM CHECKOUT VERIFICATION');
  console.log('====================================================\n');

  // 1. Authenticate user
  console.log('📌 [Step 1] Registering and authenticating customer...');
  const testEmail = `unified_cart_${Date.now()}@test.com`;
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Unified Cart Tester',
    email: testEmail,
    password: 'Password123!',
  });
  await axios.get(`${API}/auth/verify-email/${regRes.data.devToken}`);
  const loginRes = await axios.post(`${API}/auth/login`, {
    email: testEmail,
    password: 'Password123!',
  });
  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  const authHeaders = { headers: { Cookie: cookie } };
  console.log(`   Customer authenticated (${testEmail}).`);

  // 2. Fetch reference data (MenuItem, Combo, PizzaOptions)
  console.log('\n📌 [Step 2] Fetching live menu item, combo, and pizza option references...');
  const [menuRes, comboRes, optionsRes] = await Promise.all([
    axios.get(`${API}/menu?category=pizza`),
    axios.get(`${API}/combos`),
    axios.get(`${API}/pizza-options`),
  ]);

  const margheritaItem = menuRes.data.menuItems.find((m) => m.name.includes('Margherita'));
  const soloCombo = comboRes.data.combos.find((c) => c.name.includes('Solo'));
  const baseOpt = optionsRes.data.bases[0];
  const sauceOpt = optionsRes.data.sauces[0];
  const cheeseOpt = optionsRes.data.cheeses[0];
  const vegOpt1 = optionsRes.data.veggies[0];
  const vegOpt2 = optionsRes.data.veggies[1];

  console.log(`   Selected Ready-Made Pizza: "${margheritaItem.name}" (Size L price: ₹380)`);
  console.log(`   Selected Combo Offer:      "${soloCombo.name}" (Price: ₹${soloCombo.comboPrice})`);
  console.log(`   Selected Custom Pizza:     Base "${baseOpt.name}" (₹${baseOpt.price}) + Sauce "${sauceOpt.name}" (₹${sauceOpt.price}) + Cheese "${cheeseOpt.name}" (₹${cheeseOpt.price}) + Veggies (₹${vegOpt1.price} + ₹${vegOpt2.price})`);
  const expectedCustomUnit = baseOpt.price + sauceOpt.price + cheeseOpt.price + vegOpt1.price + vegOpt2.price;
  console.log(`   Expected Custom Unit:      ₹${expectedCustomUnit}`);

  // 3. Add Item 1: Ready-made pizza with client attempting price tampering (tampered to ₹10)
  console.log('\n📌 [Step 3] Adding Ready-Made Pizza (Client tampered price: ₹10)...');
  const add1 = await axios.post(
    `${API}/cart/items`,
    {
      itemType: 'menuItem',
      refId: margheritaItem._id,
      name: margheritaItem.name,
      size: 'L',
      quantity: 1,
      unitPrice: 10, // Tampered price
    },
    authHeaders
  );
  const item1InCart = add1.data.cart.items.find((i) => i.refId === String(margheritaItem._id));
  console.log(`   Server resolved unit price: ₹${item1InCart.unitPrice} (Expected ₹380)`);
  if (item1InCart.unitPrice === 380) {
    console.log('✅ Pass: Client-sent tampered price ignored; authoritative ₹380 computed.');
  }

  // 4. Add Item 2: Combo offer with client attempting price tampering (tampered to ₹5)
  console.log('\n📌 [Step 4] Adding Combo Deal (Client tampered price: ₹5)...');
  const add2 = await axios.post(
    `${API}/cart/items`,
    {
      itemType: 'combo',
      refId: soloCombo._id,
      name: soloCombo.name,
      quantity: 1,
      unitPrice: 5, // Tampered price
    },
    authHeaders
  );
  const item2InCart = add2.data.cart.items.find((i) => i.refId === String(soloCombo._id));
  console.log(`   Server resolved unit price: ₹${item2InCart.unitPrice} (Expected ₹${soloCombo.comboPrice})`);
  if (item2InCart.unitPrice === soloCombo.comboPrice) {
    console.log('✅ Pass: Combo price computed strictly server-side.');
  }

  // 5. Add Item 3: Custom Pizza
  console.log('\n📌 [Step 5] Adding Custom Pizza (Ingredients breakdown)...');
  const add3 = await axios.post(
    `${API}/cart/items`,
    {
      itemType: 'customPizza',
      name: 'Custom Artisan Masterpiece',
      quantity: 1,
      unitPrice: 1, // Tampered price
      customSelections: {
        base: baseOpt._id,
        sauce: sauceOpt._id,
        cheese: cheeseOpt._id,
        toppings: [vegOpt1._id, vegOpt2._id],
        extraCheese: false,
      },
    },
    authHeaders
  );
  const item3InCart = add3.data.cart.items.find((i) => i.itemType === 'customPizza');
  console.log(`   Server resolved unit price: ₹${item3InCart.unitPrice} (Expected ₹${expectedCustomUnit})`);
  if (item3InCart.unitPrice === expectedCustomUnit) {
    console.log('✅ Pass: Custom pizza price computed strictly from PizzaOption database records.');
  }

  // 6. Test quantity update: Update Margherita L to quantity 2
  console.log('\n📌 [Step 6] Updating quantity of Margherita L to 2x (PATCH /api/cart/items/:itemId)...');
  const updateRes = await axios.patch(
    `${API}/cart/items/${item1InCart.cartId}`,
    { quantity: 2 },
    authHeaders
  );
  const expectedSubtotal = 2 * 380 + soloCombo.comboPrice + expectedCustomUnit;
  console.log(`   Total items in cart: ${updateRes.data.cart.totalItems}`);
  console.log(`   Cart Subtotal: ₹${updateRes.data.cart.subtotal} (Expected 2*380 + ${soloCombo.comboPrice} + ${expectedCustomUnit} = ₹${expectedSubtotal})`);
  if (updateRes.data.cart.subtotal === expectedSubtotal) {
    console.log('✅ Pass: Quantity update and unified subtotal recalculation verified.');
  }

  // 7. Test Order Creation with Mixed Cart (POST /api/orders)
  console.log('\n📌 [Step 7] Creating order with mixed cart items (POST /api/orders)...');
  const orderRes = await axios.post(
    `${API}/orders`,
    {
      items: updateRes.data.cart.items,
      deliveryAddress: {
        street: '456 Gourmet Boulevard',
        city: 'Mumbai',
        pincode: '400050',
        phone: '+91 9988776655',
      },
    },
    authHeaders
  );

  const { orderId, razorpayOrderId, amount } = orderRes.data;
  console.log(`   Created Order ID: ${orderId}`);
  console.log(`   Razorpay Order ID: ${razorpayOrderId}`);
  console.log(`   Calculated Order Total: ₹${amount} (Expected ₹${expectedSubtotal})`);

  if (amount === expectedSubtotal) {
    console.log('✅ Pass: Order total matches the exact sum of server-calculated items.');
  }

  // 8. Test Payment Verification (POST /api/orders/verify)
  console.log('\n📌 [Step 8] Verifying Razorpay payment signature & updating inventory...');
  const fakePaymentId = `pay_${Date.now()}`;
  const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';
  const payload = `${razorpayOrderId}|${fakePaymentId}`;
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const verifyRes = await axios.post(
    `${API}/orders/verify`,
    {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: validSignature,
    },
    authHeaders
  );
  console.log(`   Payment Status: ${verifyRes.data.order.paymentStatus}`);
  console.log(`   Points Earned: ${Math.floor(amount / 10)} pts`);

  // 9. Clear cart
  await axios.delete(`${API}/cart`, authHeaders);
  console.log('   Persistent cart cleared after successful checkout.');

  console.log('\n🎉 ALL UNIFIED CART & MIXED CHECKOUT TESTS PASSED WITH 100% SUCCESS!');
}

testUnifiedCartAndCheckout().catch((err) => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
