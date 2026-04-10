/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 * Free service, no API key required
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export const geocodeQuery = async (query) => {
  try {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) return null;

    const response = await fetch(
      `${NOMINATIM_URL}?` + new URLSearchParams({
        q: cleanQuery,
        format: 'json',
        addressdetails: '1',
        countrycodes: 'ph',
        limit: 1,
      })
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding query error:', error);
    return null;
  }
};

/**
 * Convert address to coordinates
 * @param {string} street - Street address
 * @param {string} city - City/municipality
 * @param {string} region - Region/province
 * @returns {Promise} - { lat, lon, displayName } or null if not found
 */
export const geocodeAddress = async (street, city, region) => {
  try {
    if (!street || !city || !region) {
      console.warn('Incomplete address for geocoding:', { street, city, region });
      return null;
    }

    // Build query string - Philippines specific
    const query = `${street}, ${city}, ${region}, Philippines`;

    const result = await geocodeQuery(query);

    if (!result) {
      console.warn('No location found for:', query);
      return null;
    }

    return {
      lat: result.lat,
      lon: result.lon,
      displayName: result.displayName,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Reverse geocode - get address from coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise} - address object or null
 */
export const reverseGeocode = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` + new URLSearchParams({
        lat,
        lon,
        format: 'json',
      })
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.address || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};
