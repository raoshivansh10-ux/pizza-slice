import User from '../models/User.js';
import {
  RESTAURANT_LOCATION,
  DELIVERY_RADIUS_KM,
  calculateDistanceKm,
  validateDeliveryLocation,
} from '../config/delivery.js';

/**
 * @desc    Get public restaurant delivery area configuration
 * @route   GET /api/delivery/config
 * @access  Public
 */
export const getDeliveryConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      restaurantLocation: RESTAURANT_LOCATION,
      deliveryRadiusKm: DELIVERY_RADIUS_KM,
    });
  } catch (error) {
    console.error('[Get Delivery Config Error]', error);
    res.status(500).json({ error: 'Failed to retrieve delivery configuration.' });
  }
};

/**
 * @desc    Validate a delivery location coordinates against delivery radius
 * @route   POST /api/delivery/validate-location
 * @access  Public
 */
export const validateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    const validation = validateDeliveryLocation(lat, lng);

    res.status(200).json({
      success: true,
      ...validation,
    });
  } catch (error) {
    console.error('[Validate Location Error]', error);
    res.status(500).json({ error: 'Failed to validate delivery location.' });
  }
};

/**
 * @desc    Get saved delivery location for the logged-in Clerk user
 * @route   GET /api/user/delivery-location
 * @access  Private (Authenticated User)
 */
export const getSavedDeliveryLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('savedDeliveryLocation');

    if (!user || !user.savedDeliveryLocation || !user.savedDeliveryLocation.latitude) {
      return res.status(200).json({
        success: true,
        savedLocation: null,
      });
    }

    const loc = user.savedDeliveryLocation;
    const validation = validateDeliveryLocation(loc.latitude, loc.longitude);

    res.status(200).json({
      success: true,
      savedLocation: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formattedAddress: loc.formattedAddress || '',
        houseNumber: loc.houseNumber || '',
        street: loc.street || '',
        locality: loc.locality || '',
        city: loc.city || '',
        state: loc.state || '',
        postalCode: loc.postalCode || '',
        phone: loc.phone || '',
        distanceKm: validation.distanceKm,
        isDeliverable: validation.isDeliverable,
        updatedAt: loc.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Get Saved Location Error]', error);
    res.status(500).json({ error: 'Failed to retrieve saved delivery location.' });
  }
};

/**
 * @desc    Save or update delivery location for the logged-in Clerk user
 * @route   POST /api/user/delivery-location
 * @access  Private (Authenticated User)
 */
export const saveDeliveryLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      latitude,
      longitude,
      formattedAddress,
      houseNumber,
      street,
      locality,
      city,
      state,
      postalCode,
      phone,
    } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    const validation = validateDeliveryLocation(lat, lng);

    const updatedLocation = {
      latitude: lat,
      longitude: lng,
      formattedAddress: (formattedAddress || '').trim(),
      houseNumber: (houseNumber || '').trim(),
      street: (street || '').trim(),
      locality: (locality || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      postalCode: (postalCode || '').trim(),
      phone: (phone || '').trim(),
      distanceKm: validation.distanceKm,
      updatedAt: new Date(),
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { savedDeliveryLocation: updatedLocation } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery location saved successfully.',
      savedLocation: {
        ...updatedLocation,
        isDeliverable: validation.isDeliverable,
      },
    });
  } catch (error) {
    console.error('[Save Delivery Location Error]', error);
    res.status(500).json({ error: 'Failed to save delivery location.' });
  }
};
