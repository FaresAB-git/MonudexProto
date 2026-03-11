import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GoogleMap, Marker, DirectionsRenderer, Autocomplete, useJsApiLoader,
} from '@react-google-maps/api';
import { createParcours, updateParcours, createPoi, createParcoursItem, fetchParcoursById } from '../api/parcours';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const LIBRARIES = ['places'];
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
};
const DEFAULT_CENTER = { lat: 45.899, lng: 6.129 }; // Annecy

// Icône marqueur numéroté dorée
function markerIcon(label, isLast) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 18,
    fillColor: isLast ? '#A8891F' : '#C9A227',
    fillOpacity: 1,
    strokeColor: 'white',
    strokeWeight: 2.5,
  };
}

export default function CreateParcours() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Map state
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const directionsServiceRef = useRef(null);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [directions, setDirections] = useState(null);
  const [pois, setPois] = useState([]);
  const [clickLoading, setClickLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: '', description: '', image_url: '' });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('map'); // 'map' | 'form'

  // Init
  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    // Géolocalisation
    navigator.geolocation?.getCurrentPosition(
      (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silencieux si refus
      { timeout: 5000 }
    );

    // Charger un parcours existant en mode édition
    if (editId) {
      fetchParcoursById(editId).then((res) => {
        const p = res.data;
        setForm({ name: p.name || '', description: p.description || '', image_url: p.image_url || '' });
        setTags(p.tags || []);
        const sorted = (p.parcours_items || []).sort((a, b) => a.order - b.order);
        const loadedPois = sorted.map((item) => item.poi).filter(Boolean);
        setPois(loadedPois.map((poi) => ({
          ...poi,
          lat: Number(poi.latitude),
          lng: Number(poi.longitude),
        })));
      }).catch(console.error);
    }
  }, [editId, user]);

  // Init refs Google Maps
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();
    directionsServiceRef.current = new window.google.maps.DirectionsService();
  }, []);

  // Calcul de l'itinéraire quand les POIs changent
  useEffect(() => {
    if (!isLoaded || pois.length < 2 || !directionsServiceRef.current) {
      setDirections(null);
      return;
    }
    const origin = { lat: pois[0].lat, lng: pois[0].lng };
    const destination = { lat: pois[pois.length - 1].lat, lng: pois[pois.length - 1].lng };
    const waypoints = pois.slice(1, -1).map((p) => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: true,
    }));

    directionsServiceRef.current.route(
      { origin, destination, waypoints, travelMode: window.google.maps.TravelMode.WALKING },
      (result, status) => {
        if (status === 'OK') setDirections(result);
        else setDirections(null);
      }
    );
  }, [pois, isLoaded]);

  // Ajouter un POI depuis les coordonnées (click carte ou autocomplete)
  const addPoiFromCoords = useCallback(async (lat, lng, name = null, placeId = null) => {
    if (!geocoderRef.current) return;

    if (name) {
      // Nom déjà connu (autocomplete)
      setPois((prev) => [...prev, { name, lat, lng, google_place_id: placeId || '' }]);
      return;
    }

    // Reverse geocoding depuis un clic carte
    setClickLoading(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setClickLoading(false);
      const resolvedName = (status === 'OK' && results[0])
        ? (results[0].name || results[0].formatted_address?.split(',')[0] || `Point ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        : `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setPois((prev) => [...prev, { name: resolvedName, lat, lng, google_place_id: '' }]);
    });
  }, []);

  // Clic sur la carte
  const handleMapClick = useCallback((e) => {
    addPoiFromCoords(e.latLng.lat(), e.latLng.lng());
  }, [addPoiFromCoords]);

  // Sélection depuis l'autocomplete
  const handlePlaceSelect = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name || place.formatted_address || '';
    const placeId = place.place_id || '';
    addPoiFromCoords(lat, lng, name, placeId);
    mapRef.current?.panTo({ lat, lng });
  }, [addPoiFromCoords]);

  // Supprimer un POI
  const removePoi = (index) => setPois((prev) => prev.filter((_, i) => i !== index));

  // Réordonner un POI
  const movePoi = (index, dir) => {
    setPois((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Tags
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  // Sauvegarde
  const handleSave = async (publish = false) => {
    if (!form.name.trim()) { setError('Le titre est requis'); setStep('form'); return; }
    if (pois.length < 2) { setError('Ajoutez au moins 2 étapes sur la carte'); setStep('map'); return; }
    setError('');
    setSaving(true);

    try {
      const parcoursData = {
        name: form.name,
        description: form.description,
        image_url: form.image_url,
        tags,
        is_published: publish,
      };

      let parcoursId;
      if (editId) {
        await updateParcours(editId, parcoursData);
        parcoursId = editId;
      } else {
        const res = await createParcours(parcoursData);
        parcoursId = res.data.documentId;
      }

      for (let i = 0; i < pois.length; i++) {
        const poi = pois[i];
        if (!poi.id) {
          const poiRes = await createPoi({
            name: poi.name,
            latitude: poi.lat,
            longitude: poi.lng,
            google_place_id: poi.google_place_id || '',
          });
          await createParcoursItem({ order: i + 1, poi: poiRes.data.documentId, parcour: parcoursId });
        }
      }

      navigate(`/parcours/${parcoursId}`);
    } catch (e) {
      setError('Erreur : ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <button className="header-back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
          {editId ? 'Modifier le parcours' : 'Créer un parcours'}
        </span>
        <button className="header-icon-btn">🔔</button>
      </header>

      {/* Onglets Map / Infos */}
      <div style={{ display: 'flex', background: 'var(--color-primary)', padding: '0 16px 12px' }}>
        {['map', 'form'].map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-md)',
              background: step === s ? 'rgba(255,255,255,0.25)' : 'transparent',
              color: 'white', fontWeight: step === s ? 700 : 400, fontSize: 14, cursor: 'pointer',
            }}
          >
            {i === 0 ? `🗺️ Carte (${pois.length} pts)` : '✏️ Informations'}
          </button>
        ))}
      </div>

      <div className="page-content" style={{ paddingBottom: 'var(--nav-height)' }}>

        {/* ── ÉTAPE 1 : CARTE ── */}
        {step === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Barre de recherche autocomplete */}
            {isLoaded && (
              <div style={{ padding: '12px 12px 0' }}>
                <Autocomplete
                  onLoad={(ac) => { autocompleteRef.current = ac; }}
                  onPlaceChanged={handlePlaceSelect}
                >
                  <div className="search-bar">
                    <input placeholder="Rechercher un lieu à ajouter…" />
                    <span className="search-icon">🔍</span>
                  </div>
                </Autocomplete>
              </div>
            )}

            {/* Carte */}
            <div style={{ position: 'relative', flex: 1, minHeight: 320, margin: '10px 12px 0' }}>
              {isLoaded ? (
                <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid var(--color-primary-light)' }}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={14}
                    options={MAP_OPTIONS}
                    onLoad={onMapLoad}
                    onClick={handleMapClick}
                  >
                    {/* Marqueurs */}
                    {directions ? (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          polylineOptions: { strokeColor: '#C9A227', strokeWeight: 5, strokeOpacity: 0.9 },
                          suppressMarkers: true,
                        }}
                      />
                    ) : null}

                    {pois.map((poi, i) => (
                      <Marker
                        key={i}
                        position={{ lat: poi.lat, lng: poi.lng }}
                        icon={isLoaded ? markerIcon(i + 1, i === pois.length - 1) : undefined}
                        label={{ text: String(i + 1), color: 'white', fontWeight: 'bold', fontSize: '13px' }}
                        title={poi.name}
                      />
                    ))}
                  </GoogleMap>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
                  Chargement de la carte…
                </div>
              )}

              {/* Indicateur clic en cours */}
              {clickLoading && (
                <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.65)', color: 'white', borderRadius: 20, padding: '6px 14px', fontSize: 13 }}>
                  Identification du lieu…
                </div>
              )}
            </div>

            {/* Astuce */}
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-muted)', padding: '8px 16px 0' }}>
              Appuyez sur la carte pour ajouter une étape, ou utilisez la recherche
            </p>

            {/* Liste des étapes */}
            {pois.length > 0 && (
              <div style={{ padding: '12px 12px 0' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Étapes ({pois.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pois.map((poi, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', padding: '9px 12px',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'var(--color-primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, flexShrink: 0,
                      }}>{i + 1}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{poi.name}</span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button
                          onClick={() => movePoi(i, -1)} disabled={i === 0}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 14, opacity: i === 0 ? 0.3 : 0.7 }}
                        >↑</button>
                        <button
                          onClick={() => movePoi(i, 1)} disabled={i === pois.length - 1}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 14, opacity: i === pois.length - 1 ? 0.3 : 0.7 }}
                        >↓</button>
                        <button
                          onClick={() => removePoi(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 14, color: 'var(--color-danger)' }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bouton suivant */}
            <div style={{ padding: '12px' }}>
              {pois.length < 2 && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>
                  Ajoutez au moins {2 - pois.length} étape{2 - pois.length > 1 ? 's' : ''} de plus
                </p>
              )}
              <button
                className="btn btn-primary"
                onClick={() => setStep('form')}
                disabled={pois.length < 2}
                style={{ opacity: pois.length < 2 ? 0.5 : 1 }}
              >
                Suivant — Renseigner les infos →
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : FORMULAIRE ── */}
        {step === 'form' && (
          <div style={{ padding: '16px' }}>

            {/* Résumé du tracé */}
            <div style={{
              background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-light)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>🗺️</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{pois.length} étapes tracées</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {pois.map((p) => p.name).join(' → ')}
                </p>
              </div>
              <button
                onClick={() => setStep('map')}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, flexShrink: 0 }}
              >
                Modifier
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Titre *</label>
              <input
                className="form-input"
                placeholder="Nom de votre parcours"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Décrivez votre parcours : ambiance, points forts, conseils…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={5}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Image de couverture (URL)</label>
              <input
                className="form-input"
                placeholder="https://…"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="preview"
                  style={{ marginTop: 8, width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Tags</label>
              <div className="chips-row" style={{ marginBottom: 10 }}>
                {tags.map((t) => (
                  <span key={t} className="tag tag-removable">
                    {t}
                    <span className="tag-remove" onClick={() => setTags(tags.filter((x) => x !== t))}>✕</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Ex : Nature, Court, Ville…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  style={{ marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={addTag}
                  style={{
                    width: 42, height: 42, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: 'var(--color-primary)', color: 'white', border: 'none',
                    cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#991B1B' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleSave(false)} disabled={saving}>
                {saving ? '…' : '💾 Brouillon'}
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => handleSave(true)} disabled={saving}>
                {saving ? 'Publication…' : '🚀 Publier'}
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
