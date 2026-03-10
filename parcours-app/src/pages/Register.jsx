import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const { jwt, user } = await register(form.username, form.email, form.password);
      signIn(jwt, user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--color-primary)', padding: '40px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>Monudex</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6 }}>Rejoignez la communauté</p>
      </div>

      <div style={{ flex: 1, padding: '32px 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Créer un compte</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input className="form-input" type="text" placeholder="explorer74" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="votre@email.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Inscription…' : 'Créer mon compte'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
