import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const API = 'http://localhost:5000/api';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';

async function runOrderTests() {
  console.log('====================================================');
  console.log('🍕 STARTING ORDER CREATION & RAZORPAY PAYMENT TESTS');
  console.log('====================================================\n');

  // Step 1: Register and Login a Customer User
  console.log('📌 [Step 1] Creating and authenticating customer user...');
  const userEmail = `pizzalover_${Date.now()}@test.com`;
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Giovanni Pizza',
    email: userEmail,
    password: 'Password123!',
  });
  await axios.get(`${API}/auth/verify-email/${regRes.data.devToken}`);
  const loginRes = await axios.post(`${API}/auth/login`, {
    email: userEmail,
    password: 'Password123!',
  });
  const userCookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   Customer logged in successfully. Cookie:', userCookie.slice(0, 30) + '...');

  // Step 2: Fetch available pizza options
  console.log('\n📌 [Step 2] Fetching pizza options for custom pizza builder...');
  const optionsRes = await axios.get(`${API}/pizza-options`);
  const selectedBase = optionsRes.data.bases[0];       // e.g. Classic Hand Tossed (₹50)
  const selectedSauce = optionsRes.data.sauces[0];     // e.g. Marinara (₹30)
  const selectedCheese = optionsRes.data.cheeses[0];   // e.g. Mozzarella (₹50)
  const selectedVeggie1 = optionsRes.data.veggies[0];  // e.g. Red Onions (₹20)
  const selectedVeggie2 = optionsRes.data.veggies[1];  // e.g. Golden Corn (₹20)

  const expectedUnitPrice =
    selectedBase.price +
    selectedSauce.price +
    selectedCheese.price +
    selectedVeggie1.price +
    selectedVeggie2.price;
  const orderQty = 2;
  const expectedTotal = expectedUnitPrice * orderQty;

  console.log(`   Selected Base:   ${selectedBase.name} (₹${selectedBase.price}, stock: ${selectedBase.stockQty})`);
  console.log(`   Selected Sauce:  ${selectedSauce.name} (₹${selectedSauce.price}, stock: ${selectedSauce.stockQty})`);
  console.log(`   Selected Cheese: ${selectedCheese.name} (₹${selectedCheese.price}, stock: ${selectedCheese.stockQty})`);
  console.log(`   Selected Veggies: ${selectedVeggie1.name} (₹${selectedVeggie1.price}), ${selectedVeggie2.name} (₹${selectedVeggie2.price})`);
  console.log(`   Expected Unit Price: ₹${expectedUnitPrice}, Qty: ${orderQty} => Expected Total: ₹${expectedTotal}`);

  // Test 1: Create Order with Server-Side Price Protection
  console.log('\n📌 [Test 1] POST /api/orders (Client attempts to tamper price to ₹1)');
  const orderRes = await axios.post(
    `${API}/orders`,
    {
      items: [
        {
          base: selectedBase._id,
          sauce: selectedSauce._id,
          cheese: selectedCheese._id,
          veggies: [selectedVeggie1._id, selectedVeggie2._id],
          quantity: orderQty,
          itemPrice: 1, // Tampered client price (MUST BE IGNORED)
          totalAmount: 1, // Tampered client total (MUST BE IGNORED)
        },
      ],
      deliveryAddress: {
        street: '42 Baker Street, Apt 3B',
        city: 'Metropolis',
        pincode: '560001',
        phone: '+91 9876543210',
      },
    },
    {
      headers: { Cookie: userCookie },
    }
  );

  console.log('   Status:', orderRes.status);
  console.log('   Response Body:', orderRes.data);
  console.log(`   Server Calculated Amount: ₹${orderRes.data.amount} (Expected: ₹${expectedTotal})`);

  if (orderRes.data.amount !== expectedTotal) {
    throw new Error(`FAILED: Server did not calculate correct total (got ₹${orderRes.data.amount}, expected ₹${expectedTotal})`);
  }

  const { orderId, razorpayOrderId } = orderRes.data;

  // Test 2: Forged Payment Verification (Tampered Signature - Expect 400 rejection)
  console.log('\n📌 [Test 2] POST /api/orders/verify with FORGED signature (Expect 400 Rejection)');
  const fakePaymentId = `pay_${Date.now()}`;
  const fakeSignature = 'bad_forged_signature_0000000000000000000000000000000000000000000000000000000000000000';

  try {
    await axios.post(
      `${API}/orders/verify`,
      {
        orderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: fakeSignature,
      },
      {
        headers: { Cookie: userCookie },
      }
    );
    throw new Error('SECURITY BREACH: Server accepted invalid / forged payment signature!');
  } catch (err) {
    console.log('   Status:', err.response?.status);
    console.log('   Expected Error Response:', err.response?.data);
    if (err.response?.status !== 400) {
      throw new Error('FAILED: Expected 400 Bad Request on invalid signature');
    }
  }

  // Create fresh order for legitimate signature test
  console.log('\n📌 [Step 3] Creating new order for legitimate payment signature test...');
  const orderRes2 = await axios.post(
    `${API}/orders`,
    {
      items: [
        {
          base: selectedBase._id,
          sauce: selectedSauce._id,
          cheese: selectedCheese._id,
          veggies: [selectedVeggie1._id, selectedVeggie2._id],
          quantity: orderQty,
        },
      ],
      deliveryAddress: {
        street: '10 Downing St',
        city: 'London',
        pincode: 'SW1A 2AA',
        phone: '+91 9998887776',
      },
    },
    {
      headers: { Cookie: userCookie },
    }
  );
  const legitimateOrderId = orderRes2.data.orderId;
  const legitimateRazorpayOrderId = orderRes2.data.razorpayOrderId;

  // Test 3: Legitimate Cryptographic HMAC-SHA256 Signature Verification
  console.log('\n📌 [Test 3] POST /api/orders/verify with VALID HMAC-SHA256 signature');
  const validPaymentId = `pay_test_${crypto.randomBytes(6).toString('hex')}`;
  const validSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${legitimateRazorpayOrderId}|${validPaymentId}`)
    .digest('hex');

  console.log(`   Generated HMAC Payload: '${legitimateRazorpayOrderId}|${validPaymentId}'`);
  console.log(`   HMAC-SHA256 Signature: ${validSignature}`);

  const verifyRes = await axios.post(
    `${API}/orders/verify`,
    {
      orderId: legitimateOrderId,
      razorpay_order_id: legitimateRazorpayOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature,
    },
    {
      headers: { Cookie: userCookie },
    }
  );

  console.log('   Status:', verifyRes.status);
  console.log('   Payment Status:', verifyRes.data.order?.paymentStatus);
  console.log('   Order Status:', verifyRes.data.order?.status);
  console.log('   Status History:', verifyRes.data.order?.statusHistory);

  if (verifyRes.data.order?.paymentStatus !== 'paid' || verifyRes.data.order?.status !== 'Order Received') {
    throw new Error('FAILED: Order was not updated to paid and Order Received');
  }

  // Test 4: Verify Inventory Stock Deduction
  console.log('\n📌 [Test 4] Verifying atomic inventory stock deduction (Qty - 2 on all ingredients)');
  const updatedOptions = await axios.get(`${API}/pizza-options`);
  const updatedBase = updatedOptions.data.bases.find((b) => b._id === selectedBase._id);
  const updatedSauce = updatedOptions.data.sauces.find((s) => s._id === selectedSauce._id);
  const updatedCheese = updatedOptions.data.cheeses.find((c) => c._id === selectedCheese._id);

  console.log(`   Base Stock:   ${selectedBase.stockQty} -> ${updatedBase.stockQty} (Expected: ${selectedBase.stockQty - orderQty})`);
  console.log(`   Sauce Stock:  ${selectedSauce.stockQty} -> ${updatedSauce.stockQty} (Expected: ${selectedSauce.stockQty - orderQty})`);
  console.log(`   Cheese Stock: ${selectedCheese.stockQty} -> ${updatedCheese.stockQty} (Expected: ${selectedCheese.stockQty - orderQty})`);

  if (
    updatedBase.stockQty !== selectedBase.stockQty - orderQty ||
    updatedSauce.stockQty !== selectedSauce.stockQty - orderQty ||
    updatedCheese.stockQty !== selectedCheese.stockQty - orderQty
  ) {
    throw new Error('FAILED: Inventory stock was not decremented correctly!');
  }

  // Test 5: Get Logged In User's Orders (GET /api/orders/mine)
  console.log('\n📌 [Test 5] GET /api/orders/mine (User Order History)');
  const myOrdersRes = await axios.get(`${API}/orders/mine`, {
    headers: { Cookie: userCookie },
  });

  console.log('   Status:', myOrdersRes.status);
  console.log(`   Total User Orders: ${myOrdersRes.data.count}`);
  console.log('   Latest Order Details:');
  const latest = myOrdersRes.data.orders[0];
  console.log(`     - Order ID:       ${latest._id}`);
  console.log(`     - Razorpay ID:    ${latest.razorpayOrderId}`);
  console.log(`     - Total Amount:   ₹${latest.totalAmount}`);
  console.log(`     - Payment Status: ${latest.paymentStatus}`);
  console.log(`     - Status:         ${latest.status}`);
  console.log(`     - Base Ingredient: ${latest.items[0]?.base?.name}`);
  console.log(`     - Sauce Ingredient: ${latest.items[0]?.sauce?.name}`);

  console.log('\n====================================================');
  console.log('🎉 ALL ORDER & RAZORPAY PAYMENT TESTS PASSED PERFECTLY!');
  console.log('====================================================\n');
  process.exit(0);
}

runOrderTests().catch((err) => {
  console.error('\n❌ Order test failed:', err.response?.data || err.message);
  process.exit(1);
});
