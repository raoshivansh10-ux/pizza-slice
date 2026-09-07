import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Home,
  Phone,
  Store,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import api from '../../services/api';

// Default Flagship Kitchen Coordinates (Bandra West, Mumbai)
export const DEFAULT_RESTAURANT_LOCATION = {
  latitude: 19.0760,
  longitude: 72.8777,
  name: 'PizzaSlice Flagship Kitchen',
  address: 'Bandra West, Mumbai, MH 400050',
};

export const DEFAULT_DELIVERY_RADIUS_KM = 10;

/**
 * Calculate great-circle distance in kilometers using the Haversine formula
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Parse Google Places / Geocoder Address Components into structured parts
 */
function parseAddressComponents(components, fullFormattedAddress) {
  let houseNumber = '';
  let street = '';
  let locality = '';
  let city = '';
  let state = '';
  let postalCode = '';

  if (Array.isArray(components)) {
    components.forEach((comp) => {
      const types = comp.types || [];
      if (types.includes('street_number')) {
        houseNumber = comp.long_name || comp.short_name;
      } else if (types.includes('route')) {
        street = comp.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood') || types.includes('sublocality_level_1')) {
        locality = comp.long_name;
      } else if (types.includes('locality')) {
        city = comp.long_name;
      } else if (types.includes('administrative_area_level_2') && !city) {
        city = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = comp.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = comp.long_name;
      }
    });
  }

  return {
    formattedAddress: fullFormattedAddress || '',
    houseNumber,
    street,
    locality,
    city: city || 'Mumbai',
    state: state || 'Maharashtra',
    postalCode: postalCode || '400050',
    pincode: postalCode || '400050',
  };
}

const DeliveryLocationPicker = ({
  user,
  initialAddress,
  onConfirmLocation,
  isConfirmed: externalConfirmed,
  onResetConfirmation,
}) => {
  const { isLoaded: isGoogleLoaded, isKeyConfigured } = useGoogleMaps();

  // Restaurant configuration
  const [restaurantConfig, setRestaurantConfig] = useState({
    location: DEFAULT_RESTAURANT_LOCATION,
    radiusKm: DEFAULT_DELIVERY_RADIUS_KM,
  });

  // Current selected location state
  const [coords, setCoords] = useState({
    lat: initialAddress?.latitude || DEFAULT_RESTAURANT_LOCATION.latitude,
    lng: initialAddress?.longitude || DEFAULT_RESTAURANT_LOCATION.longitude,
  });

  const [addressDetails, setAddressDetails] = useState({
    formattedAddress: initialAddress?.formattedAddress || initialAddress?.street || 'Bandra West, Mumbai',
    houseNumber: initialAddress?.houseNumber || '',
    street: initialAddress?.street || 'Hill Road',
    locality: initialAddress?.locality || 'Bandra West',
    city: initialAddress?.city || 'Mumbai',
    state: initialAddress?.state || 'Maharashtra',
    postalCode: initialAddress?.postalCode || initialAddress?.pincode || '400050',
    phone: initialAddress?.phone || '+91 9876543210',
  });

  const [searchInput, setSearchInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [localConfirmed, setLocalConfirmed] = useState(Boolean(externalConfirmed));

  // Map DOM References
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteInstanceRef = useRef(null);

  // Fetch store delivery area config from backend
  useEffect(() => {
    api
      .get('/delivery/config')
      .then((res) => {
        if (res.data?.restaurantLocation) {
          setRestaurantConfig({
            location: res.data.restaurantLocation,
            radiusKm: res.data.deliveryRadiusKm || DEFAULT_DELIVERY_RADIUS_KM,
          });
        }
      })
      .catch((err) => {
        console.warn('[Delivery Config Fallback]:', err.message);
      });
  }, []);

  // Compute live distance from restaurant to customer
  const distanceKm = calculateDistanceKm(
    restaurantConfig.location.latitude,
    restaurantConfig.location.longitude,
    coords.lat,
    coords.lng
  );

  const isWithinRadius = distanceKm <= restaurantConfig.radiusKm;

  // Reverse Geocode helper via Google Maps Geocoder
  const reverseGeocode = useCallback((lat, lng) => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      // Fallback description
      setAddressDetails((prev) => ({
        ...prev,
        formattedAddress: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      }));
      return;
    }

    setIsReverseGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat, lng };

    geocoder.geocode({ location: latlng }, (results, status) => {
      setIsReverseGeocoding(false);
      if (status === 'OK' && results && results[0]) {
        const topResult = results[0];
        const parsed = parseAddressComponents(topResult.address_components, topResult.formatted_address);

        setAddressDetails((prev) => ({
          ...prev,
          ...parsed,
          houseNumber: prev.houseNumber || parsed.houseNumber,
          phone: prev.phone || '+91 9876543210',
        }));
      }
    });
  }, []);

  // Initialize or re-center Google Map
  useEffect(() => {
    if (!isGoogleLoaded || !mapContainerRef.current || !window.google?.maps) {
      return;
    }

    const currentPos = new window.google.maps.LatLng(coords.lat, coords.lng);
    const storePos = new window.google.maps.LatLng(
      restaurantConfig.location.latitude,
      restaurantConfig.location.longitude
    );

    if (!mapInstanceRef.current) {
      // Create Map
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: currentPos,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }],
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }],
          },
        ],
      });

      mapInstanceRef.current = map;

      // 1. Restaurant Marker
      const storeMarker = new window.google.maps.Marker({
        position: storePos,
        map,
        title: restaurantConfig.location.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#F86015',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
        },
      });
      restaurantMarkerRef.current = storeMarker;

      // 2. Delivery Radius Circle
      const deliveryCircle = new window.google.maps.Circle({
        strokeColor: '#F86015',
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: '#F86015',
        fillOpacity: 0.08,
        map,
        center: storePos,
        radius: restaurantConfig.radiusKm * 1000,
      });
      radiusCircleRef.current = deliveryCircle;

      // 3. Customer Draggable Pin Marker
      const customerPin = new window.google.maps.Marker({
        position: currentPos,
        map,
        draggable: true,
        title: 'Your Delivery Location (Drag to adjust)',
        animation: window.google.maps.Animation.DROP,
      });

      customerPin.addListener('dragend', () => {
        const newPos = customerPin.getPosition();
        if (newPos) {
          const newLat = newPos.lat();
          const newLng = newPos.lng();
          setCoords({ lat: newLat, lng: newLng });
          reverseGeocode(newLat, newLng);
        }
      });

      customerMarkerRef.current = customerPin;
    } else {
      // Update existing customer marker position and map center
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setPosition(currentPos);
      }
      mapInstanceRef.current.panTo(currentPos);
    }
  }, [isGoogleLoaded, coords.lat, coords.lng, restaurantConfig, reverseGeocode]);

  // Attach Google Places Autocomplete
  useEffect(() => {
    if (
      !isGoogleLoaded ||
      !searchInputRef.current ||
      !window.google?.maps?.places ||
      autocompleteInstanceRef.current
    ) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      searchInputRef.current,
      {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        return;
      }

      const newLat = place.geometry.location.lat();
      const newLng = place.geometry.location.lng();

      setCoords({ lat: newLat, lng: newLng });
      setGeoError('');

      const parsed = parseAddressComponents(place.address_components, place.formatted_address);
      setAddressDetails((prev) => ({
        ...prev,
        ...parsed,
        formattedAddress: place.formatted_address || place.name || prev.formattedAddress,
      }));

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: newLat, lng: newLng });
        mapInstanceRef.current.setZoom(16);
      }
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setPosition({ lat: newLat, lng: newLng });
      }
    });

    autocompleteInstanceRef.current = autocomplete;
  }, [isGoogleLoaded]);

  // Action: 📍 Use My Current Location (HTML5 Geolocation)
  const handleUseCurrentLocation = () => {
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. You can search for your address manually.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        setCoords({ lat: userLat, lng: userLng });
        reverseGeocode(userLat, userLng);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: userLat, lng: userLng });
          mapInstanceRef.current.setZoom(16);
        }
        if (customerMarkerRef.current) {
          customerMarkerRef.current.setPosition({ lat: userLat, lng: userLng });
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location permission was denied. You can search for your address manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location information is unavailable. Please search for your delivery address manually.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please try again or search manually.');
            break;
          default:
            setGeoError('Could not retrieve your location. Please search for your address manually.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Action: Confirm Delivery Location
  const handleConfirmLocation = async () => {
    if (!isWithinRadius) return;

    const fullLocationData = {
      latitude: coords.lat,
      longitude: coords.lng,
      formattedAddress: addressDetails.formattedAddress,
      houseNumber: addressDetails.houseNumber,
      street: addressDetails.street,
      locality: addressDetails.locality,
      city: addressDetails.city,
      state: addressDetails.state,
      postalCode: addressDetails.postalCode,
      pincode: addressDetails.postalCode,
      phone: addressDetails.phone,
      distanceKm,
    };

    // Save for logged in Clerk user
    if (user?.id) {
      try {
        await api.post('/user/delivery-location', fullLocationData);
      } catch (err) {
        console.warn('Could not auto-save location to user profile:', err.message);
      }
    }

    setLocalConfirmed(true);
    if (onConfirmLocation) {
      onConfirmLocation(fullLocationData);
    }
  };

  const handleEditLocation = () => {
    setLocalConfirmed(false);
    if (onResetConfirmation) {
      onResetConfirmation();
    }
  };

  // Address presets for quick sandbox testing when outside real API key coverage
  const handleSelectPreset = (presetLat, presetLng, presetName) => {
    setCoords({ lat: presetLat, lng: presetLng });
    setAddressDetails((prev) => ({
      ...prev,
      formattedAddress: presetName,
      locality: 'Mumbai Metro',
    }));
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: presetLat, lng: presetLng });
    }
    if (customerMarkerRef.current) {
      customerMarkerRef.current.setPosition({ lat: presetLat, lng: presetLng });
    }
  };

  // 1. CONFIRMED LOCATION STATE CARD VIEW
  if (localConfirmed) {
    return (
      <div className="confirmed-delivery-location-card">
        <div className="confirmed-header">
          <div className="confirmed-title-wrap">
            <CheckCircle2 size={20} color="#22c55e" />
            <h4>Delivery Location Confirmed</h4>
          </div>
          <button
            type="button"
            onClick={handleEditLocation}
            className="btn-change-location"
            id="btn-edit-delivery-location"
          >
            Change Location
          </button>
        </div>

        <div className="confirmed-address-body">
          <div className="confirmed-pin-row">
            <MapPin size={18} color="#F86015" />
            <div className="address-text-block">
              <strong className="full-address">{addressDetails.formattedAddress}</strong>
              {addressDetails.houseNumber && (
                <span className="house-detail">Flat/House: {addressDetails.houseNumber}</span>
              )}
              <div className="meta-pills">
                <span className="dist-pill">
                  📍 {distanceKm} km from kitchen • ~25 min delivery
                </span>
                <span className="verified-pill">✓ In Delivery Zone</span>
              </div>
            </div>
          </div>

          <div className="confirmed-phone-row">
            <Phone size={15} color="#94a3b8" />
            <span>Contact Phone: <strong>{addressDetails.phone}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // 2. INTERACTIVE LOCATION PICKER SELECTION VIEW
  return (
    <div className="delivery-location-picker-wrap">
      {/* Action 1: GPS Location & Search Header */}
      <div className="location-action-bar">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="btn-gps-locate"
          id="btn-use-current-location"
        >
          {isLocating ? (
            <Loader2 size={16} className="spin-icon" />
          ) : (
            <Navigation size={16} color="#F86015" />
          )}
          <span>{isLocating ? 'Detecting GPS Location...' : '📍 Use my current location'}</span>
        </button>
      </div>

      {/* Geolocation Permission or Availability Error Notice */}
      {geoError && (
        <div className="geo-error-banner alert alert-warning">
          <AlertTriangle size={16} />
          <span>{geoError}</span>
        </div>
      )}

      {/* Action 2: Address Search Field */}
      <div className="location-search-box">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="form-input location-search-input"
            id="delivery-address-search-input"
            placeholder="Search your delivery address (e.g. Bandra, Khar, Santacruz)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Interactive Map Canvas (Google Maps or Interactive Simulated Canvas) */}
      <div className="map-wrapper-card">
        {isKeyConfigured && isGoogleLoaded ? (
          <div ref={mapContainerRef} className="delivery-google-map" />
        ) : (
          <div className="interactive-simulated-map">
            <div className="sim-map-header">
              <Store size={16} color="#F86015" />
              <span>
                Flagship Store: <strong>{restaurantConfig.location.name}</strong> ({restaurantConfig.radiusKm} km radius)
              </span>
            </div>
            <div className="sim-map-body">
              <div className="sim-pin-visual">
                <MapPin size={32} color={isWithinRadius ? '#F86015' : '#ef4444'} className="bouncing-pin" />
                <span className="sim-pin-label">
                  {addressDetails.formattedAddress.slice(0, 38)}...
                </span>
              </div>
              <div className="sim-presets-row">
                <span className="preset-label">Test Locations:</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(19.0596, 72.8295, 'Hill Road, Bandra West, Mumbai')}
                  className="preset-btn in-range"
                >
                  Bandra (2.1 km)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(19.0700, 72.8350, 'Linking Road, Khar West, Mumbai')}
                  className="preset-btn in-range"
                >
                  Khar (1.4 km)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(19.1136, 72.8697, 'Andheri East, Mumbai')}
                  className="preset-btn in-range"
                >
                  Andheri (6.8 km)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(19.2183, 72.9781, 'Thane West (Outside Delivery Zone)')}
                  className="preset-btn out-range"
                >
                  Thane (24 km ✕)
                </button>
              </div>
            </div>
          </div>
        )}

        {isReverseGeocoding && (
          <div className="map-geocoding-loader">
            <Loader2 size={15} className="spin-icon" />
            <span>Detecting street address...</span>
          </div>
        )}
      </div>

      {/* Deliverability & Distance Zone Feedback Pill */}
      <div className={`delivery-radius-status ${isWithinRadius ? 'status-deliverable' : 'status-undeliverable'}`}>
        {isWithinRadius ? (
          <div className="status-content">
            <CheckCircle2 size={16} color="#22c55e" />
            <span>
              <strong>Within Delivery Zone:</strong> {distanceKm} km from kitchen • Approx 25–35 mins delivery
            </span>
          </div>
        ) : (
          <div className="status-content">
            <AlertTriangle size={16} color="#ef4444" />
            <span>
              <strong>Sorry, we currently don't deliver to this location:</strong> ({distanceKm} km away — maximum delivery radius is {restaurantConfig.radiusKm} km). Please pick an address closer to our kitchen.
            </span>
          </div>
        )}
      </div>

      {/* Address Details & House Number Inputs */}
      <div className="location-detail-fields">
        <div className="form-group">
          <label>Detected Address</label>
          <input
            type="text"
            className="form-input"
            value={addressDetails.formattedAddress}
            onChange={(e) =>
              setAddressDetails((prev) => ({ ...prev, formattedAddress: e.target.value }))
            }
            placeholder="Street, locality, area"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>House / Flat / Floor No.</label>
            <input
              type="text"
              className="form-input"
              value={addressDetails.houseNumber}
              onChange={(e) =>
                setAddressDetails((prev) => ({ ...prev, houseNumber: e.target.value }))
              }
              placeholder="e.g. Flat 402, 4th Floor"
            />
          </div>

          <div className="form-group">
            <label>Contact Phone</label>
            <input
              type="tel"
              className="form-input"
              value={addressDetails.phone}
              onChange={(e) =>
                setAddressDetails((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+91 9876543210"
              required
            />
          </div>
        </div>
      </div>

      {/* Confirm Delivery Location Button */}
      <button
        type="button"
        className={`btn btn-block btn-confirm-location ${
          isWithinRadius ? 'btn-primary' : 'btn-disabled'
        }`}
        id="btn-confirm-delivery-location"
        onClick={handleConfirmLocation}
        disabled={!isWithinRadius || !addressDetails.formattedAddress}
      >
        <CheckCircle2 size={18} />
        <span>Confirm Delivery Location</span>
      </button>
    </div>
  );
};

export default DeliveryLocationPicker;
