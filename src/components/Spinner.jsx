export default function Spinner({ size = 'md', label = 'Loading…', className = '' }) {
  const dim =
    size === 'sm' ? 'h-4 w-4 border-[1.5px]' :
    size === 'lg' ? 'h-8 w-8 border-[3px]' :
    'h-5 w-5 border-2';
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${dim} ${className}`}
    />
  );
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-koko-muted">
      <Spinner size="lg" className="text-koko-teal" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
