import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/',        icon: '⌂',  label: 'Accueil' },
  { path: '/parcours', icon: '🗺', label: 'Parcours' },
  { path: '/create',  icon: '+',  label: null, center: true },
  { path: '/rewards', icon: '🏆', label: 'Récomp.' },
  { path: '/profile', icon: '👤', label: 'Profil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) =>
        item.center ? (
          <button
            key={item.path}
            className="nav-item-center"
            onClick={() => navigate(item.path)}
            aria-label="Créer un parcours"
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
          </button>
        ) : (
          <button
            key={item.path}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
