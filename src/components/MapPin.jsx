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

const createSvgMarkerIcon = (color) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
      <path d="M14 1C7.4 1 2 6.4 2 13c0 8.7 10.2 23.7 11.3 25.3a1 1 0 0 0 1.4 0C15.8 36.7 26 21.7 26 13 26 6.4 20.6 1 14 1z" fill="${color}" stroke="#2d2d2d" stroke-width="1.5"/>
      <circle cx="14" cy="13" r="5" fill="#fff"/>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

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

    try {
      // Initialize map
      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, {
          preferCanvas: true, // Better performance on mobile
          zoomControl: true,
          touchZoom: true, // Enable touch zoom for mobile
          dragging: true,
        }).setView([lat, lon], 15);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '\u00a9 OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstance.current);

        // Invalidate size to fix map rendering issues (especially on mobile)
        setTimeout(() => {
          mapInstance.current?.invalidateSize();
        }, 100);
      }

      // Clear existing markers
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          mapInstance.current.removeLayer(layer);
        }
      });

      // Add marker with color based on type
      const markerColor = isPickup ? '#f59e0b' : '#dc2626';
      const icon = L.icon({
        iconUrl: createSvgMarkerIcon(markerColor),
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [28, 42],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([lat, lon], { icon }).addTo(mapInstance.current);
      marker.bindPopup(`<div class="text-sm"><strong>${label}</strong><br/>${address}</div>`).openPopup();

      // Center and zoom to marker
      mapInstance.current.setView([lat, lon], 15);

      // Handle window resize to adjust map size
      const handleResize = () => {
        if (mapInstance.current) {
          setTimeout(() => {
            mapInstance.current?.invalidateSize();
          }, 250);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('MapPin error:', error);
    }
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
        className='w-full h-64 sm:h-80 border border-gray-300 rounded-lg shadow-sm overflow-hidden'
        style={{ backgroundColor: '#e5e3df' }}
        data-map
        role='region'
        aria-label={`Map showing ${label}`}
      />
      <div className='text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border border-gray-200 break-words'>
        {address}
      </div>
    </div>
  );
};

export default MapPin;
