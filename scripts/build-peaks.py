"""Build src/data/peaks.json for the mountain request feature.

Source: Wikidata (mountains Q8502 and volcanoes Q8072 via P31/P279*, with
coordinates P625 and an elevation P2044), fetched in elevation bands so no single query times out.
Usage:
    python scripts/build-peaks.py fetch  out/peaks_raw.json     # slow, ~20 queries
    python scripts/build-peaks.py compact out/peaks_raw.json    # writes src/data/peaks/*.json

The compact step keeps peaks of 1000 m and above, drops rows whose label is
only a Q-id, dedupes exact name+country duplicates (keeps the higher one),
strips "Mount" duplicates that Wikidata lists as separate items only when
and writes one chunk per first letter of
each meaningful word of the name (see STOP_WORDS; mirrors src/lib/peaks.js)
with compact rows [id number, name, country index, elevation_m, lat, lon]
plus countries.json. Rebuild rarely; commit the JSON.
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

ENDPOINT = "https://query.wikidata.org/sparql"
UA = "EigerPeaksBuilder/1.0 (business@eiger014.com)"
BANDS = [(1000, 1200), (1200, 1400), (1400, 1600), (1600, 1800), (1800, 2000),
         (2000, 2200), (2200, 2400), (2400, 2600), (2600, 2800), (2800, 3000),
         (3000, 3300), (3300, 3600), (3600, 4000), (4000, 4500), (4500, 5000),
         (5000, 5500), (5500, 6000), (6000, 6500), (6500, 7000), (7000, 9000)]
QUERY = """
SELECT ?item ?itemLabel ?countryLabel ?elev ?coord WHERE {
  VALUES ?cls { wd:Q8502 wd:Q8072 }
  ?item wdt:P31/wdt:P279* ?cls ;
        wdt:P2044 ?elev ;
        wdt:P625 ?coord .
  FILTER(?elev >= %d && ?elev < %d)
  OPTIONAL { ?item wdt:P17 ?country . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,it,es". }
}
"""


def run(query, tries=4):
    url = ENDPOINT + "?" + urllib.parse.urlencode({"query": query, "format": "json"})
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)["results"]["bindings"]
        except Exception as e:  # noqa: BLE001
            print("retry", i, e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    return []


def fetch(out):
    seen = {}
    for lo, hi in BANDS:
        rows = run(QUERY % (lo, hi))
        for b in rows:
            qid = b["item"]["value"].rsplit("/", 1)[-1]
            name = b.get("itemLabel", {}).get("value", "")
            if not name or name == qid:
                continue
            try:
                lon, lat = b["coord"]["value"][6:-1].split(" ")
                lat, lon = round(float(lat), 4), round(float(lon), 4)
                elev = int(float(b["elev"]["value"]))
            except Exception:  # noqa: BLE001
                continue
            country = b.get("countryLabel", {}).get("value", "")
            seen.setdefault(qid, [qid, name, country, elev, lat, lon])
        print(f"band {lo}-{hi}: {len(rows)} rows, total {len(seen)}", flush=True)
        time.sleep(1)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(list(seen.values()), open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print("wrote", out, len(seen))


STOP_WORDS = {
    "mount", "mt", "mont", "monte", "montagne", "montana", "montaña", "pico", "picco", "piz", "punta", "cerro", "nevado", "volcan", "volcán", "volcano",
    "peak", "mountain", "berg", "spitze", "kogel", "horn", "gora", "gunung", "puncak", "jabal", "jebel", "pik", "the", "of", "de", "la", "le", "les", "du", "del",
    "della", "di", "da", "el", "and", "des", "den", "der", "al",
}
# Mirror of src/lib/peaks.js (normalize, words, chunkKeysFor); tests/peaks.test.js checks they agree.
import re, unicodedata

def normalize(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower().strip()

def chunk_keys(name):
    ws = [w for w in re.split(r"[^a-z0-9]+", normalize(name)) if w]
    meaningful = [w for w in ws if w not in STOP_WORDS] or ws[:1]
    return {w[0] if re.match(r"[a-z]", w[0]) else "0" for w in meaningful}


def compact(raw, out_dir="src/data/peaks"):
    rows = json.load(open(raw, encoding="utf-8"))
    rows = [r for r in rows if 1000 <= r[3] <= 8849 and len(r[1]) <= 120 and not (r[1][:1] == "Q" and r[1][1:].isdigit())]
    rows.sort(key=lambda r: -r[3])
    # Dedupe by name + country only (keep the higher one). No location dedupe:
    # it dropped Mont Blanc in favour of a rock pillar item in the same cell.
    by_name, keep = set(), []
    for r in rows:
        nk = (r[1].lower(), r[2].lower())
        if nk in by_name:
            continue
        by_name.add(nk)
        keep.append(r)
    countries = sorted({r[2] for r in keep})
    ci = {c: i for i, c in enumerate(countries)}
    chunks = {}
    for r in keep:
        row = [int(r[0][1:]), r[1], ci[r[2]], r[3], round(r[4], 3), round(r[5], 3)]
        for k in chunk_keys(r[1]):
            chunks.setdefault(k, []).append(row)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.json"):
        old.unlink()
    (out / "countries.json").write_text(json.dumps(countries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for k, rs in chunks.items():
        (out / f"{k}.json").write_text(json.dumps(rs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    biggest = max(chunks.items(), key=lambda kv: len(kv[1]))
    print("wrote", out, len(keep), "peaks in", len(chunks), "chunks; biggest", biggest[0], len(biggest[1]))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "compact"
    if cmd == "fetch":
        fetch(sys.argv[2])
    else:
        compact(sys.argv[2], *(sys.argv[3:4]))
