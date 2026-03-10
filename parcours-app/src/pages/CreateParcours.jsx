import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { createParcours, updateParcours, createPoi, createParcoursItem, fetchParcoursById, deleteParcoursItem } from '../api/parcours';
import { useAuth } from '../context/AuthContext';
import MapRoute from '../components/MapRoute';
import BottomNav from '../components/BottomNav';

const LIBRARIES = ['places'];

export default function CreateParcours() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [form, setForm] = useState({ name: '', description: '', image_url: '' });
  const [pois, setPois] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [searchValue, setSearchValue] = useState('');

  const mapCenter = pois.length > 0
    ? { lat: Number(pois[pois.length - 1].latitude), lng: Number(pois[pois.length - 1].longitude) }
    : { lat: 45.899, lng: 6.129 };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (editId) {
      fetchParcoursById(editId).then((res) => {
        const p = res.data;
        setForm({ name: p.name || '', description: p.description || '', image_url: p.image_url || '' });
        setTags(p.tags || []);
        const sorted = (p.parcours_items || []).sort((a, b) => a.order - b.order);
        setPois(sorted.map((item) => ({ ...item.poi, _itemId: item.id })));
      }).catch(console.error);
    }
  }, [editId, user]);

  const handlePlaceSelect = useCallback(() => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    const newPoi = {
      name: place.name,
      description: place.vicinity || '',
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      google_place_id: place.place_id || '',
    };
    setPois((prev) => [...prev, newPoi]);
    setSearchValue('');
  }, [autocomplete]);

  const removePoi = (index) => {
    setPois((prev) => prev.filter((_, i) => i !== index));
  };

  const movePoi = (index, dir) => {
    setPois((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); }
    setTagInput('');
  };

  const handleSave = async (publish = false) => {
    if (!form.name.trim()) { setError('Le titre est requis'); return; }
    if (pois.length < 2) { setError('Ajoutez au moins 2 étapes sur la carte'); return; }
    setError('');
    setSaving(true);
    try {
      // 1. Save/update parcours
      const parcoursData = {
        name: form.name,
        description: form.description,
        image_url: form.image_url,
        tags,
        is_published: publish,
        users_permissions_user: user.id,
      };

      let parcoursId;
      if (editId) {
        await updateParcours(editId, parcoursData);
        parcoursId = Number(editId);
      } else {
        const res = await createParcours(parcoursData);
        parcoursId = res.data.id;
      }

      // 2. Create POIs and parcours items
      for (let i = 0; i < pois.length; i++) {
        const poi = pois[i];
        let poiId = poi.id;

        if (!poiId) {
          const poiRes = await createPoi({
            name: poi.name,
            description: poi.description,
            latitude: poi.latitude,
            longitude: poi.longitude,
            google_place_id: poi.google_place_id,
          });
          poiId = poiRes.data.id;
        }

        if (!poi._itemId) {
          await createParcoursItem({ order: i + 1, poi: poiId, parcour: parcoursId });
        }
      }

      navigate(`/parcours/${parcoursId}`);
    } catch (e) {
      setError('Erreur lors de la sauvegarde : ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="header-back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
          {editId ? 'Modifier le parcours' : 'Créer un Parcours'}
        </span>
        <button className="header-icon-btn">🔔</button>
      </header>

      <div className="page-content">
        <div style={{ padding: '16px' }}>
          {/* Map preview */}
          <div style={{ marginBottom: 16 }}>
            <MapRoute pois={pois} height="200px" />
          </div>

          {/* Place search */}
          {isLoaded && (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Ajouter une étape</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Autocomplete
                  onLoad={(ac) => setAutocomplete(ac)}
                  onPlaceChanged={handlePlaceSelect}
                  style={{ flex: 1 }}
                >
                  <input
                    className="form-input"
                    placeholder="Rechercher un lieu…"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </Autocomplete>
              </div>
            </div>
          )}

          {/* POI list */}
          {pois.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Étapes ({pois.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pois.map((poi, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', padding: '10px 12px',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--color-primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}>{i + 1}</div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{poi.name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => movePoi(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button onClick={() => movePoi(i, 1)} disabled={i === pois.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: i === pois.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button onClick={() => removePoi(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-danger)' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <div className="form-group">
            <label className="form-label">Titre</label>
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
              placeholder="Décrivez votre parcours…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
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
                placeholder="Ajouter un tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                style={{ marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={addTag}
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 20,
                }}
              >+</button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleSave(false)} disabled={saving}>
              {saving ? '…' : '💾 Brouillon'}
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => handleSave(true)} disabled={saving}>
              {saving ? 'Publication…' : '🚀 Publier'}
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
