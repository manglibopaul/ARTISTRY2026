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
  const markerRef = useRef(null)
  const [loadingAddress, setLoadingAddress] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      preferCanvas: true,
      zoomControl: true,
      touchZoom: true,
      dragging: true,
    }).setView(DEFAULT_CENTER, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    const setMarker = async (lat, lon) => {
      if (!mapInstance.current) return

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon])
      } else {
        markerRef.current = L.marker([lat, lon], { draggable: true }).addTo(mapInstance.current)
        markerRef.current.on('dragend', async (e) => {
          const pos = e.target.getLatLng()
          await handleReverseGeocode(pos.lat, pos.lng)
        })
      }

      await handleReverseGeocode(lat, lon)
    }

    const handleReverseGeocode = async (lat, lon) => {
      setLoadingAddress(true)
      try {
        const addr = await reverseGeocode(lat, lon)
        if (onLocationPick) {
          onLocationPick({ lat, lon, address: addr })
        }
      } finally {
        setLoadingAddress(false)
      }
    }

    mapInstance.current.on('click', async (e) => {
      await setMarker(e.latlng.lat, e.latlng.lng)
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          mapInstance.current?.setView([lat, lon], 15)
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }

    setTimeout(() => {
      mapInstance.current?.invalidateSize()
    }, 100)

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
      markerRef.current = null
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
