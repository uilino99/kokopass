import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

const SAMOA_CENTER = [-13.759, -172.105];

// Small teal dot — matches the rest of the brand and reads at zoom 8.
const DOT_ICON = L.divIcon({
  className: 'koko-pin',
  html:
    '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#1D9E75;border:2px solid #fff;box-shadow:0 0 0 2px rgba(29,158,117,0.25);"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8]
});

function FitToPins({ pins }) {
  const map = useMap();
  useEffect(() => {
    if (!pins || pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 11);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [pins, map]);
  return null;
}

export default function FarmMap({ pins = [], height = 380 }) {
  const center = useMemo(() => {
    if (!pins.length) return SAMOA_CENTER;
    let lat = 0;
    let lng = 0;
    pins.forEach((p) => {
      lat += p.lat;
      lng += p.lng;
    });
    return [lat / pins.length, lng / pins.length];
  }, [pins]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-koko-border"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={pins.length ? 9 : 8}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={DOT_ICON}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold text-koko-ink">{p.farmName || '—'}</div>
                {(p.village || p.district) && (
                  <div className="text-koko-muted">
                    {[p.village, p.district].filter(Boolean).join(', ')}
                  </div>
                )}
                <Link
                  to={`/farmers/${p.id}`}
                  className="mt-1 inline-block text-koko-teal hover:underline"
                >
                  View farmer →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitToPins pins={pins} />
      </MapContainer>
    </div>
  );
}
