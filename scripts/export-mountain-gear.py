# Pages removed 2026-09-30, script kept for future use; its output dir (src/data/mountains/) no longer exists.
r"""Export public per-mountain gear lists for the website's /mountains pages.

Run from the site repo:
    python scripts/export-mountain-gear.py

Writes src/data/mountains/index.json and src/data/mountains/<slug>.json.
Read only: every statement is a SELECT sent through the Supabase management
API, with the token read in memory by eiger-ops/scripts/secrets.py (the same
mechanism as eiger-ops/scripts/export_app_mountains.py). The token is never
printed; error text goes through secrets.redact.

Public fields only, following scripts/gear-snapshot.sql: trails facts,
trail_gear_profile rows with status = 'approved' (item, level, season,
min_items; never rationale or reviewer_notes), gear_item_types names, and
approved gear_items linked through mountain_gear_links (brand, product name,
product URL; never images). No staging rows, no user data.

Review status: a mountain counts as reviewed only when a mountain_reviews row
has state 'verified' AND an applied_migration (the reviewer's changes are
live). Reviewer identity is not exported.

Product order per gear slot: mountain_gear_links.seed_rank ascending (nulls
last), then like_count descending, then product name. This is the
non-personal part of the app's ranking (hike app/config/gearRanking.ts: seed
rank is the curated signal; the rest of the app's blend is per user).
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, r"C:\Users\Rishav Akilla\eiger-ops\scripts")
from secrets import redact, secret  # noqa: E402

PROJECT = "pebwnpcnawdrytqlzjmb"
SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "src" / "data" / "mountains"
APP_MOUNTAINS = SITE / "src" / "data" / "app-mountains.json"
PRODUCTS_PER_SLOT = 3
CATEGORY_ORDER = ["Clothing", "Footwear", "Technical Hardware", "Camp & Sleep", "Essentials & Accessories"]
LEVELS = ["essential", "recommended", "optional"]

# Country for the app mountains that have no peak dataset match in
# app-mountains.json (peakId null). Checked by hand 2026-09-30.
COUNTRY_FALLBACK = {
    "Cloud Peak": "United States",
    "Dents du Midi (Haute Cime)": "Switzerland",
    "Granite Peak": "United States",
    "Mount Adams": "United States",
    "Mount Dana": "United States",
    "Mount Jefferson": "United States",
    "Mount Russell": "United States",
    "Mount Washington": "United States",
    "South Sister": "United States",
}

# Summits on a national border: the peaks dataset gives one country, the page
# names both. Checked by hand 2026-09-30 (summit on the border line itself).
# Dufourspitze stays Switzerland: the Monte Rosa massif is shared with Italy,
# but the Dufourspitze summit itself lies in Switzerland.
BORDER_COUNTRIES = {
    "Mont Blanc": ["France", "Italy"],
    "Matterhorn": ["Switzerland", "Italy"],
    "Grandes Jorasses (Pointe Walker)": ["France", "Italy"],
    "Breithorn": ["Switzerland", "Italy"],
    "Castor": ["Switzerland", "Italy"],
    "Pollux": ["Switzerland", "Italy"],
    "Piz Palü": ["Switzerland", "Italy"],
    "Piz Buin": ["Switzerland", "Austria"],
    "Aiguille du Tour": ["France", "Switzerland"],
    "Mangart": ["Italy", "Slovenia"],
    "Zugspitze": ["Germany", "Austria"],
}

DASHES = {"\u2013": "-", "\u2014": "-", "\u2012": "-", "\u2015": "-"}


def clean(value):
    """Strip em and en dashes (house rule) from every exported string."""
    if isinstance(value, str):
        for d, r in DASHES.items():
            value = value.replace(d, r)
        return value.strip()
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    return value


def slugify(name: str) -> str:
    s = "".join(c for c in unicodedata.normalize("NFD", name) if unicodedata.category(c) != "Mn")
    s = s.replace("ø", "o").replace("Ø", "o")
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def run_sql(token: str, sql: str):
    if not sql.lstrip().lower().startswith(("select", "with")):
        raise SystemExit("refusing: this export only runs SELECT statements")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read() or b"[]")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        raise SystemExit(f"HTTP {e.code}: {redact(body, token)}") from None


TRAILS_SQL = """
select t.id, t.name, t.altitude_m, t.difficulty::text as difficulty, t.duration_days,
       t.technical, t.glaciated, t.avalanche_terrain,
       t.typical_temperature_min_c as temp_min_c, t.typical_temperature_max_c as temp_max_c,
       t.summer_insulation_required as summer_insulation_gsm,
       t.winter_insulation_required as winter_insulation_gsm,
       exists (select 1 from mountain_reviews r where r.trail_id = t.id
               and r.state = 'verified' and r.applied_migration is not null) as reviewed,
       (select max(r.verified_at)::date::text from mountain_reviews r where r.trail_id = t.id
               and r.state = 'verified' and r.applied_migration is not null) as reviewed_on
from trails t order by t.name
"""

PROFILE_SQL = """
select p.trail_id, p.item_type, p.requirement_level as level, p.season, p.min_items,
       g.display_name, g.category_group, g.sort_order
from trail_gear_profile p join gear_item_types g on g.item_type = p.item_type
where p.status = 'approved'
order by p.trail_id, g.sort_order, g.display_name, p.season
"""

PRODUCTS_SQL = f"""
with fits as (
  select gear_item_id, count(distinct trail_id) as n from mountain_gear_links group by 1
), ranked as (
  select l.trail_id, i.item_type, i.brand_name, i.product_name, i.product_url, f.n as fits,
         row_number() over (partition by l.trail_id, i.item_type
           order by l.seed_rank asc nulls last, l.like_count desc nulls last, i.product_name) as rk
  from mountain_gear_links l
  join gear_items i on i.id = l.gear_item_id and i.data_status = 'approved'
  join fits f on f.gear_item_id = i.id
  where i.product_url ~ '^https?://'
)
select trail_id, item_type, brand_name, product_name, product_url, fits, rk
from ranked where rk <= {PRODUCTS_PER_SLOT} order by trail_id, item_type, rk
"""


def main() -> int:
    token = secret("supabase.txt", r"sbp_[A-Za-z0-9]{20,}")
    trails = run_sql(token, TRAILS_SQL)
    profile = run_sql(token, PROFILE_SQL)
    products = run_sql(token, PRODUCTS_SQL)

    app = json.loads(APP_MOUNTAINS.read_text(encoding="utf-8"))["mountains"]
    peak_by_trail = {m["id"]: m.get("peakId") for m in app}
    peak_ids = sorted({p for p in peak_by_trail.values() if p})
    countries = {}
    if peak_ids:
        ids = ",".join("'" + re.sub(r"[^A-Za-z0-9]", "", p) + "'" for p in peak_ids)
        for r in run_sql(token, f"select id, country from peaks where id in ({ids})"):
            countries[r["id"]] = r["country"]

    rows_by_trail: dict[str, list] = {}
    for r in profile:
        rows_by_trail.setdefault(r["trail_id"], []).append(r)
    products_by_slot: dict[tuple, list] = {}
    for r in products:
        products_by_slot.setdefault((r["trail_id"], r["item_type"]), []).append(r)

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()

    index, seen, product_links, distinct_products = [], set(), 0, set()
    for t in trails:
        slug = slugify(t["name"])
        if slug in seen:
            raise SystemExit(f"duplicate slug {slug}")
        seen.add(slug)
        single = countries.get(peak_by_trail.get(t["id"]) or "") or COUNTRY_FALLBACK.get(t["name"])
        country_list = BORDER_COUNTRIES.get(t["name"]) or ([single] if single else [])
        country = " and ".join(country_list) or None

        groups: dict[str, list] = {}
        products_out: dict[str, list] = {}
        for r in rows_by_trail.get(t["id"], []):
            groups.setdefault(r["category_group"] or "Other", []).append(
                {"item_type": r["item_type"], "name": r["display_name"], "level": r["level"],
                 "season": r["season"], "min_items": r["min_items"]}
            )
            if r["item_type"] not in products_out:
                picks = [
                    {"name": p["product_name"], "brand": p["brand_name"], "url": p["product_url"], "fits_count": p["fits"]}
                    for p in products_by_slot.get((t["id"], r["item_type"]), [])
                ]
                if picks:
                    products_out[r["item_type"]] = picks
                    product_links += len(picks)
                    distinct_products.update(p["url"] for p in picks)
        rank = lambda g: CATEGORY_ORDER.index(g) if g in CATEGORY_ORDER else len(CATEGORY_ORDER)  # noqa: E731
        gear = [{"group": g, "items": items} for g, items in sorted(groups.items(), key=lambda kv: rank(kv[0]))]
        rows = [i for g in gear for i in g["items"]]
        counts = {lvl: sum(1 for i in rows if i["level"] == lvl and i["season"] in ("all", "summer")) for lvl in LEVELS}
        counts["winter"] = sum(1 for i in rows if i["season"] == "winter")
        counts["products"] = sum(len(v) for v in products_out.values())
        review = {"status": "reviewed" if t["reviewed"] else "pending", "reviewed_on": t["reviewed_on"]}
        facts = {
            "altitude_m": t["altitude_m"], "difficulty": t["difficulty"], "duration_days": t["duration_days"],
            "technical": bool(t["technical"]), "glaciated": bool(t["glaciated"]),
            "avalanche_terrain": bool(t["avalanche_terrain"]),
            "temp_min_c": t["temp_min_c"], "temp_max_c": t["temp_max_c"],
            "summer_insulation_gsm": t["summer_insulation_gsm"], "winter_insulation_gsm": t["winter_insulation_gsm"],
        }
        doc = {
            "generated_at": generated_at, "slug": slug, "name": t["name"], "country": country, "countries": country_list,
            **facts, "review": review, "counts": counts, "gear": gear, "products": products_out,
        }
        (OUT / f"{slug}.json").write_text(json.dumps(clean(doc), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        index.append({
            "slug": slug, "name": t["name"], "country": country, "countries": country_list, "range": None,
            "altitude_m": t["altitude_m"], "difficulty": t["difficulty"],
            "glaciated": bool(t["glaciated"]), "technical": bool(t["technical"]),
            "review_status": review["status"], "counts": counts,
        })

    (OUT / "index.json").write_text(
        json.dumps(clean({"generated_at": generated_at, "source": "Supabase project pebwnpcnawdrytqlzjmb: trails, trail_gear_profile (status approved), gear_item_types, gear_items via mountain_gear_links; public fields only", "mountains": index}), ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    reviewed = sum(1 for m in index if m["review_status"] == "reviewed")
    with_winter = sum(1 for m in index if m["counts"]["winter"])
    print(f"wrote {len(index)} mountains to {OUT.relative_to(SITE)}; reviewed {reviewed}; with winter rows {with_winter}; "
          f"product links {product_links} ({len(distinct_products)} distinct products); no country {sum(1 for m in index if not m['country'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
