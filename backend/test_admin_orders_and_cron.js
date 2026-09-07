import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const API = 'http://localhost:5000/api';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';

async function runAdminOrderAndCronTests() {
  console.log('================================================================');
  console.log('🛡️  STARTING ADMIN ORDER MANAGEMENT & LOW-STOCK CRON TESTS');
  console.log('================================================================\n');

  // Step 1: Customer registers, logs in, and places an order
  console.log('📌 [Step 1] Creating and placing an order as a customer...');
  const customerEmail = `foodie_${Date.now()}@test.com`;
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Luigi Veloce',
    email: customerEmail,
    password: 'Password123!',
  });
  await axios.get(`${API}/auth/verify-email/${regRes.data.devToken}`);
  const customerLogin = await axios.post(`${API}/auth/login`, {
    email: customerEmail,
    password: 'Password123!',
  });
  const customerCookie = customerLogin.headers['set-cookie'][0].split(';')[0];

  const optionsRes = await axios.get(`${API}/pizza-options`);
  const base = optionsRes.data.bases[0];
  const sauce = optionsRes.data.sauces[0];
  const cheese = optionsRes.data.cheeses[0];
  const veggie = optionsRes.data.veggies[0];

  const orderRes = await axios.post(
    `${API}/orders`,
    {
      items: [
        {
          base: base._id,
          sauce: sauce._id,
          cheese: cheese._id,
          veggies: [veggie._id],
          quantity: 1,
        },
      ],
      deliveryAddress: {
        street: '7 Via Napoli',
        city: 'Rome',
        pincode: '00100',
        phone: '+39 06 1234567',
      },
    },
    {
      headers: { Cookie: customerCookie },
    }
  );

  const { orderId, razorpayOrderId } = orderRes.data;

  // Pay for order with valid signature
  const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const signature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest('hex');

  await axios.post(
    `${API}/orders/verify`,
    {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    },
    {
      headers: { Cookie: customerCookie },
    }
  );
  console.log(`   Order placed and paid! Order ID: ${orderId}, Initial Status: 'Order Received'`);

  // Step 2: Admin login
  console.log('\n📌 [Step 2] Authenticating as Admin...');
  const adminLogin = await axios.post(`${API}/admin/login`, {
    email: 'admin@pizzadelivery.com',
    password: 'AdminSecurePassword123!',
  });
  const adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0];
  console.log('   Admin authenticated successfully.');

  // Test 1: GET /api/admin/orders
  console.log('\n📌 [Test 1] GET /api/admin/orders (Admin View All Orders)');
  const adminOrdersRes = await axios.get(`${API}/admin/orders`, {
    headers: { Cookie: adminCookie },
  });

  console.log('   Status:', adminOrdersRes.status);
  console.log(`   Total Orders in System: ${adminOrdersRes.data.count}`);
  const targetOrder = adminOrdersRes.data.orders.find((o) => o._id === orderId);
  console.log('   Populated Customer Name: ', targetOrder.user?.name);
  console.log('   Populated Customer Email:', targetOrder.user?.email);
  console.log('   Populated Base Option:   ', targetOrder.items[0]?.base?.name);
  console.log('   Current Order Status:    ', targetOrder.status);

  if (!targetOrder.user?.name || !targetOrder.items[0]?.base?.name) {
    throw new Error('FAILED: Order user or items was not populated properly!');
  }

  // Test 2: Valid Forward Status Transition: 'Order Received' -> 'In Kitchen'
  console.log("\n📌 [Test 2] PUT /api/admin/orders/:id/status -> 'In Kitchen' (Valid Forward Transition)");
  const update1 = await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { status: 'In Kitchen' },
    { headers: { Cookie: adminCookie } }
  );

  console.log('   Status:', update1.status);
  console.log('   Response Message:', update1.data.message);
  console.log('   New Status:      ', update1.data.order?.status);
  console.log('   Status History:  ', update1.data.order?.statusHistory);

  if (update1.data.order?.status !== 'In Kitchen' || update1.data.order?.statusHistory?.length < 2) {
    throw new Error("FAILED: Status did not update to 'In Kitchen' with history entry");
  }

  // Test 3: Backward Status Transition Rejection: 'In Kitchen' -> 'Order Received' (Expect 400)
  console.log("\n📌 [Test 3] PUT /api/admin/orders/:id/status -> 'Order Received' (Expect 400 Backward Rejection)");
  try {
    await axios.put(
      `${API}/admin/orders/${orderId}/status`,
      { status: 'Order Received' },
      { headers: { Cookie: adminCookie } }
    );
    throw new Error("SECURITY BREACH: Server permitted backward status transition to 'Order Received'!");
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Expected Error:', err.response?.data?.error);
    if (err.response?.status !== 400) {
      throw new Error('FAILED: Expected 400 on backward transition');
    }
  }

  // Test 4: Complete Forward Status Pipeline ('In Kitchen' -> 'Sent to Delivery' -> 'Delivered')
  console.log("\n📌 [Test 4] Continuing Forward Status Pipeline: 'Sent to Delivery' -> 'Delivered'");
  const update2 = await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { status: 'Sent to Delivery' },
    { headers: { Cookie: adminCookie } }
  );
  console.log("   -> Updated to 'Sent to Delivery' (Status 200)");

  const update3 = await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { status: 'Delivered' },
    { headers: { Cookie: adminCookie } }
  );
  console.log("   -> Updated to 'Delivered' (Status 200)");

  // Attempt transition after Delivered
  try {
    await axios.put(
      `${API}/admin/orders/${orderId}/status`,
      { status: 'In Kitchen' },
      { headers: { Cookie: adminCookie } }
    );
    throw new Error("FAILED: Delivered order allowed backward change!");
  } catch (err) {
    console.log('   -> Backward change from Delivered correctly blocked (Status 400)');
  }

  // Test 5: Low-Stock Test Trigger Route (POST /api/admin/inventory/:id/trigger-low-stock-test)
  console.log('\n📌 [Test 5] POST /api/admin/inventory/:id/trigger-low-stock-test');
  const triggerRes = await axios.post(
    `${API}/admin/inventory/${base._id}/trigger-low-stock-test`,
    {},
    { headers: { Cookie: adminCookie } }
  );

  console.log('   Status:', triggerRes.status);
  console.log('   Response Message:', triggerRes.data.message);
  console.log('   Item Name:       ', triggerRes.data.item?.name);
  console.log('   Forced StockQty: ', triggerRes.data.item?.stockQty);
  console.log('   Threshold:       ', triggerRes.data.item?.lowStockThreshold);
  console.log('   Notification Result:', triggerRes.data.notificationResult);

  if (!triggerRes.data.notificationResult?.triggered) {
    throw new Error('FAILED: Low stock alert was not triggered!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL ADMIN ORDER MANAGEMENT & CRON TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
  process.exit(0);
}

runAdminOrderAndCronTests().catch((err) => {
  console.error('\n❌ Admin order/cron test failed:', err.response?.data || err.message);
  process.exit(1);
});
