import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchParcours, fetchUserParcours, deleteParcours } from '../api/parcours';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80';

function formatDuration(min) {
  if (!min) return null;
  return min < 60 ? `${min}min` : `${Math.floor(min / 60)}h${min % 60 > 0 ? min % 60 : ''}`;
}

function ParcoursListItem({ parcours, badge, actions }) {
  const navigate = useNavigate();
  return (
    <div className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/parcours/${parcours.documentId || parcours.id}`)}>
        <img
          src={parcours.image_url || PLACEHOLDER}
          alt={parcours.name}
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.target.src = PLACEHOLDER; }}
        />
        {badge && <span className={`status-pill ${badge.type}`} style={{ position: 'absolute', top: 8, right: 8 }}>{badge.label}</span>}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{parcours.name}</p>
        <div className="meta-row" style={{ marginBottom: 10 }}>
          {parcours.duration_min && <span className="meta-item">⏱ {formatDuration(parcours.duration_min)}</span>}
          {parcours.distance_km && <span className="meta-item">📍 {parcours.distance_km} km</span>}
          {parcours.parcours_items?.length > 0 && <span className="meta-item">🏛 {parcours.parcours_items.length} étapes</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {actions}
        </div>
      </div>
    </div>
  );
}

export default function MyParcours() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('completed');
  const [myParcours, setMyParcours] = useState([]);
  const [userParcours, setUserParcours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      fetchParcours({ 'filters[users_permissions_user][id][$eq]': user.id }),
      fetchUserParcours(user.id),
    ])
      .then(([mine, activity]) => {
        setMyParcours(mine.data || []);
        setUserParcours(activity.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const completed = userParcours.filter((up) => up.status === 'completed').map((up) => up.parcours).filter(Boolean);
  const paused = userParcours.filter((up) => up.status === 'paused' || up.status === 'in_progress').map((up) => ({
    ...up.parcours,
    _progress: up.progress_percent,
    _upId: up.id,
  })).filter((p) => p.id);

  const handleDeleteParcours = async (id) => {
    if (!confirm('Supprimer ce parcours ?')) return;
    try {
      await deleteParcours(id);
      setMyParcours((prev) => prev.filter((p) => p.id !== id));
    } catch (e) { alert('Erreur lors de la suppression'); }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <span style={{ fontSize: 22 }}>🗺️</span>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>Mes Parcours</span>
        <button className="header-icon-btn">🔔</button>
      </header>

      <div className="page-content">
        <div style={{ padding: '16px 16px 0' }}>
          <div className="tabs">
            <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Réalisés</button>
            <button className={`tab ${tab === 'paused' ? 'active' : ''}`} onClick={() => setTab('paused')}>En pause</button>
            <button className={`tab ${tab === 'created' ? 'active' : ''}`} onClick={() => setTab('created')}>Mes créations</button>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {loading ? (
            <div className="loading">Chargement…</div>
          ) : (
            <>
              {/* RÉALISÉS */}
              {tab === 'completed' && (
                <>
                  <div className="section-header">
                    <span className="section-title">Vos Souvenirs</span>
                    <span className="section-count">{completed.length} parcours</span>
                  </div>
                  {completed.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">🏁</span>
                      <p className="empty-state-text">Aucun parcours terminé pour l'instant</p>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Explorer des parcours</button>
                    </div>
                  ) : (
                    completed.map((p) => (
                      <ParcoursListItem key={p.id} parcours={p} badge={{ type: 'completed', label: 'Terminé' }}
                        actions={[
                          <button key="revoir" className="btn btn-secondary btn-sm" onClick={() => navigate(`/parcours/${p.documentId || p.id}`)}>Revoir</button>,
                          <button key="share" className="btn btn-outline btn-sm">↗ Partager</button>,
                        ]}
                      />
                    ))
                  )}
                </>
              )}

              {/* EN PAUSE */}
              {tab === 'paused' && (
                <>
                  <div className="section-header">
                    <span className="section-title">En attente</span>
                    <span className="section-count">{paused.length} parcours</span>
                  </div>
                  {paused.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">⏸️</span>
                      <p className="empty-state-text">Aucun parcours en cours</p>
                    </div>
                  ) : (
                    paused.map((p) => (
                      <div key={p.id} className="card" style={{ marginBottom: 14 }}>
                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/parcours/${p.documentId || p.id}`)}>
                          <img
                            src={p.image_url || PLACEHOLDER}
                            alt={p.name}
                            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                            onError={(e) => { e.target.src = PLACEHOLDER; }}
                          />
                          <span className="status-pill paused" style={{ position: 'absolute', top: 8, right: 8 }}>En pause</span>
                          {/* Progress bar */}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ width: `${p._progress || 0}%`, height: '100%', background: 'var(--color-primary)' }} />
                          </div>
                          <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, color: 'white', fontWeight: 600, background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 6 }}>
                            Progression {p._progress || 0}%
                          </span>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/parcours/${p.documentId || p.id}`)}>
                              ▷ Reprendre
                            </button>
                            <button className="btn btn-secondary btn-sm">🗑</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* MES CRÉATIONS */}
              {tab === 'created' && (
                <>
                  <div className="section-header">
                    <span className="section-title">Vos créations</span>
                    <span className="section-count">{myParcours.length} parcours</span>
                  </div>
                  {myParcours.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">✏️</span>
                      <p className="empty-state-text">Vous n'avez pas encore créé de parcours</p>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/create')}>Créer un parcours</button>
                    </div>
                  ) : (
                    myParcours.map((p) => (
                      <div key={p.id} className="card" style={{ marginBottom: 14 }}>
                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/parcours/${p.documentId || p.id}`)}>
                          <img
                            src={p.image_url || PLACEHOLDER}
                            alt={p.name}
                            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                            onError={(e) => { e.target.src = PLACEHOLDER; }}
                          />
                          <span className={`status-pill ${p.is_published ? 'published' : 'draft'}`} style={{ position: 'absolute', top: 8, right: 8 }}>
                            {p.is_published ? 'Publié' : 'Brouillon'}
                          </span>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</p>
                          <div className="meta-row" style={{ marginBottom: 10 }}>
                            {p.parcours_items?.length > 0 && <span className="meta-item">🏛 {p.parcours_items.length} étapes</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/create?edit=${p.documentId || p.id}`)}>✏️ Modifier</button>
                            <button className="btn btn-secondary btn-sm">👁</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteParcours(p.documentId || p.id)}>🗑</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
