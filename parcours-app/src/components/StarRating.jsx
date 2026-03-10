export default function StarRating({ value = 0, max = 5, interactive = false, onChange }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <span className="stars">
      {stars.map((s) => (
        <span
          key={s}
          className={`star ${s <= value ? '' : 'empty'}`}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={() => interactive && onChange?.(s)}
        >
          ★
        </span>
      ))}
    </span>
  );
}
