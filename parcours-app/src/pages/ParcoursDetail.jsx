import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchParcoursById, createReview, createUserParcours, fetchUserParcours } from '../api/parcours';
import { useAuth } from '../context/AuthContext';
import MapRoute from '../components/MapRoute';
import StarRating from '../components/StarRating';
import BottomNav from '../components/BottomNav';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80';

export default function ParcoursDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [parcours, setParcours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userParcoursId, setUserParcoursId] = useState(null);
  const [started, setStarted] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [gpsError, setGpsError] = useState('');

  useEffect(() => {
    fetchParcoursById(id)
      .then((res) => setParcours(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    if (user) {
      fetchUserParcours().then((res) => {
        const found = res.data?.find((up) => up.parcours?.documentId === id || up.parcours?.id === Number(id));
        if (found) { setUserParcoursId(found.id); setStarted(true); }
      }).catch(console.error);
    }
  }, [id, user]);

  if (loading) return (
    <div className="app-shell">
      <header className="app-header">
        <button className="header-back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ color: 'white', fontWeight: 700 }}>Monudex</span>
        <button className="header-icon-btn">🔔</button>
      </header>
      <div className="loading">Chargement…</div>
      <BottomNav />
    </div>
  );

  if (!parcours) return (
    <div className="app-shell">
      <header className="app-header">
        <button className="header-back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ color: 'white', fontWeight: 700 }}>Monudex</span>
        <button className="header-icon-btn">🔔</button>
      </header>
      <div className="empty-state"><p>Parcours introuvable</p></div>
      <BottomNav />
    </div>
  );

  const { name, description, image_url, tags, duration_min, distance_km, reviews, parcours_items } = parcours;
  const pois = (parcours_items || [])
    .sort((a, b) => a.order - b.order)
    .map((item) => item.poi)
    .filter(Boolean);

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleStart = async () => {
    if (!user) { navigate('/login'); return; }
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async () => {
        if (!started) {
          try {
            await createUserParcours({
              status: 'in_progress',
              progress_percent: 0,
              parcours: id,
            });
            setStarted(true);
          } catch (e) { console.error(e); }
        }
        navigate(`/parcours/${id}/map`);
      },
      () => setGpsError('Activez la géolocalisation pour démarrer le parcours.')
    );
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setReviewLoading(true);
    setReviewError('');
    try {
      const newReview = await createReview({
        rating: reviewRating,
        comment: reviewComment,
        parcours: id,
      });
      setParcours((prev) => ({
        ...prev,
        reviews: [...(prev.reviews || []), { ...newReview.data, users_permissions_user: user }],
      }));
      setReviewComment('');
      setReviewRating(5);
      setShowReviewForm(false);
    } catch (e) {
      setReviewError('Erreur lors de l\'envoi de l\'avis');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="header-back-btn" onClick={() => navigate(-1)}>←</button>
        <span style={{ color: 'white', fontWeight: 700 }}>Monudex</span>
        <button className="header-icon-btn">🔔</button>
      </header>

      <div className="page-content">
        {/* Hero image */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
          <img
            src={image_url || PLACEHOLDER}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.src = PLACEHOLDER; }}
          />
        </div>

        <div style={{ padding: '16px 16px 24px' }}>
          {/* Title + rating */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, flex: 1, paddingRight: 8 }}>{name}</h1>
          </div>

          {avgRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <StarRating value={Math.round(Number(avgRating))} />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {avgRating} ({reviews.length} avis)
              </span>
            </div>
          )}

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="chips-row" style={{ marginBottom: 12 }}>
              {tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          )}

          {/* Map */}
          {pois.length > 0 && (
            <div style={{ marginBottom: 14, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <MapRoute pois={pois} height="220px" />
            </div>
          )}

          {/* Meta */}
          <div className="meta-row" style={{ marginBottom: 16 }}>
            {duration_min && (
              <span className="meta-item">⏱ {duration_min < 60 ? `${duration_min} min` : `${Math.floor(duration_min / 60)}h${duration_min % 60 > 0 ? duration_min % 60 + 'min' : ''}`}</span>
            )}
            {distance_km && <span className="meta-item">📍 {distance_km} km</span>}
            {pois.length > 0 && <span className="meta-item">🏛 {pois.length} étapes</span>}
          </div>

          {/* CTA */}
          <button className="btn btn-primary" onClick={handleStart} style={{ marginBottom: gpsError ? 8 : 20 }}>
            ▷ {started ? 'Continuer le parcours' : 'Démarrer le parcours'}
          </button>
          {gpsError && (
            <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              📍 {gpsError}
            </p>
          )}

          {/* Description */}
          {description && (
            <>
              <div className="divider" />
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                {description}
              </p>
            </>
          )}

          {/* POI list */}
          {pois.length > 0 && (
            <>
              <div className="divider" />
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Étapes du parcours</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {pois.map((poi, i) => (
                  <div key={poi.id} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{poi.name}</p>
                      {poi.description && <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{poi.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Reviews */}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Avis utilisateurs</h2>
            {user && !showReviewForm && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowReviewForm(true)}
              >
                + Avis
              </button>
            )}
          </div>

          {showReviewForm && (
            <form onSubmit={handleSubmitReview} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16 }}>
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">Note</label>
                <StarRating value={reviewRating} interactive onChange={setReviewRating} />
              </div>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  placeholder="Votre commentaire…"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
              </div>
              {reviewError && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 8 }}>{reviewError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={reviewLoading} style={{ flex: 1 }}>
                  {reviewLoading ? 'Envoi…' : 'Publier'}
                </button>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowReviewForm(false)}>
                  Annuler
                </button>
              </div>
            </form>
          )}

          {reviews?.length === 0 && !showReviewForm && (
            <p style={{ color: 'var(--color-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
              Aucun avis pour l'instant. Soyez le premier !
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {reviews?.map((review, i) => (
              <div key={i} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>👤</div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {review.users_permissions_user?.username || 'Anonyme'}
                    </span>
                  </div>
                  <StarRating value={review.rating} />
                </div>
                {review.comment && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{review.comment}</p>}
              </div>
            ))}
          </div>

          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
            🚩 Signaler
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
