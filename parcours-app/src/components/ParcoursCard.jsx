import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80';

function avgRating(reviews) {
  if (!reviews?.length) return null;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}

export default function ParcoursCard({ parcours, onFavToggle, isFav }) {
  const navigate = useNavigate();
  const { id, documentId, name, image_url, tags, duration_min, distance_km, reviews } = parcours;
  const navId = documentId || id;
  const rating = avgRating(reviews);

  return (
    <div className="card" style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate(`/parcours/${navId}`)}>
      <div className="card-image" style={{ aspectRatio: '16/9', position: 'relative' }}>
        <img
          src={image_url || PLACEHOLDER}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.target.src = PLACEHOLDER; }}
        />
        {onFavToggle && (
          <button
            className="fav-btn"
            style={{ position: 'absolute', top: 10, right: 10 }}
            onClick={(e) => { e.stopPropagation(); onFavToggle(navId); }}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, flex: 1, paddingRight: 8 }}>{name}</h3>
          {rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#C9A227' }}>
              ★ {rating}
            </span>
          )}
        </div>

        {tags?.length > 0 && (
          <div className="chips-row" style={{ marginBottom: 10 }}>
            {tags.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
        )}

        <div className="meta-row">
          {duration_min && (
            <span className="meta-item">⏱ {duration_min < 60 ? `${duration_min}min` : `${Math.floor(duration_min / 60)}h${duration_min % 60 > 0 ? duration_min % 60 + 'min' : ''}`}</span>
          )}
          {distance_km && (
            <span className="meta-item">📍 {distance_km} km</span>
          )}
        </div>
      </div>
    </div>
  );
}
