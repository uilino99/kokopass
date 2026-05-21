import { useRef, useState } from 'react';
import { compressImage, uploadImage } from '../utils/storage.js';
import Spinner from './Spinner.jsx';

const aspectClass = {
  square: 'aspect-square',
  landscape: 'aspect-[16/9]',
  portrait: 'aspect-[3/4]'
};

export default function PhotoUpload({
  value,
  onChange,
  path, // storage path WITHOUT extension, e.g. "users/abc/avatar"
  label = 'Add photo',
  hint,
  aspect = 'square',
  maxSizeMb = 5,
  className = ''
}) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Image too large (max ${maxSizeMb} MB).`);
      return;
    }
    setError(null);
    setProgress(2);
    try {
      const blob = await compressImage(file);
      const url = await uploadImage(`${path}.jpg`, blob, (p) =>
        setProgress(Math.max(2, p))
      );
      onChange(url);
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setProgress(null);
    }
  };

  const remove = () => {
    onChange(null);
    setError(null);
  };

  const busy = progress != null;

  return (
    <div className={className}>
      <div
        className={`relative overflow-hidden rounded-2xl border border-dashed border-koko-border/80 shadow-sm transition-colors ${aspectClass[aspect] || ''}`}
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(250,251,248,0.7) 0%, rgba(245,247,242,0.7) 100%)'
        }}
      >
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={pick}
            className="group absolute inset-0 grid place-items-center text-center text-sm text-koko-muted transition-all duration-200 ease-out-quint hover:bg-koko-teal100/30 hover:text-koko-navy"
          >
            <div>
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-koko-teal100 text-koko-teal shadow-sm transition-transform duration-200 group-hover:scale-110">
                📷
              </div>
              <p className="mt-2 font-medium text-koko-ink">{label}</p>
              {hint && <p className="mt-0.5 text-xs">{hint}</p>}
            </div>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-sm">
            <Spinner size="lg" className="text-koko-teal" />
            <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-koko-borderSoft">
              <div
                className="h-full bg-koko-teal transition-all duration-200"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <p className="text-xs text-koko-muted">Uploading {Math.round(progress)}%</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onFile}
      />

      {value && !busy && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={pick} className="btn-ghost !min-h-[36px]">
            Replace
          </button>
          <button
            type="button"
            onClick={remove}
            className="btn-ghost !min-h-[36px] hover:!text-koko-error"
          >
            Remove
          </button>
        </div>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
