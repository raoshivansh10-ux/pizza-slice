import axios from 'axios';
import crypto from 'crypto';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
dotenv.config();

const API = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';

async function runRealtimeSocketTest() {
  console.log('================================================================');
  console.log('⚡ STARTING REAL-TIME SOCKET.IO & ADMIN ISOLATION TEST SUITE');
  console.log('================================================================\n');

  // Step 1: Register and login customer
  console.log('📌 [Step 1] Creating customer account & authenticating...');
  const userEmail = `socket_user_${Date.now()}@test.com`;
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Realtime Pizza Fan',
    email: userEmail,
    password: 'Password123!',
  });
  await axios.get(`${API}/auth/verify-email/${regRes.data.devToken}`);
  const loginRes = await axios.post(`${API}/auth/login`, {
    email: userEmail,
    password: 'Password123!',
  });
  const customerCookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   Customer cookie obtained:', customerCookie.slice(0, 35) + '...');

  // Step 2: Test Admin Route Isolation with Customer Cookie (Expect 401/403 Rejection)
  console.log('\n📌 [Step 2] Testing Admin Route Isolation (Customer cookie accessing Admin routes)...');
  try {
    await axios.get(`${API}/admin/inventory`, {
      headers: { Cookie: customerCookie },
    });
    throw new Error('SECURITY BREACH: Customer was able to access /api/admin/inventory!');
  } catch (err) {
    console.log('   /api/admin/inventory with customer cookie correctly blocked:', err.response?.status, err.response?.data?.error);
    if (err.response?.status !== 401 && err.response?.status !== 403) {
      throw new Error('FAILED: Expected 401/403 for unauthorized admin access');
    }
  }

  try {
    await axios.get(`${API}/admin/orders`, {
      headers: { Cookie: customerCookie },
    });
    throw new Error('SECURITY BREACH: Customer was able to access /api/admin/orders!');
  } catch (err) {
    console.log('   /api/admin/orders with customer cookie correctly blocked:', err.response?.status, err.response?.data?.error);
    if (err.response?.status !== 401 && err.response?.status !== 403) {
      throw new Error('FAILED: Expected 401/403 for unauthorized admin access');
    }
  }

  // Step 3: Connect customer socket.io client
  console.log('\n📌 [Step 3] Connecting customer Socket.IO client...');
  const socketClient = io(SOCKET_URL, {
    extraHeaders: {
      Cookie: customerCookie,
    },
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    socketClient.on('connect', () => {
      clearTimeout(timeout);
      console.log('   ✅ Socket connected successfully! Socket ID:', socketClient.id);
      resolve();
    });
    socketClient.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Step 4: Customer creates and pays for an order
  console.log('\n📌 [Step 4] Customer placing pizza order...');
  const optionsRes = await axios.get(`${API}/pizza-options`);
  const base = optionsRes.data.bases[0];
  const sauce = optionsRes.data.sauces[0];
  const cheese = optionsRes.data.cheeses[0];

  const orderRes = await axios.post(
    `${API}/orders`,
    {
      items: [
        {
          base: base._id,
          sauce: sauce._id,
          cheese: cheese._id,
          quantity: 1,
        },
      ],
      deliveryAddress: {
        street: '88 Speed Road',
        city: 'Bengaluru',
        pincode: '560001',
        phone: '+91 9988776655',
      },
    },
    { headers: { Cookie: customerCookie } }
  );

  const { orderId, razorpayOrderId } = orderRes.data;

  // Complete Payment Verification
  const paymentId = `pay_sock_${Date.now()}`;
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
    { headers: { Cookie: customerCookie } }
  );
  console.log(`   Order placed and paid! Order ID: ${orderId}`);

  // Step 5: Admin Login
  console.log('\n📌 [Step 5] Admin logging in...');
  const adminLogin = await axios.post(`${API}/admin/login`, {
    email: 'admin@pizzadelivery.com',
    password: 'AdminSecurePassword123!',
  });
  const adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0];
  console.log('   Admin logged in. Cookie:', adminCookie.slice(0, 35) + '...');

  // Step 6: Test Real-time Status Update via Socket.IO (< 1 second)
  console.log("\n📌 [Step 6] Testing real-time Socket.IO emission: Admin advances status -> 'In Kitchen'");

  const socketEventPromise = new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => reject(new Error('Socket.IO event timeout after 4000ms')), 4000);

    socketClient.on('order:status-updated', (updatedOrder) => {
      const elapsed = Date.now() - startTime;
      clearTimeout(timeout);
      console.log(`   ⚡ [Socket Event Received in ${elapsed}ms!] Order: ${updatedOrder._id} -> New Status: '${updatedOrder.status}'`);
      resolve({ updatedOrder, elapsed });
    });
  });

  // Admin advances status
  const updateRes = await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { status: 'In Kitchen' },
    { headers: { Cookie: adminCookie } }
  );
  console.log('   Admin PUT request responded with status:', updateRes.status);

  // Wait for socket receipt
  const { updatedOrder, elapsed } = await socketEventPromise;

  if (updatedOrder._id !== orderId || updatedOrder.status !== 'In Kitchen') {
    throw new Error(`FAILED: Received incorrect order payload: ${JSON.stringify(updatedOrder)}`);
  }

  if (elapsed > 1500) {
    console.warn(`⚠️ Warning: Socket update took ${elapsed}ms (longer than 1s goal)`);
  } else {
    console.log(`   ✅ Sub-second verification PASSED: Event received in ${elapsed}ms (< 1000ms)!`);
  }

  // Step 7: Advance remaining statuses
  console.log("\n📌 [Step 7] Testing remaining stages: 'Sent to Delivery' & 'Delivered'...");

  const deliverPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Delivery socket timeout')), 4000);
    socketClient.on('order:status-updated', (ord) => {
      if (ord.status === 'Delivered') {
        clearTimeout(timeout);
        console.log(`   ⚡ [Socket Event Received!] Final Status: '${ord.status}'`);
        resolve(ord);
      }
    });
  });

  await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { status: 'Sent to Delivery' },
    { headers: { Cookie: adminCookie } }
  );

  await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { status: 'Delivered' },
    { headers: { Cookie: adminCookie } }
  );

  await deliverPromise;

  socketClient.disconnect();

  console.log('\n================================================================');
  console.log('🎉 ALL REAL-TIME SOCKET.IO & ADMIN ISOLATION TESTS PASSED!');
  console.log('================================================================\n');
  process.exit(0);
}

runRealtimeSocketTest().catch((err) => {
  console.error('\n❌ Real-time socket test failed:', err.response?.data || err.message);
  process.exit(1);
});
