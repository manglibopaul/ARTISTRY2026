import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix missing Leaflet marker icons (common issue with webpack/vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * MapPin Component - Display a map with delivery or pickup location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} label - Location label (e.g., "Delivery Address" or "Pickup Location")
 * @param {string} address - Full address text to display
 * @param {boolean} isPickup - True for seller pickup (use different color)
 */
const MapPin = ({ lat, lon, label, address, isPickup = false }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!lat || !lon || !mapRef.current) return;

    // Initialize map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lon], 15);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstance.current.removeLayer(layer);
      }
    });

    // Add marker with color based on type
    const markerColor = isPickup ? 'gold' : 'red';
    const icon = L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-${markerColor}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const marker = L.marker([lat, lon], { icon }).addTo(mapInstance.current);
    marker.bindPopup(`<div class="text-sm"><strong>${label}</strong><br/>${address}</div>`).openPopup();

    // Center and zoom to marker
    mapInstance.current.setView([lat, lon], 15);
  }, [lat, lon, label, address, isPickup]);

  if (!lat || !lon) {
    return (
      <div className='w-full bg-gray-100 rounded-lg p-8 text-center text-gray-500'>
        📍 Location data unavailable
      </div>
    );
  }

  return (
    <div className='w-full'>
      <div className='text-sm font-medium text-gray-700 mb-2'>{label}</div>
      <div
        ref={mapRef}
        className='w-full h-64 sm:h-80 border border-gray-300 rounded-lg shadow-sm'
        style={{ backgroundColor: '#e5e3df' }}
      />
      <div className='text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border border-gray-200'>
        {address}
      </div>
    </div>
  );
};

export default MapPin;
