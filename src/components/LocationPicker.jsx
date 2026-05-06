import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet marker icon (Vite asset paths).
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const SAMOA_CENTER = [-13.759, -172.105];

function ClickHandler({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 12));
  }, [position, map]);
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const position = useMemo(() => {
    if (value?.lat && value?.lng) return [value.lat, value.lng];
    return null;
  }, [value]);

  const useGps = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-koko-mist/80">
          Tap the map to drop a pin, or use your device GPS.
        </p>
        <button type="button" onClick={useGps} className="btn-secondary !py-2 !px-3 text-sm">
          📍 Use GPS
        </button>
      </div>
      <MapContainer
        center={position || SAMOA_CENTER}
        zoom={position ? 13 : 9}
        scrollWheelZoom={false}
        className="leaflet-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {position && <Marker position={position} icon={markerIcon} />}
        {position && <Recenter position={position} />}
      </MapContainer>
      {position && (
        <p className="text-xs text-koko-mist/60">
          Lat {position[0].toFixed(5)}, Lng {position[1].toFixed(5)}
        </p>
      )}
    </div>
  );
}
