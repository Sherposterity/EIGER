// Mountain data for the gear pages. The index is small and bundled with the
// pages; each mountain's file is its own chunk, fetched when its page opens.
import index from '../../data/mountains/index.json';

export const MOUNTAINS = index.mountains;
export const GENERATED_AT = index.generated_at;

const loaders = import.meta.glob(['../../data/mountains/*.json', '!../../data/mountains/index.json'], {
  import: 'default',
});

const cache = new Map();

// Returns a cached promise (for React's use()) resolving to the mountain, or
// null when the slug is not in the export.
export function loadMountain(slug) {
  const key = String(slug || '').toLowerCase();
  if (!cache.has(key)) {
    const loader = MOUNTAINS.some((m) => m.slug === key) ? loaders[`../../data/mountains/${key}.json`] : null;
    cache.set(key, loader ? loader() : Promise.resolve(null));
  }
  return cache.get(key);
}
