import PhotoUpload from './PhotoUpload.jsx';

export default function PhotoGallery({
  value = [],
  onChange,
  basePath, // storage path prefix (no slash at end)
  max = 3,
  label = 'Add photo'
}) {
  const setSlot = (i, url) => {
    const next = [...value];
    if (url) {
      next[i] = url;
    } else {
      next[i] = undefined;
    }
    onChange(next.filter(Boolean));
  };

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(max, 3)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: max }).map((_, i) => (
        <PhotoUpload
          key={i}
          value={value[i] || null}
          onChange={(url) => setSlot(i, url)}
          path={`${basePath}/photo-${i}`}
          aspect="square"
          label={label}
        />
      ))}
    </div>
  );
}
