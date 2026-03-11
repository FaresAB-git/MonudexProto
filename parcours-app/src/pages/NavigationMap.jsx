import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer, Circle, useJsApiLoader } from '@react-google-maps/api';
import { fetchParcoursById, updateUserParcours, fetchUserParcours } from '../api/parcours';
import { useAuth } from '../context/AuthContext';
import { MAP_LIBRARIES as LIBRARIES } from '../lib/mapConfig';
const ARRIVAL_RADIUS_M = 50; // Distance (m) pour considérer un POI comme atteint

// Haversine : distance en mètres entre deux coordonnées
function getDistanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

const MAP_OPTIONS = {
  disableDefaultUI: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

export default function NavigationMap() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const userPosRef = useRef(null); // toujours à jour pour onMapLoad

  const [parcours, setParcours] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userPos, setUserPos] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(0);
  const [heading, setHeading] = useState(null);

  const [currentPoiIndex, setCurrentPoiIndex] = useState(0); // Prochain POI à atteindre
  const [visitedPois, setVisitedPois] = useState(new Set());
  const [directions, setDirections] = useState(null);
  const [distToNext, setDistToNext] = useState(null);

  const [userParcoursId, setUserParcoursId] = useState(null);
  const [showArrival, setShowArrival] = useState(false); // Popup d'arrivée au POI
  const [finished, setFinished] = useState(false);

  // Charger le parcours
  useEffect(() => {
    fetchParcoursById(id)
      .then((res) => {
        const data = res.data;
        setParcours(data);
        const sorted = (data.parcours_items || [])
          .sort((a, b) => a.order - b.order)
          .map((item) => item.poi)
          .filter(Boolean);
        setPois(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    if (user) {
      fetchUserParcours().then((res) => {
        const found = res.data?.find((up) => up.parcours?.documentId === id || String(up.parcours?.id) === String(id));
        if (found) setUserParcoursId(found.documentId || found.id);
      }).catch(console.error);
    }
  }, [id, user]);

  // Calculer l'itinéraire vers le prochain POI depuis la position actuelle
  const recalcRoute = useCallback((fromPos, toPoiIdx, allPois) => {
    if (!directionsServiceRef.current || !fromPos || allPois.length === 0) return;
    const remaining = allPois.slice(toPoiIdx);
    if (remaining.length === 0) return;

    const origin = { lat: fromPos.lat, lng: fromPos.lng };
    const destination = {
      lat: Number(remaining[remaining.length - 1].latitude),
      lng: Number(remaining[remaining.length - 1].longitude),
    };
    const waypoints = remaining.slice(0, -1).map((p) => ({
      location: { lat: Number(p.latitude), lng: Number(p.longitude) },
      stopover: true,
    }));

    directionsServiceRef.current.route(
      { origin, destination, waypoints, travelMode: window.google.maps.TravelMode.WALKING },
      (result, status) => { if (status === 'OK') setDirections(result); }
    );
  }, []);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    // Si le GPS a déjà une position (arrivée avant le rendu de la carte), zoomer dessus
    if (userPosRef.current) {
      map.panTo(userPosRef.current);
      map.setZoom(18);
    }
  }, []);

  // Démarrer le suivi GPS
  useEffect(() => {
    if (!isLoaded) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading: h } = pos.coords;
        const newPos = { lat: latitude, lng: longitude };
        userPosRef.current = newPos;
        setUserPos(newPos);
        setUserAccuracy(accuracy);
        if (h !== null) setHeading(h);

        // Recentrer la carte sur l'utilisateur
        if (mapRef.current) {
          mapRef.current.panTo(newPos);
        }
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isLoaded]);

  // Recalculer la route quand la position ou le POI cible change
  useEffect(() => {
    if (userPos && pois.length > 0) {
      recalcRoute(userPos, currentPoiIndex, pois);
    }
  }, [userPos?.lat, userPos?.lng, currentPoiIndex, pois.length]);

  // Calculer la distance au prochain POI + détecter l'arrivée
  useEffect(() => {
    if (!userPos || pois.length === 0 || currentPoiIndex >= pois.length) return;

    const nextPoi = pois[currentPoiIndex];
    const dist = getDistanceM(
      userPos.lat, userPos.lng,
      Number(nextPoi.latitude), Number(nextPoi.longitude)
    );
    setDistToNext(dist);

    // Arrivée au POI
    if (dist <= ARRIVAL_RADIUS_M && !showArrival) {
      setShowArrival(true);
    }
  }, [userPos, currentPoiIndex, pois]);

  // Marquer le POI actuel comme visité
  const handleMarkVisited = () => {
    const newVisited = new Set(visitedPois);
    newVisited.add(currentPoiIndex);
    setVisitedPois(newVisited);
    setShowArrival(false);

    const nextIndex = currentPoiIndex + 1;

    if (nextIndex >= pois.length) {
      // Tous les POIs visités → parcours terminé
      setFinished(true);
      const progress = 100;
      if (userParcoursId) {
        updateUserParcours(userParcoursId, {
          status: 'completed',
          progress_percent: progress,
          completed_at: new Date().toISOString(),
        }).catch(console.error);
      }
    } else {
      setCurrentPoiIndex(nextIndex);
      const progress = Math.round((nextIndex / pois.length) * 100);
      if (userParcoursId) {
        updateUserParcours(userParcoursId, { status: 'in_progress', progress_percent: progress })
          .catch(console.error);
      }
    }
  };

  const handleStop = () => {
    if (userParcoursId && visitedPois.size > 0) {
      const progress = Math.round((visitedPois.size / pois.length) * 100);
      updateUserParcours(userParcoursId, { status: 'paused', progress_percent: progress })
        .catch(console.error);
    }
    navigate(`/parcours/${id}`);
  };

  // Zoom initial à 18 (vue GPS)
  const mapZoom = 18;
  const mapCenter = userPos || (pois[0] ? { lat: Number(pois[0].latitude), lng: Number(pois[0].longitude) } : { lat: 45.899, lng: 6.129 });

  if (!isLoaded || loading) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
      <p style={{ color: 'white' }}>Chargement de la navigation…</p>
    </div>
  );

  return (
    <div style={{ height: '100dvh', width: '100%', position: 'relative', overflow: 'hidden', maxWidth: 430, margin: '0 auto' }}>

      {/* ── Carte plein écran ── */}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={mapZoom}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
        >
          {/* Itinéraire piéton */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                polylineOptions: { strokeColor: '#C9A227', strokeWeight: 6, strokeOpacity: 0.9 },
                suppressMarkers: true,
              }}
            />
          )}

          {/* Marqueurs POIs */}
          {pois.map((poi, i) => {
            const visited = visitedPois.has(i);
            const isCurrent = i === currentPoiIndex;
            return (
              <Marker
                key={i}
                position={{ lat: Number(poi.latitude), lng: Number(poi.longitude) }}
                icon={isLoaded ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: isCurrent ? 22 : 16,
                  fillColor: visited ? '#34C759' : isCurrent ? '#C9A227' : '#888',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 3,
                } : undefined}
                label={{ text: visited ? '✓' : String(i + 1), color: 'white', fontWeight: 'bold', fontSize: '13px' }}
                title={poi.name}
              />
            );
          })}

          {/* Position utilisateur — point bleu */}
          {userPos && (
            <>
              {userAccuracy <= 200 && (
                <Circle
                  center={userPos}
                  radius={userAccuracy}
                  options={{ fillColor: '#4285F4', fillOpacity: 0.15, strokeColor: '#4285F4', strokeOpacity: 0.4, strokeWeight: 1 }}
                />
              )}
              <Marker
                position={userPos}
                icon={isLoaded ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 3,
                } : undefined}
                title="Vous êtes ici"
              />
            </>
          )}
        </GoogleMap>
      )}

      {/* ── Header flottant ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        padding: '16px 16px 32px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={handleStop}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
            border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {parcours?.name}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            {visitedPois.size}/{pois.length} étapes • {userPos ? 'GPS actif' : 'Recherche GPS…'}
          </p>
        </div>
        <button
          onClick={handleStop}
          style={{
            padding: '8px 14px', borderRadius: 20, background: 'rgba(255,59,48,0.85)',
            border: 'none', cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 600,
          }}
        >Arrêter</button>
      </div>

      {/* ── Barre de progression ── */}
      <div style={{ position: 'absolute', top: 72, left: 16, right: 16 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
          <div style={{
            width: `${pois.length > 0 ? (visitedPois.size / pois.length) * 100 : 0}%`,
            height: '100%', background: '#C9A227', borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* ── Panel bas : prochain POI ── */}
      {!finished && pois[currentPoiIndex] && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'white', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          padding: '20px 20px 36px',
        }}>
          {/* Direction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'var(--color-primary-bg)', border: '2px solid var(--color-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: 22,
            }}>
              {currentPoiIndex === pois.length - 1 ? '🏁' : '📍'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                {currentPoiIndex === pois.length - 1 ? 'Destination finale' : `Étape ${currentPoiIndex + 1} sur ${pois.length}`}
              </p>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                {pois[currentPoiIndex]?.name}
              </p>
              {distToNext !== null && (
                <p style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600, marginTop: 2 }}>
                  {formatDist(distToNext)} à pied
                </p>
              )}
            </div>
          </div>

          {/* Liste des étapes restantes */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {pois.map((poi, i) => (
              <div key={i} style={{
                flexShrink: 0, padding: '4px 10px',
                borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: visitedPois.has(i) ? '#D1FAE5' : i === currentPoiIndex ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: visitedPois.has(i) ? '#065F46' : i === currentPoiIndex ? 'white' : 'var(--color-muted)',
                border: '1px solid',
                borderColor: visitedPois.has(i) ? '#A7F3D0' : i === currentPoiIndex ? 'var(--color-primary)' : 'var(--color-border)',
              }}>
                {visitedPois.has(i) ? '✓ ' : ''}{poi.name.length > 15 ? poi.name.slice(0, 15) + '…' : poi.name}
              </div>
            ))}
          </div>

          {/* Bouton marquer comme visité (visible quand proche) */}
          {distToNext !== null && distToNext <= ARRIVAL_RADIUS_M * 3 ? (
            <button
              onClick={handleMarkVisited}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: 'var(--color-primary)', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(201,162,39,0.4)',
              }}
            >
              ✓ Marquer comme visité
            </button>
          ) : (
            <button
              onClick={handleMarkVisited}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}
            >
              Marquer comme visité manuellement
            </button>
          )}
        </div>
      )}

      {/* ── Popup arrivée automatique ── */}
      {showArrival && pois[currentPoiIndex] && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, zIndex: 200,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Vous êtes arrivé !</h2>
            <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
              {pois[currentPoiIndex]?.name}
            </p>
            <button
              onClick={handleMarkVisited}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: 'var(--color-primary)', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
              }}
            >
              {currentPoiIndex + 1 >= pois.length ? '🏁 Terminer le parcours' : '→ Prochaine étape'}
            </button>
          </div>
        </div>
      )}

      {/* ── Écran de fin ── */}
      {finished && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, zIndex: 200,
        }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>🏆</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--color-primary)' }}>
              Parcours terminé !
            </h2>
            <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              {parcours?.name}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 24 }}>
              {pois.length} étapes • {parcours?.distance_km} km
            </p>
            <button
              onClick={() => navigate(`/parcours/${id}`)}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: 'var(--color-primary)', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
              }}
            >
              Voir le parcours
            </button>
          </div>
        </div>
      )}

      {/* ── Indicateur GPS manquant ── */}
      {!userPos && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)', borderRadius: 14, padding: '12px 20px',
          color: 'white', fontSize: 13, textAlign: 'center', pointerEvents: 'none',
        }}>
          📡 Recherche du signal GPS…
        </div>
      )}
    </div>
  );
}
