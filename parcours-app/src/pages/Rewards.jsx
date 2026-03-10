import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBadges, fetchUserBadges } from '../api/parcours';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const BADGE_ICONS = {
  parcours_completed: '🥾',
  distance_total: '🏃',
  pois_visited: '🏛',
};

const DEFAULT_BADGES = [
  { id: 1, name: 'Premier Pas', description: 'Complétez votre premier parcours', icon_name: '🥾', condition_type: 'parcours_completed', target_value: 1 },
  { id: 2, name: 'Explorateur', description: 'Visitez 5 monuments différents', icon_name: '🗺️', condition_type: 'pois_visited', target_value: 5 },
  { id: 3, name: 'Marathon', description: 'Parcourez 50 km au total', icon_name: '🏃', condition_type: 'distance_total', target_value: 50 },
  { id: 4, name: 'Collectionneur', description: 'Débloquez 20 cartes de monuments', icon_name: '🃏', condition_type: 'pois_visited', target_value: 20 },
];

export default function Rewards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('badges');
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([fetchBadges(), fetchUserBadges(user.id)])
      .then(([b, ub]) => {
        setBadges(b.data?.length ? b.data : DEFAULT_BADGES);
        setUserBadges(ub.data || []);
      })
      .catch(() => { setBadges(DEFAULT_BADGES); })
      .finally(() => setLoading(false));
  }, [user]);

  const unlockedIds = new Set(userBadges.map((ub) => ub.badge?.id));

  return (
    <div className="app-shell">
      <header className="app-header">
        <span style={{ fontSize: 22 }}>🏆</span>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>Monudex</span>
        <button className="header-icon-btn">🔔</button>
      </header>

      <div className="page-content">
        <div style={{ padding: '16px 16px 0' }}>
          <div className="tabs">
            <button className={`tab ${tab === 'badges' ? 'active' : ''}`} onClick={() => setTab('badges')}>Badges</button>
            <button className={`tab ${tab === 'monuments' ? 'active' : ''}`} onClick={() => setTab('monuments')}>Monuments</button>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {loading ? (
            <div className="loading">Chargement…</div>
          ) : (
            <>
              {/* BADGES */}
              {tab === 'badges' && (
                <>
                  <div className="section-header">
                    <span className="section-title">Vos Badges</span>
                    <span className="section-count">{unlockedIds.size}/{badges.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {badges.map((badge) => {
                      const unlocked = unlockedIds.has(badge.id);
                      const ub = userBadges.find((u) => u.badge?.id === badge.id);
                      return (
                        <div key={badge.id} className="card" style={{ padding: '14px', display: 'flex', gap: 14, alignItems: 'center', opacity: unlocked ? 1 : 0.55 }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: unlocked ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 26, flexShrink: 0,
                            border: unlocked ? '2px solid var(--color-primary-light)' : '2px solid var(--color-border)',
                          }}>
                            {unlocked ? (badge.icon_name || BADGE_ICONS[badge.condition_type] || '🏅') : '🔒'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 15 }}>{badge.name}</p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{badge.description}</p>
                            {unlocked && ub?.unlocked_at && (
                              <p style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 4 }}>
                                Débloqué le {new Date(ub.unlocked_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                            {!unlocked && (
                              <div style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>
                                  <span>Progression</span>
                                  <span>0/{badge.target_value}</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
                                  <div style={{ width: '0%', height: '100%', background: 'var(--color-primary)', borderRadius: 2 }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* MONUMENTS */}
              {tab === 'monuments' && (
                <>
                  <div className="section-header">
                    <span className="section-title">Collection de Monuments</span>
                  </div>
                  <div className="empty-state">
                    <span className="empty-state-icon">🏛️</span>
                    <p className="empty-state-text">Complétez des parcours pour débloquer des monuments</p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Explorer</button>
                  </div>
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
