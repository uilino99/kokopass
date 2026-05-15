/**
 * Approximate centroids for the modern political districts (itumalo)
 * of Samoa, plus island-level fallbacks. Coordinates are pragmatic —
 * close enough for a marker on a country-wide map, not survey-grade.
 *
 * Lookups are case- / apostrophe- / dash- insensitive via norm().
 */

export const SAMOA_DISTRICTS = [
  // ---- Upolu ----
  { key: 'tuamasaga', label: 'Tuamasaga', lat: -13.83, lng: -171.76, aliases: ['apia', 'faleata'] },
  { key: 'aana', label: "A'ana", lat: -13.85, lng: -171.95, aliases: ['a-ana', 'a ana'] },
  { key: 'aiga-i-le-tai', label: 'Aiga-i-le-Tai', lat: -13.83, lng: -172.13, aliases: ['manono'] },
  { key: 'atua', label: 'Atua', lat: -13.93, lng: -171.65, aliases: [] },
  { key: 'vaa-o-fonoti', label: "Va'a-o-Fonoti", lat: -13.92, lng: -171.50, aliases: ['vaaofonoti'] },
  { key: 'aleipata', label: 'Aleipata', lat: -14.05, lng: -171.42, aliases: ['aleipata itupa i lalo', 'aleipata itupa i luga'] },
  { key: 'lefaga', label: 'Lefaga', lat: -13.92, lng: -171.92, aliases: [] },

  // ---- Savai'i ----
  { key: 'palauli', label: 'Palauli', lat: -13.71, lng: -172.50, aliases: [] },
  { key: 'satupaitea', label: "Satupa'itea", lat: -13.62, lng: -172.50, aliases: [] },
  { key: 'vaisigano', label: 'Vaisigano', lat: -13.46, lng: -172.66, aliases: [] },
  { key: 'faasaleleaga', label: "Fa'asaleleaga", lat: -13.65, lng: -172.30, aliases: ['salelologa'] },
  { key: 'gagaemauga', label: "Gaga'emauga", lat: -13.51, lng: -172.40, aliases: [] },
  { key: 'gagaifomauga', label: "Gaga'ifomauga", lat: -13.46, lng: -172.50, aliases: [] },

  // ---- Island fallbacks ----
  { key: 'upolu', label: 'Upolu', lat: -13.92, lng: -171.80, aliases: [] },
  { key: 'savaii', label: "Savai'i", lat: -13.63, lng: -172.43, aliases: ['savai i'] }
];

export const SAMOA_CENTER = [-13.759, -172.105];

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const tight = (s) => norm(s).replace(/\s+/g, '');

const LOOKUP = new Map();
SAMOA_DISTRICTS.forEach((d) => {
  LOOKUP.set(tight(d.label), d);
  LOOKUP.set(d.key, d);
  (d.aliases || []).forEach((a) => LOOKUP.set(tight(a), d));
});

export function findDistrict(name) {
  if (!name) return null;
  return LOOKUP.get(tight(name)) || null;
}
