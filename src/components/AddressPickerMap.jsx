import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { reverseGeocode } from '../utils/geocoding'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DEFAULT_CENTER = [16.4023, 120.5960] // Baguio fallback

const AddressPickerMap = ({ onLocationPick }) => {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [loadingAddress, setLoadingAddress] = useState(false)

  useEffect(() => {
    // Ensure mapRef is attached to DOM before initializing
    if (!mapRef.current) return
    
    // Prevent duplicate initialization
    if (mapInstance.current) return

    try {
      // Initialize map with container check
      const container = mapRef.current
      if (!container || container.offsetParent === null) {
        console.warn('Map container not visible in DOM')
        return
      }

      mapInstance.current = L.map(container, {
        preferCanvas: true,
        zoomControl: true,
        touchZoom: true,
        dragging: true,
      }).setView(DEFAULT_CENTER, 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current)

      const addMarker = async (lat, lon) => {
        if (!mapInstance.current) return

        const marker = L.marker([lat, lon], { draggable: true }).addTo(mapInstance.current)
        marker.on('dragend', async (e) => {
          const pos = e.target.getLatLng()
          await handleReverseGeocode(pos.lat, pos.lng, marker)
        })
        markersRef.current.push(marker)
        await handleReverseGeocode(lat, lon, marker)
      }

      const handleReverseGeocode = async (lat, lon, marker) => {
        setLoadingAddress(true)
        try {
          const addr = await reverseGeocode(lat, lon)
          if (!addr) {
            console.warn('Could not get address for location')
            if (marker && mapInstance.current) {
              marker.bindPopup('Unknown location').openPopup()
            }
          } else if (onLocationPick) {
            onLocationPick({ lat, lon, address: addr })
          }
          if (marker && addr && mapInstance.current) {
            const popupContent = typeof addr === 'object' 
              ? Object.values(addr).filter(Boolean).join(', ')
              : String(addr)
            marker.bindPopup(popupContent).openPopup()
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err)
          if (marker && mapInstance.current) {
            marker.bindPopup('Error getting address').openPopup()
          }
        } finally {
          setLoadingAddress(false)
        }
      }

      mapInstance.current.on('click', async (e) => {
        await addMarker(e.latlng.lat, e.latlng.lng)
      })

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            if (mapInstance.current) {
              mapInstance.current.setView([lat, lon], 15)
            }
          },
          (err) => console.warn('Geolocation error:', err),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }

      // Trigger map resize after a brief delay
      const resizeTimer = setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize()
        }
      }, 100)

      return () => {
        clearTimeout(resizeTimer)
        if (mapInstance.current) {
          mapInstance.current.remove()
          mapInstance.current = null
        }
        markersRef.current = []
      }
    } catch (error) {
      console.error('Map initialization error:', error)
      return () => {}
    }
  }, [onLocationPick])

  return (
    <div className='mt-2'>
      <p className='text-xs text-gray-600 mb-2'>Tap the map to drop a pin. Address fields will auto-fill.</p>
      <div ref={mapRef} className='w-full h-64 sm:h-72 border border-gray-300 rounded-lg overflow-hidden' />
      {loadingAddress && <p className='text-xs text-gray-500 mt-2'>Getting address from pinned location...</p>}
    </div>
  )
}

export default AddressPickerMap
