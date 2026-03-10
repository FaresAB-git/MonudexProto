import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { jwt, user } = await login(form.identifier, form.password);
      signIn(jwt, user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header doré */}
      <div style={{ background: 'var(--color-primary)', padding: '40px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>Monudex</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6 }}>Explorez, créez, partagez</p>
      </div>

      <div style={{ flex: 1, padding: '32px 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Connexion</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email ou identifiant</label>
            <input
              className="form-input"
              type="text"
              placeholder="votre@email.com"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>{error}</p>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
