-- Regenerates src/data/gear-snapshot.json (website demo data).
-- Run against the Supabase project with a read-only role; paste the single
-- jsonb result into src/data/gear-snapshot.json. Public fields only: no
-- rationale, reviewer_notes or staging rows are selected. Only approved
-- trail_gear_profile rows are included.
-- Season note: in the app, season is a user toggle (summer or winter), not
-- derived from a date. The demo mirrors that; it does not map months to seasons.
select jsonb_pretty(jsonb_build_object(
 'generated_at', now()::date,
 'source', 'Supabase project pebwnpcnawdrytqlzjmb, tables trails + trail_gear_profile (status = approved) + gear_item_types; public fields only',
 'note', 'Example snapshot for the website demo. The app reads live data. Season is a user choice in the app (summer or winter), not derived from a date.',
 'mountains', (select jsonb_agg(m order by m->>'name') from (
  select jsonb_build_object(
   'slug', lower(regexp_replace(t.name,'[^A-Za-z0-9]+','-','g')),
   'name', t.name, 'altitude_m', t.altitude_m, 'difficulty', t.difficulty::text, 'duration_days', t.duration_days,
   'technical', t.technical, 'glaciated', t.glaciated, 'avalanche_terrain', t.avalanche_terrain,
   'summer_insulation_gsm', t.summer_insulation_required, 'winter_insulation_gsm', t.winter_insulation_required,
   'typical_temp_min_c', t.typical_temperature_min_c, 'typical_temp_max_c', t.typical_temperature_max_c,
   'goretex_required', jsonb_build_object('boots', t.goretex_required_boots, 'gloves', t.goretex_required_gloves, 'outer_shell', t.goretex_required_outer_shell),
   'winter_essentials', coalesce(t.winter_loadout->'essentialGear','[]'::jsonb),
   'image', jsonb_build_object('url', t.image_url, 'credit', t.image_credit, 'license', t.image_license, 'source', t.image_source_url),
   'gear', (select jsonb_agg(jsonb_build_object('item', g.display_name, 'group', g.category_group, 'level', p.requirement_level, 'min_items', p.min_items) order by g.sort_order)
            from trail_gear_profile p join gear_item_types g on g.item_type=p.item_type where p.trail_id=t.id and p.status='approved')
  ) as m from trails t where t.name in ('Mount Rainier','Mount Whitney','Mount Elbert','Mont Blanc','Matterhorn','Ben Nevis','Mount Hood','Longs Peak')) s)
));
