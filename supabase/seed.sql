-- Seed: Northem as the first org, its four divisions and its hosts.
-- Run after migrations. Make yourself owner afterwards with:
--   insert into org_members (org_id, user_id, role)
--   select id, '<your auth user id>', 'owner' from orgs where slug = 'northem';

insert into orgs (slug, name, branding) values
  ('northem', 'Northem', '{"product_name": "Northem Portal", "mail_from": "Northem <hello@northem.group>"}')
on conflict (slug) do nothing;

with o as (select id from orgs where slug = 'northem')
insert into divisions (org_id, slug, name, tagline, sort, theme)
select o.id, d.slug, d.name, d.tagline, d.sort, d.theme::jsonb from o, (values
  ('productions', 'Northem Productions', 'The parts of people nobody films.', 1, '{"key": "prod"}'),
  ('development', 'Northem Development', 'Tools that get out of the way.', 2, '{"key": "dev"}'),
  ('specprod', 'Specprod', 'Shots from places cameras should not go.', 3, '{"key": "specprod"}'),
  ('sonorthem', 'SoNorthem', 'Made for the feed, built to last.', 4, '{"key": "so"}')
) as d(slug, name, tagline, sort, theme)
on conflict (org_id, slug) do nothing;

with o as (select id from orgs where slug = 'northem')
insert into org_domains (host, org_id, app, division_id, is_primary)
select h.host, o.id, h.app, (select id from divisions where org_id = o.id and slug = h.div), true
from o, (values
  ('northem.group', 'landing', null),
  ('prod.northem.group', 'division', 'productions'),
  ('dev.northem.group', 'division', 'development'),
  ('specprod.northem.group', 'division', 'specprod'),
  ('so.northem.group', 'division', 'sonorthem'),
  ('portal.northem.group', 'portal', null),
  ('admin.northem.group', 'admin', null)
) as h(host, app, div)
on conflict (host) do nothing;
