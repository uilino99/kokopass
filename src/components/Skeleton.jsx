export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <Skeleton className="mt-3 h-3 w-1/2" />
      <div className="divider" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
