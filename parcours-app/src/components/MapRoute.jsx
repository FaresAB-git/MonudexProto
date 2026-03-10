import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';

const MAP_LIBRARIES = ['places'];
const MAP_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

export default function MapRoute({ pois = [], interactive = false, onMapClick, height = '240px' }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  const [directions, setDirections] = useState(null);
  const mapRef = useRef(null);

  const validPois = pois.filter((p) => p.latitude && p.longitude);

  useEffect(() => {
    if (!isLoaded || validPois.length < 2) {
      setDirections(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    const origin = { lat: Number(validPois[0].latitude), lng: Number(validPois[0].longitude) };
    const destination = {
      lat: Number(validPois[validPois.length - 1].latitude),
      lng: Number(validPois[validPois.length - 1].longitude),
    };
    const waypoints = validPois.slice(1, -1).map((p) => ({
      location: { lat: Number(p.latitude), lng: Number(p.longitude) },
      stopover: true,
    }));

    directionsService.route(
      { origin, destination, waypoints, travelMode: window.google.maps.TravelMode.WALKING },
      (result, status) => {
        if (status === 'OK') setDirections(result);
      }
    );
  }, [isLoaded, JSON.stringify(validPois.map((p) => `${p.latitude},${p.longitude}`))]);

  const center =
    validPois.length > 0
      ? { lat: Number(validPois[0].latitude), lng: Number(validPois[0].longitude) }
      : { lat: 45.899, lng: 6.129 }; // Annecy par défaut

  if (!isLoaded) return <div style={{ height, background: '#f0ede5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, color: '#aaa' }}>Chargement de la carte…</div>;

  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={center}
        zoom={validPois.length > 0 ? 14 : 12}
        options={MAP_OPTIONS}
        onLoad={(map) => { mapRef.current = map; }}
        onClick={interactive ? (e) => onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() }) : undefined}
      >
        {directions ? (
          <DirectionsRenderer
            directions={directions}
            options={{
              polylineOptions: { strokeColor: '#C9A227', strokeWeight: 4, strokeOpacity: 0.9 },
              suppressMarkers: false,
            }}
          />
        ) : (
          validPois.map((poi, i) => (
            <Marker
              key={i}
              position={{ lat: Number(poi.latitude), lng: Number(poi.longitude) }}
              label={{ text: String(i + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 16,
                fillColor: '#C9A227',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
            />
          ))
        )}
      </GoogleMap>
    </div>
  );
}
