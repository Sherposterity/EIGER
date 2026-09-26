// Chunk loader for the peaks dataset (src/data/peaks/, built by
// scripts/build-peaks.py from Wikidata). One file per first letter, so a
// search downloads only the letter the visitor typed (about 40 to 140 KB
// gzipped instead of 1 MB for everything). Pure helpers live in
// peaksSearch.js and are re-exported here for the components.
//
// A failed download is forgotten, so the next keystroke retries it.

import { rowToPeak } from './peaksSearch';

export * from './peaksSearch';

const chunkLoaders = import.meta.glob('../data/peaks/[a-z0].json');
let countriesLoader = null;
const loaded = new Map();

export const loadCountries = () => {
  if (!countriesLoader) {
    countriesLoader = import('../data/peaks/countries.json')
      .then((m) => m.default ?? m)
      .catch((err) => {
        countriesLoader = null;
        throw err;
      });
  }
  return countriesLoader;
};

// Load one chunk (cached). Resolves to expanded peaks.
export const loadChunk = (key) => {
  if (!loaded.has(key)) {
    const loader = chunkLoaders[`../data/peaks/${key}.json`];
    const promise = loader
      ? Promise.all([loader(), loadCountries()])
          .then(([m, countries]) => (m.default ?? m).map((row) => rowToPeak(row, countries)))
          .catch((err) => {
            loaded.delete(key);
            throw err;
          })
      : Promise.resolve([]);
    loaded.set(key, promise);
  }
  return loaded.get(key);
};
