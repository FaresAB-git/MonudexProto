import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchParcours, fetchUserParcours, fetchUserBadges } from '../api/parcours';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ parcours: 0, distance: 0, badges: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      fetchParcours({ 'filters[users_permissions_user][id][$eq]': user.id }),
      fetchUserParcours(user.id),
      fetchUserBadges(user.id),
    ]).then(([mine, activity, ub]) => {
      const completed = activity.data?.filter((up) => up.status === 'completed') || [];
      const totalKm = completed.reduce((sum, up) => sum + (up.parcours?.distance_km || 0), 0);
      setStats({
        parcours: (mine.data?.length || 0),
        distance: Math.round(totalKm),
        badges: ub.data?.length || 0,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  if (!user) return null;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="app-shell">
      <header className="app-header">
        <span style={{ fontSize: 22 }}>👤</span>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>Mon Profil</span>
        <button className="header-icon-btn">🔔</button>
      </header>

      <div className="page-content">
        <div style={{ padding: '24px 16px' }}>
          {/* Avatar + infos */}
          <div className="card" style={{ padding: '20px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, color: 'white', flexShrink: 0,
              }}>
                {user.username?.[0]?.toUpperCase() || '👤'}
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 18 }}>{user.username}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{user.email}</p>
                {memberSince && <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>Membre depuis {memberSince}</p>}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              {[
                { icon: '🗺️', value: stats.parcours, label: 'Parcours' },
                { icon: '📍', value: `${stats.distance} km`, label: 'Distance' },
                { icon: '🏆', value: stats.badges, label: 'Badges' },
              ].map((s) => (
                <div key={s.label} style={{ padding: '12px 8px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Menu sections */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 }}>
              Compte
            </p>
            <div className="card">
              {[
                { icon: '👤', label: 'Informations personnelles' },
                { icon: '✉️', label: 'Email et mot de passe' },
                { icon: '✏️', label: 'Modifier le profil' },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <span style={{ fontSize: 15 }}>{item.label}</span>
                    </div>
                    <span style={{ color: 'var(--color-muted)', fontSize: 16 }}>›</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--color-border)', marginLeft: 52 }} />}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 }}>
              Préférences
            </p>
            <div className="card">
              {[
                { icon: '📍', label: 'Localisation', value: '' },
                { icon: '🌐', label: 'Langue', value: 'Français' },
                { icon: '🔔', label: 'Notifications', value: '' },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <span style={{ fontSize: 15 }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-muted)', fontSize: 14 }}>
                      {item.value && <span>{item.value}</span>}
                      <span style={{ fontSize: 16 }}>›</span>
                    </div>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--color-border)', marginLeft: 52 }} />}
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-danger"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleSignOut}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
