import crypto from 'crypto';
import jwt from 'jsonwebtoken';

async function testPaymentFlow() {
  const API_BASE = 'http://localhost:5000/api';
  console.log('=== STARTING RAZORPAY PAYMENT FLOW VERIFICATION ===');

  // 1. Generate test customer token for Clerk/auth middleware
  const testUserId = 'user_test_' + Date.now();
  const testToken = jwt.sign(
    {
      sub: testUserId,
      email: 'tester@pizzaslice.app',
      name: 'Razorpay Test User',
    },
    'development_jwt_secret_key_12345',
    { expiresIn: '1h' }
  );

  const authHeader = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${testToken}`,
  };

  // 2. Put items into user cart via /api/cart
  console.log('\n1. Seeding user cart...');
  const cartRes = await fetch(`${API_BASE}/cart`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      items: [
        {
          name: 'Stuffed Cheesy Garlic Bread',
          price: 160,
          unitPrice: 160,
          quantity: 2,
          itemType: 'menuItem',
        },
        {
          name: 'Warm Chocolate Lava Cake',
          price: 140,
          unitPrice: 140,
          quantity: 1,
          itemType: 'menuItem',
        },
      ],
    }),
  });

  const cartData = await cartRes.json();
  console.log('Cart status:', cartRes.status, 'Items count:', cartData.cart?.items?.length);

  // 3. Create Razorpay order via POST /api/payment/create-order
  console.log('\n2. Calling POST /api/payment/create-order...');
  const createOrderRes = await fetch(`${API_BASE}/payment/create-order`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      deliveryAddress: {
        street: '456 Artisanal Avenue',
        city: 'Mumbai',
        pincode: '400050',
        phone: '+91 9988776655',
      },
    }),
  });

  const createOrderData = await createOrderRes.json();
  console.log('Create order response status:', createOrderRes.status);
  console.log('Order Details:', {
    order_id: createOrderData.order_id,
    amount_in_paise: createOrderData.amount,
    final_amount_in_inr: createOrderData.finalAmount,
    currency: createOrderData.currency,
  });

  if (!createOrderData.order_id) {
    throw new Error('Failed to create Razorpay order: ' + JSON.stringify(createOrderData));
  }

  // 4. Generate valid HMAC SHA-256 signature
  console.log('\n3. Generating test HMAC SHA256 signature...');
  const paymentId = `pay_${Date.now()}`;
  const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';
  const payload = `${createOrderData.order_id}|${paymentId}`;
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // 5. Verify payment via POST /api/payment/verify
  console.log('\n4. Calling POST /api/payment/verify with valid signature...');
  const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      orderId: createOrderData.orderId,
      razorpay_order_id: createOrderData.order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      deliveryAddress: {
        street: '456 Artisanal Avenue',
        city: 'Mumbai',
        pincode: '400050',
        phone: '+91 9988776655',
      },
    }),
  });

  const verifyData = await verifyRes.json();
  console.log('Verify response status:', verifyRes.status);
  console.log('Verify result:', {
    success: verifyData.success,
    orderId: verifyData.orderId,
    paymentId: verifyData.paymentId,
    total: verifyData.total,
    orderStatus: verifyData.order?.status,
    paymentStatus: verifyData.order?.paymentStatus,
  });

  // 6. Confirm user's cart is now empty
  console.log('\n5. Checking user cart is cleared...');
  const finalCartRes = await fetch(`${API_BASE}/cart`, {
    headers: authHeader,
  });
  const finalCartData = await finalCartRes.json();
  console.log('Cart items count after payment:', finalCartData.cart?.items?.length);

  if (finalCartData.cart?.items?.length === 0 && verifyData.success) {
    console.log('\n✅ ALL RAZORPAY PAYMENT TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ TEST FAILED: Cart was not cleared or payment verification unsuccessful');
  }
}

testPaymentFlow().catch((err) => {
  console.error('Test error:', err);
});
