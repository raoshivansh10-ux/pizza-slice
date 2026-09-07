import { useState, useEffect } from 'react';

let googleMapsScriptLoadingPromise = null;

/**
 * Hook to dynamically load Google Maps JavaScript API with Places, Geometry and Marker libraries
 */
export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';

  const isKeyConfigured = Boolean(
    apiKey &&
      apiKey !== 'your_google_maps_api_key' &&
      !apiKey.startsWith('dummy_')
  );

  useEffect(() => {
    // If window.google.maps is already initialized
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    if (!isKeyConfigured) {
      // Graceful fallback mode without breaking UI
      setIsLoaded(false);
      return;
    }

    // Deduplicate script injection
    if (!googleMapsScriptLoadingPromise) {
      googleMapsScriptLoadingPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById('google-maps-js-sdk');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(window.google));
          existingScript.addEventListener('error', (err) => reject(err));
          return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-js-sdk';
        script.type = 'text/javascript';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          resolve(window.google);
        };

        script.onerror = (err) => {
          console.error('[Google Maps SDK Load Error]', err);
          reject(new Error('Failed to load Google Maps SDK.'));
        };

        document.head.appendChild(script);
      });
    }

    googleMapsScriptLoadingPromise
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        setLoadError(err.message || 'Google Maps failed to load');
      });
  }, [apiKey, isKeyConfigured]);

  return {
    isLoaded,
    loadError,
    isKeyConfigured,
    apiKey,
  };
};

export default useGoogleMaps;
