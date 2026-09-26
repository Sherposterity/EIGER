# "Why not just use AllTrails?" comparison: verification record (2026-09-25)

Every claim on the home page comparison must trace to this file. AllTrails facts were read from AllTrails' own pages on 2026-09-25; EIGER facts from the app repo and read-only SQL on the live database.

## Row 1: Terrain classification
AllTrails
- Four member-assigned difficulty levels: "Easy, Moderate, Hard, and Strenuous"; "AllTrails members have the ability to rate and designate the difficulty rating for trails." https://support.alltrails.com/hc/en-us/articles/16596491196436-Difficulty-ratings-on-AllTrails
- Peak plan adds a "Slope angle" overlay and "High-definition terrain"; Plus adds "Ground conditions" and "Snow depth"; base map shows land cover incl. glaciers. https://support.alltrails.com/hc/en-us/articles/37228180990228-AllTrails-map-types-overlays-and-extras
- Glacier/crevasse information appears only in route prose and review tags (e.g. Rainier standard route: "Conditions: Snow, Icy, Glacier travel, Exposure / drop-offs"). https://www.alltrails.com/trail/us/washington/mount-rainier-standard-summit-route
- Help center search for "avalanche": no results. No structured glaciated / avalanche / altitude-zone field found (app internals not inspected).
EIGER
- Per-mountain yes/no flags `technical`, `glaciated`, `avalanche_terrain` (migration 006), all 97 mountains set (technical 68, glaciated 49, avalanche 94); the migration states they are not derived from difficulty.
- `altitude_zone` column is EMPTY on all 97 rows and unused by the app: do NOT claim altitude zoning.
- Route-mix percentages in the app are estimates (app/utils/trailMetadata.ts:109); snow-hazard estimate is weather-based, labelled "Weather estimate, not an avalanche forecast" (app/services/TrailSafetyService.ts:106).

## Row 2: Gear compatibility
AllTrails
- Trail Conditions helps you "pack all the necessary gear" (Plus/Peak); premium "Member deals: Get exclusive savings on outdoor apparel and gear." https://support.alltrails.com/hc/en-us/articles/36933535617300-Trail-Conditions , https://support.alltrails.com/hc/en-us/articles/43589223010708-The-benefits-of-AllTrails-premium-membership
- No gear list, packing list or compatibility feature found on the help center, the Plus page (https://www.alltrails.com/plus) or the App Store listing (https://apps.apple.com/us/app/alltrails-hike-bike-run/id405075943).
EIGER
- Boot/crampon rule "C1 needs B1+, C2 needs B2+, C3 needs B3; B0 satisfies nothing" (app/utils/gearScoring.ts:432-475); listed pairings that cannot attach are flagged (gearScoring.ts:531 via MountainGearWidgets.tsx:234). Coverage partial: 117 approved items carry boot_class, 170 carry crampon_compatibility.
- Per-mountain `summer_insulation_required` / `winter_insulation_required` (g/m2), jackets scored on insulation_gsm with fill adjustments (gearScoring.ts:889-911).

## Row 3: Summit forecast
AllTrails
- Free: current conditions, 7-day, highs/lows, sunrise/sunset. Plus/Peak: Trail Conditions (temperature, precipitation, snow accumulation, air quality, sun and moon), hourly, varying "based on the day, time, or location on the trail"; sources Meteomatics and Tomorrow.io. https://support.alltrails.com/hc/en-us/articles/36933535617300-Trail-Conditions
- Own caveat: "should be used as a general guide". https://support.alltrails.com/hc/en-us/articles/43362240593684-AllTrails-weather-legend
- No summit-elevation forecast found; not verified either way. Do NOT claim AllTrails lacks high-elevation weather.
EIGER
- Open-Meteo queried at each mountain's stored coordinates, which are the summit point (WeatherConditions.tsx:180); no explicit elevation parameter. Claim = "forecast at the summit point", not a guaranteed summit-altitude forecast. No "summit window" feature exists.
- Main card: 12-hour hourly strip, sunrise/sunset, wind and gusts, UV, alpine-start warning from the freeze-thaw pattern (app/utils/alpineStart.ts). Detail: 16-day daily (5 free, rest Pro; WeatherDetailModal.tsx:38-39); 7-day snow-hazard estimate linking to the official bulletin.

## Words to avoid on the site
"altitude-zoned" / "altitude zoning" (EIGER; the field is empty), "summit window" (no feature), "AllTrails has no terrain data", "AllTrails has no high-elevation weather". The current live Mission page says "altitude-zoned terrain data"; that phrase must not survive the redesign.
