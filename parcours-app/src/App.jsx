import { useState, useEffect, useCallback, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:1337/api'
const SERVER_URL = 'http://localhost:3001'

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
}

const defaultCenter = { lat: 48.8566, lng: 2.3522 }

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  scaleControl: false
}

function App() {
  const [parcours, setParcours] = useState([])
  const [parcoursItems, setParcoursItems] = useState([])
  const [pois, setPois] = useState([])
  const [selectedParcoursId, setSelectedParcoursId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [routePath, setRoutePath] = useState(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ['places']
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [parcoursRes, parcoursItemsRes, poisRes] = await Promise.all([
        axios.get(`${API_URL}/parcourss`),
        axios.get(`${API_URL}/parcours-items?populate=poi&populate=parcour`),
        axios.get(`${API_URL}/pois`)
      ])

      setParcours(parcoursRes.data.data || [])
      setParcoursItems(parcoursItemsRes.data.data || [])
      setPois(poisRes.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(`Erreur: ${err.message}`)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getCoordinates = (poi) => {
    if (poi.id === 2) {
      return { lat: poi.longitude, lng: poi.latitude }
    }
    return { lat: poi.latitude, lng: poi.longitude }
  }

  const displayPois = useMemo(() => {
    if (!pois.length) {
      return []
    }
    
    if (!selectedParcoursId) {
      return []
    }
    
    const items = parcoursItems.filter(item => item.parcour?.id === selectedParcoursId)
    
    if (items.length === 0) {
      return []
    }
    
    return items
      .map(item => {
        const poi = pois.find(p => p.id === item.poi?.id)
        if (!poi) return null
        const coords = getCoordinates(poi)
        return { ...poi, id: poi.id, latitude: coords.lat, longitude: coords.lng, order: item.order }
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order)
  }, [selectedParcoursId, pois, parcoursItems])

  useEffect(() => {
    if (!selectedParcoursId || displayPois.length < 2) {
      setRoutePath(null)
      return
    }

    const origin = { latitude: displayPois[0].latitude, longitude: displayPois[0].longitude }
    const destination = { latitude: displayPois[displayPois.length - 1].latitude, longitude: displayPois[displayPois.length - 1].longitude }
    const waypoints = displayPois.slice(1, -1).map(p => ({
      latitude: p.latitude,
      longitude: p.longitude
    }))

    axios.post(`${SERVER_URL}/api/directions`, { origin, destination, waypoints })
      .then(res => {
        console.log('Directions response:', res.data)
        if (res.data.status === 'OK' && res.data.routes && res.data.routes[0].overview_polyline) {
          const path = decodePolyline(res.data.routes[0].overview_polyline.points)
          setRoutePath(path)
        } else {
          console.error('Directions API error:', res.data)
          setRoutePath(null)
        }
      })
      .catch(err => {
        console.error('Directions error:', err)
        setRoutePath(null)
      })
  }, [selectedParcoursId, displayPois])

  const decodePolyline = (encoded) => {
    const poly = []
    let index = 0, lat = 0, lng = 0
    while (index < encoded.length) {
      let b, shift = 0, result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      lat += ((result & 1) ? ~(result >> 1) : (result >> 1))
      
      shift = 0; result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      lng += ((result & 1) ? ~(result >> 1) : (result >> 1))
      
      poly.push({ lat: lat / 1e5, lng: lng / 1e5 })
    }
    return poly
  }

  const getMapCenter = () => {
    if (displayPois && displayPois.length > 0 && displayPois[0]) {
      const lat = displayPois[0].latitude
      const lng = displayPois[0].longitude
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng }
      }
    }
    return defaultCenter
  }

  const pathCoordinates = (displayPois || [])
    .filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number')
    .map(p => ({ lat: p.latitude, lng: p.longitude }))

  const renderMap = () => {
    if (!apiKey) {
      return <div className="placeholder"><h2>Clé API manquante</h2></div>
    }
    if (loadError) {
      return <div className="placeholder"><h2>Erreur Google Maps</h2></div>
    }
    if (!isLoaded) {
      return <div className="placeholder"><p>Chargement...</p></div>
    }

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={getMapCenter()}
        zoom={13}
        options={mapOptions}
      >
        {selectedParcoursId && (displayPois || []).map((poi, index) => {
          if (!poi || typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number') {
            return null
          }
          return (
            <Marker
              key={poi.id || index}
              position={{ lat: poi.latitude, lng: poi.longitude }}
              label={`${index + 1}`}
            />
          )
        })}
        
        {routePath && routePath.length > 0 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 4
            }}
          />
        )}

        {!routePath && selectedParcoursId && pathCoordinates.length > 1 && (
          <Polyline
            path={pathCoordinates}
            options={{
              strokeColor: '#4285f4',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true
            }}
          />
        )}
      </GoogleMap>
    )
  }

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Mes Parcours</h1>
        
        {loading && <div className="loading-text">Chargement...</div>}
        {error && <div className="error-text">{error}</div>}
        
        <div className="parcours-list">
          {parcours.map(p => (
            <div 
              key={p.id} 
              className={`parcours-card ${selectedParcoursId === p.id ? 'selected' : ''}`}
              onClick={() => setSelectedParcoursId(p.id)}
            >
              <h3>{p.name || p.attributes?.name || 'Sans titre'}</h3>
              <p>{p.description || p.attributes?.description || ''}</p>
            </div>
          ))}
          
          {parcours.length === 0 && !loading && !error && (
            <p className="empty">Aucun parcours</p>
          )}
        </div>
      </div>

      <div className="map-container">
        {renderMap()}
      </div>
    </div>
  )
}

export default App
