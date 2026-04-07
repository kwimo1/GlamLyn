export function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-[var(--gold-deep)]" aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < Math.round(rating) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}
