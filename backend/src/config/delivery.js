/**
 * PizzaSlice Restaurant Location & Delivery Radius Configuration
 */

export const RESTAURANT_LOCATION = {
  latitude: parseFloat(process.env.RESTAURANT_LATITUDE || '19.0760'),
  longitude: parseFloat(process.env.RESTAURANT_LONGITUDE || '72.8777'),
  name: 'PizzaSlice Artisanal Flagship Kitchen',
  address: 'Bandra West, Mumbai, MH 400050',
  city: 'Mumbai',
};

export const DELIVERY_RADIUS_KM = parseFloat(process.env.DELIVERY_RADIUS_KM || '10');

/**
 * Calculate the great-circle distance between two points on Earth using the Haversine formula
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth's mean radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Validate if given coordinates are within the restaurant's delivery radius
 * @param {number} customerLat
 * @param {number} customerLng
 * @returns {{ isDeliverable: boolean, distanceKm: number, maxRadiusKm: number }}
 */
export function validateDeliveryLocation(customerLat, customerLng) {
  const distanceKm = calculateDistanceKm(
    RESTAURANT_LOCATION.latitude,
    RESTAURANT_LOCATION.longitude,
    customerLat,
    customerLng
  );

  return {
    isDeliverable: distanceKm <= DELIVERY_RADIUS_KM,
    distanceKm,
    maxRadiusKm: DELIVERY_RADIUS_KM,
    restaurantLocation: RESTAURANT_LOCATION,
  };
}
