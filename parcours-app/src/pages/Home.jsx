import { useState, useEffect } from 'react';
import { fetchParcours } from '../api/parcours';
import ParcoursCard from '../components/ParcoursCard';
import BottomNav from '../components/BottomNav';

const FILTERS = [
  { key: 'all',      label: '✨ Tous' },
  { key: 'fav',      label: '♡ Favoris' },
  { key: 'Populaire',label: '★ Populaire' },
  { key: 'Court',    label: '⏱ Court' },
  { key: 'Ville',    label: '🏛 Ville' },
  { key: 'Campagne', label: '🌿 Campagne' },
];

export default function Home() {
  const [parcoursList, setParcoursList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [favs, setFavs] = useState(() => JSON.parse(localStorage.getItem('favs') || '[]'));

  useEffect(() => {
    fetchParcours({ 'filters[is_published][$eq]': true })
      .then((res) => setParcoursList(res.data || []))
      .catch((err) => setError(err?.response?.data?.error?.message || err.message || 'Erreur réseau'))
      .finally(() => setLoading(false));
  }, []);

  const toggleFav = (id) => {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem('favs', JSON.stringify(next));
  };

  const filtered = parcoursList.filter((p) => {
    const attrs = p;
    const matchSearch = !search || attrs.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'all' ? true :
      activeFilter === 'fav' ? favs.includes(p.id) :
      attrs.tags?.includes(activeFilter);
    return matchSearch && matchFilter;
  });

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 19, letterSpacing: 0.5 }}>Monudex</span>
        </div>
        <button className="header-icon-btn" aria-label="Notifications">🔔</button>
      </header>

      <div className="page-content">
        <div style={{ padding: '16px 16px 8px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', marginBottom: 12 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1.5px solid',
                  borderColor: activeFilter === f.key ? 'var(--color-primary)' : 'var(--color-border)',
                  background: activeFilter === f.key ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: activeFilter === f.key ? 'white' : 'var(--color-text)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="search-bar" style={{ marginBottom: 20 }}>
            <input
              placeholder="Rechercher un parcours…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        {/* List */}
        <div style={{ padding: '0 16px' }}>
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#991B1B' }}>
              ⚠️ {error}
            </div>
          )}
          {loading ? (
            <div className="loading">Chargement des parcours…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🗺️</span>
              <p className="empty-state-text">Aucun parcours trouvé</p>
            </div>
          ) : (
            filtered.map((p) => (
              <ParcoursCard
                key={p.id}
                parcours={p}
                isFav={favs.includes(p.id)}
                onFavToggle={toggleFav}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
