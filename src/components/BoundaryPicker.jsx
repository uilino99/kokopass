import { useMemo } from 'react';
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const SAMOA_CENTER = [-13.759, -172.105];

// Small teal dot for vertices — visually consistent with the FarmMap pins.
const VERTEX_ICON = L.divIcon({
  className: 'koko-vertex',
  html:
    '<span style="display:block;width:12px;height:12px;border-radius:50%;background:#1D9E75;border:2px solid #fff;box-shadow:0 0 0 2px rgba(29,158,117,0.3);"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

function ClickHandler({ onAddVertex, disabled }) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onAddVertex({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

/**
 * Capture / display a farm boundary as a polygon. Stored as a plain
 * array of {lat, lng} points so it round-trips cleanly through
 * Firestore alongside the existing `location` field shape.
 *
 *   - readOnly=false: tap to add vertices, drag to move them, Undo /
 *     Clear buttons above the map.
 *   - readOnly=true:  renders the polygon only, no editing controls.
 *
 * A valid polygon needs >=3 points. Fewer than that renders just the
 * vertex markers (in edit mode).
 */
export default function BoundaryPicker({
  value,
  onChange,
  readOnly = false,
  height = 280
}) {
  const points = Array.isArray(value) ? value : [];

  const addVertex = (pt) => onChange?.([...points, pt]);
  const moveVertex = (i, pt) => {
    const next = points.slice();
    next[i] = pt;
    onChange?.(next);
  };
  const removeLast = () => onChange?.(points.slice(0, -1));
  const clearAll = () => onChange?.([]);

  const polygonPositions =
    points.length >= 3 ? points.map((p) => [p.lat, p.lng]) : null;

  const center = useMemo(() => {
    if (points.length === 0) return SAMOA_CENTER;
    let lat = 0;
    let lng = 0;
    points.forEach((p) => {
      lat += p.lat;
      lng += p.lng;
    });
    return [lat / points.length, lng / points.length];
  }, [points]);

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-koko-muted">
            {points.length === 0 && 'Tap the map to start drawing your farm boundary.'}
            {points.length === 1 && '1 point · add at least 2 more.'}
            {points.length === 2 && '2 points · add at least 1 more.'}
            {points.length >= 3 &&
              `${points.length} point${points.length === 1 ? '' : 's'} · drag vertices to refine.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={removeLast}
              disabled={points.length === 0}
              className="btn-secondary !min-h-[36px] !px-3 !py-1 text-xs"
            >
              ↶ Undo last
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={points.length === 0}
              className="btn-ghost !min-h-[36px] !px-3 !py-1 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div
        className="overflow-hidden rounded-2xl border border-koko-border"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={points.length > 0 ? 14 : 9}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onAddVertex={addVertex} disabled={readOnly} />
          {polygonPositions && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{
                color: '#1D9E75',
                weight: 2,
                fillColor: '#1D9E75',
                fillOpacity: 0.18
              }}
            />
          )}
          {!readOnly &&
            points.map((p, i) => (
              <Marker
                key={i}
                position={[p.lat, p.lng]}
                icon={VERTEX_ICON}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const ll = e.target.getLatLng();
                    moveVertex(i, { lat: ll.lat, lng: ll.lng });
                  }
                }}
              />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
