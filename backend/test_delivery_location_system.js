import axios from 'axios';
import jwt from 'jsonwebtoken';
import {
  calculateDistanceKm,
  validateDeliveryLocation,
  RESTAURANT_LOCATION,
  DELIVERY_RADIUS_KM,
} from './src/config/delivery.js';

const API = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_key_12345';

async function runDeliveryLocationTests() {
  console.log('🗺️  STARTING LIVE DELIVERY-LOCATION SYSTEM TEST SUITE\n');

  // -------------------------------------------------------------
  // Test 1: Unit Test Haversine Distance & Radius Logic
  // -------------------------------------------------------------
  console.log('📌 [Test 1] Testing Haversine Distance & Delivery Radius Logic...');
  
  // Point A: Khar (Near Bandra, ~1.4 km)
  const distA = calculateDistanceKm(RESTAURANT_LOCATION.latitude, RESTAURANT_LOCATION.longitude, 19.0700, 72.8350);
  const valA = validateDeliveryLocation(19.0700, 72.8350);
  console.log(`   - Khar Point: ${distA} km -> Deliverable: ${valA.isDeliverable}`);
  if (!valA.isDeliverable || distA > 5) {
    throw new Error(`Test 1 Failed: Khar should be deliverable, got distance ${distA}`);
  }

  // Point B: Andheri East (~6.8 km, within 10 km)
  const distB = calculateDistanceKm(RESTAURANT_LOCATION.latitude, RESTAURANT_LOCATION.longitude, 19.1136, 72.8697);
  const valB = validateDeliveryLocation(19.1136, 72.8697);
  console.log(`   - Andheri East: ${distB} km -> Deliverable: ${valB.isDeliverable}`);
  if (!valB.isDeliverable) {
    throw new Error(`Test 1 Failed: Andheri should be deliverable, got distance ${distB}`);
  }

  // Point C: Thane West (~24 km, OUTSIDE 10 km radius)
  const distC = calculateDistanceKm(RESTAURANT_LOCATION.latitude, RESTAURANT_LOCATION.longitude, 19.2183, 72.9781);
  const valC = validateDeliveryLocation(19.2183, 72.9781);
  console.log(`   - Thane West: ${distC} km -> Deliverable: ${valC.isDeliverable}`);
  if (valC.isDeliverable) {
    throw new Error(`Test 1 Failed: Thane should NOT be deliverable, got distance ${distC}`);
  }
  console.log('   ✅ Pass: Haversine distance calculations and boundary checks are accurate.\n');

  // -------------------------------------------------------------
  // Test 2: Public Delivery Area Config API
  // -------------------------------------------------------------
  console.log('📌 [Test 2] Testing GET /api/delivery/config and POST /api/delivery/validate-location...');
  const configRes = await axios.get(`${API}/delivery/config`);
  console.log(`   - Restaurant: ${configRes.data.restaurantLocation.name}`);
  console.log(`   - Radius: ${configRes.data.deliveryRadiusKm} km`);
  if (!configRes.data.restaurantLocation || configRes.data.deliveryRadiusKm !== 10) {
    throw new Error('Test 2 Failed: Invalid config response');
  }

  const validateRes = await axios.post(`${API}/delivery/validate-location`, {
    latitude: 19.0700,
    longitude: 72.8350,
  });
  console.log(`   - Validation response: isDeliverable=${validateRes.data.isDeliverable}, dist=${validateRes.data.distanceKm} km`);
  if (!validateRes.data.isDeliverable) {
    throw new Error('Test 2 Failed: Validate location returned false for deliverable point');
  }
  console.log('   ✅ Pass: Public delivery configuration endpoints working.\n');

  // -------------------------------------------------------------
  // Test 3: Clerk User Isolation for Saved Delivery Locations
  // -------------------------------------------------------------
  console.log('📌 [Test 3] Testing Clerk User Isolation for Saved Delivery Locations...');
  
  // User A Token
  const userAClerkId = `user_clerk_test_A_${Date.now()}`;
  const tokenA = jwt.sign(
    { sub: userAClerkId, email: 'usera@pizzatest.com', name: 'Customer User A' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const headersA = { headers: { Authorization: `Bearer ${tokenA}` } };

  // User B Token
  const userBClerkId = `user_clerk_test_B_${Date.now()}`;
  const tokenB = jwt.sign(
    { sub: userBClerkId, email: 'userb@pizzatest.com', name: 'Customer User B' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const headersB = { headers: { Authorization: `Bearer ${tokenB}` } };

  // User A initially has no saved location
  const getInitA = await axios.get(`${API}/user/delivery-location`, headersA);
  if (getInitA.data.savedLocation !== null) {
    throw new Error('Test 3 Failed: User A should have null initial location');
  }

  // User A saves delivery location
  const saveResA = await axios.post(
    `${API}/user/delivery-location`,
    {
      latitude: 19.0596,
      longitude: 72.8295,
      formattedAddress: 'Hill Road, Bandra West, Mumbai, MH 400050',
      houseNumber: 'Flat 302, Sea Pearl Apt',
      street: 'Hill Road',
      locality: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      phone: '+91 9876543210',
    },
    headersA
  );
  console.log(`   - User A saved location: "${saveResA.data.savedLocation.formattedAddress}" (isDeliverable: ${saveResA.data.savedLocation.isDeliverable})`);

  // User B fetches saved location -> Must be null (User A's location MUST NOT leak to User B)
  const getB = await axios.get(`${API}/user/delivery-location`, headersB);
  if (getB.data.savedLocation !== null) {
    throw new Error('Test 3 Failed: Security violation! User B was able to see User A saved location');
  }
  console.log('   - Verified: User B has no access to User A saved delivery location (Security Isolation Confirmed).');

  // User A fetches again -> Restores User A's saved location
  const getA = await axios.get(`${API}/user/delivery-location`, headersA);
  if (!getA.data.savedLocation || getA.data.savedLocation.houseNumber !== 'Flat 302, Sea Pearl Apt') {
    throw new Error('Test 3 Failed: User A saved location was not properly persisted');
  }
  console.log('   ✅ Pass: Clerk user-isolated saved location persistence verified.\n');

  // -------------------------------------------------------------
  // Test 4: Checkout Delivery Radius Enforcement (Rejection Test)
  // -------------------------------------------------------------
  console.log('📌 [Test 4] Testing Checkout Delivery Radius Rejection (> 10 km)...');
  
  // Create cart with 1 pizza item for User A
  const menuRes = await axios.get(`${API}/menu`);
  const testItem = menuRes.data.menuItems?.[0] || menuRes.data.items?.[0];
  if (!testItem) {
    throw new Error('Test 4 Failed: No menu items found in DB');
  }
  
  try {
    await axios.post(
      `${API}/payment/create-order`,
      {
        items: [
          {
            itemType: 'menuItem',
            name: testItem.name,
            refId: testItem._id,
            price: testItem.price || 299,
            quantity: 1,
          },
        ],
        latitude: 19.2183, // Thane West, 24 km away
        longitude: 72.9781,
        deliveryAddress: {
          formattedAddress: 'Thane West (Outside Zone)',
          street: 'Ghodbunder Road',
          city: 'Thane',
          postalCode: '400607',
          phone: '+91 9876543210',
        },
      },
      headersA
    );
    throw new Error('Test 4 Failed: Expected 400 rejection for out-of-radius location');
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.error.includes('do not deliver')) {
      console.log(`   - Correctly blocked out-of-radius order: "${err.response.data.error}"`);
    } else {
      throw err;
    }
  }
  console.log('   ✅ Pass: Orders outside delivery radius are strictly blocked.\n');

  // -------------------------------------------------------------
  // Test 5: Checkout & Order Placement with Valid Delivery Location
  // -------------------------------------------------------------
  console.log('📌 [Test 5] Testing Checkout & Payment with Valid In-Radius Delivery Location...');
  
  const validOrderRes = await axios.post(
    `${API}/payment/create-order`,
    {
      items: [
        {
          itemType: 'menuItem',
          name: testItem.name,
          refId: testItem._id,
          price: testItem.price || 299,
          quantity: 1,
        },
      ],
      latitude: 19.0596,
      longitude: 72.8295,
      deliveryAddress: {
        formattedAddress: 'Hill Road, Bandra West, Mumbai, MH 400050',
        houseNumber: 'Flat 302, Sea Pearl Apt',
        street: 'Hill Road',
        locality: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        phone: '+91 9876543210',
      },
    },
    headersA
  );

  const { orderId, razorpayOrderId, finalAmount } = validOrderRes.data;
  console.log(`   - Order created: ID #${orderId}, Razorpay #${razorpayOrderId}, Total: ₹${finalAmount}`);

  // Verify payment
  const verifyRes = await axios.post(
    `${API}/payment/verify`,
    {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_signature: `sig_test_${Date.now()}`,
      latitude: 19.0596,
      longitude: 72.8295,
      deliveryAddress: {
        formattedAddress: 'Hill Road, Bandra West, Mumbai, MH 400050',
        houseNumber: 'Flat 302, Sea Pearl Apt',
        street: 'Hill Road',
        locality: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        phone: '+91 9876543210',
      },
    },
    headersA
  );

  const confirmedOrder = verifyRes.data.order;
  console.log(`   - Confirmed Order Coordinates: (${confirmedOrder.latitude}, ${confirmedOrder.longitude})`);
  console.log(`   - Confirmed Delivery Distance: ${confirmedOrder.deliveryDistanceKm} km`);
  console.log(`   - Confirmed Address: "${confirmedOrder.deliveryAddress.formattedAddress}"`);

  if (
    !confirmedOrder.latitude ||
    !confirmedOrder.longitude ||
    !confirmedOrder.deliveryDistanceKm ||
    confirmedOrder.deliveryAddress.houseNumber !== 'Flat 302, Sea Pearl Apt'
  ) {
    throw new Error('Test 5 Failed: Order does not contain full delivery location metadata');
  }

  console.log('   ✅ Pass: Verified order includes latitude, longitude, distance, and structured address.\n');

  console.log('🎉 ALL LIVE DELIVERY-LOCATION SYSTEM TESTS PASSED PERFECTLY! 🚀');
}

runDeliveryLocationTests().catch((err) => {
  console.error('❌ Test Suite Error:', err.response?.data || err.message);
  process.exit(1);
});
