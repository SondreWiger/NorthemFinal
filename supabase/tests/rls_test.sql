-- RLS scenario test. Run on a fresh DB after supabase_stub.sql, migrations and seed.
-- Fails loudly (ERROR) on the first broken expectation.
\set ON_ERROR_STOP 1
create or replace function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if;
  raise notice 'ok  %', label;
end $$;
grant execute on function pg_temp.expect(text, bigint, bigint) to anon, authenticated;

-- Users: Owner, Director (producer), Actor (cast), Gaffer (crew, camera), Press, Outsider.
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'owner@n.test'),
 ('00000000-0000-0000-0000-00000000000d', 'director@n.test'),
 ('00000000-0000-0000-0000-0000000000ac', 'actor@n.test'),
 ('00000000-0000-0000-0000-0000000000ca', 'gaffer@n.test'),
 ('00000000-0000-0000-0000-0000000000be', 'press@n.test'),
 ('00000000-0000-0000-0000-0000000000ff', 'outsider@n.test');
select pg_temp.expect('profiles auto-created', (select count(*) from profiles), 6);
insert into org_members (org_id, user_id, role)
select id, '00000000-0000-0000-0000-00000000000a', 'owner' from orgs where slug = 'northem';

-- Owner adds the team through RLS.
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into org_members (org_id, user_id, role, departments)
select id, u, r::org_role, d from orgs, (values
  ('00000000-0000-0000-0000-00000000000d'::uuid, 'producer', '{}'::text[]),
  ('00000000-0000-0000-0000-0000000000ac'::uuid, 'cast', '{}'),
  ('00000000-0000-0000-0000-0000000000ca'::uuid, 'crew', '{camera}'),
  ('00000000-0000-0000-0000-0000000000be'::uuid, 'press', '{}')) as m(u, r, d)
where slug = 'northem';
do $$ begin
  begin update org_members set role = 'crew' where user_id = auth.uid();
        raise exception 'FAIL last owner could demote self';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  last owner protected'; end;
end $$;

-- Director creates a private film.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into projects (org_id, division_id, slug, title, kind)
select o.id, d.id, 'white-silence', 'White Silence', 'feature' from orgs o join divisions d on d.org_id = o.id and d.slug = 'specprod';
select pg_temp.expect('director is lead', (select count(*) from project_members where role = 'lead'), 1);
select pg_temp.expect('project channel created', (select count(*) from chat_channels where kind = 'project'), 1);
do $$ begin
  begin update org_members set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000ac';
  exception when others then raise notice 'ok  producer blocked from roles (%)', sqlerrm; end;
end $$;
select pg_temp.expect('producer cannot change roles', (select count(*) from org_members where role = 'admin'), 0);
insert into project_members (project_id, user_id, role, departments)
select id, u, r::project_role, d from projects, (values
  ('00000000-0000-0000-0000-0000000000ac'::uuid, 'cast', '{}'::text[]),
  ('00000000-0000-0000-0000-0000000000ca'::uuid, 'crew', '{camera}')) as m(u, r, d);
do $$ begin
  begin insert into project_members (project_id, user_id) select id, '00000000-0000-0000-0000-0000000000ff' from projects;
        raise exception 'FAIL outsider added to project';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  non-members need an invite'; end;
end $$;
insert into documents (project_id, title, category, source, url, min_role, departments, created_by)
select id, t, c, 'link', 'https://x.test/' || c, r::project_role, d, auth.uid() from projects, (values
  ('Call sheet day 1', 'callsheet', 'cast', '{}'::text[]),
  ('Budget', 'budget', 'crew', '{production}'),
  ('Camera notes', 'spec', 'crew', '{camera}')) as x(t, c, r, d);
insert into people (org_id, slug, name, profile_id)
select id, 'actor', 'Ada Actor', '00000000-0000-0000-0000-0000000000ac' from orgs;
insert into credits (project_id, person_id, department, job, character_name)
select p.id, pe.id, 'cast', 'Actor', 'The Climber' from projects p, people pe;
insert into trivia (project_id, body, is_public, created_by) select id, 'Shot at -31C', true, auth.uid() from projects;
insert into press_kits (org_id, project_id, title) select org_id, id, 'White Silence EPK' from projects;
select pg_temp.expect('director cannot read actor notifications', (select count(*) from notifications), 0);

-- What each person sees.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ac';
select pg_temp.expect('actor docs (call sheet only)', (select count(*) from documents), 1);
select pg_temp.expect('actor notifications', (select count(*) from notifications), 2);
select pg_temp.expect('actor reads project chat', (select count(*) from chat_channels), 1);
insert into chat_messages (channel_id, author_id, body) select id, auth.uid(), 'Cold out here' from chat_channels;
update people set bio = 'Climber, actor' where profile_id = auth.uid();
select pg_temp.expect('actor edited own person', (select count(*) from people where bio is not null), 1);
do $$ begin
  begin update people set slug = 'hacked' where profile_id = auth.uid(); raise exception 'FAIL relinked';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  person slug locked'; end;
end $$;
select open_dm((select id from orgs), '00000000-0000-0000-0000-0000000000ca') is not null as dm_opened \gset
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ca';
select pg_temp.expect('gaffer docs (call sheet + camera)', (select count(*) from documents), 2);
select pg_temp.expect('gaffer sees DM + project channel', (select count(*) from chat_channels), 2);
select pg_temp.expect('gaffer reads message', (select count(*) from chat_messages), 1);
do $$ begin
  begin insert into media (project_id, kind, external_url, is_public, uploaded_by)
        select id, 'bts', 'https://x.test/a.jpg', true, auth.uid() from projects;
        raise exception 'FAIL crew published media';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  crew cannot publish'; end;
end $$;
insert into media (project_id, kind, external_url, uploaded_by) select id, 'blooper', 'https://x.test/b.mp4', auth.uid() from projects;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select pg_temp.expect('director docs (all)', (select count(*) from documents), 3);
select pg_temp.expect('director cannot read the DM', (select count(*) from chat_channels where kind = 'dm'), 0);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000be';
select pg_temp.expect('press sees no private project', (select count(*) from projects), 0);
select pg_temp.expect('press sees no docs', (select count(*) from documents), 0);
select pg_temp.expect('press sees press kit', (select count(*) from press_kits), 1);
select pg_temp.expect('press sees no chat', (select count(*) from chat_channels), 0);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ff';
select pg_temp.expect('outsider sees no project', (select count(*) from projects), 0);
select pg_temp.expect('outsider sees no kit', (select count(*) from press_kits), 0);
select pg_temp.expect('outsider sees no members', (select count(*) from org_members), 0);

-- Anonymous visitor before and after publishing.
reset request.jwt.claim.sub; set role anon;
select pg_temp.expect('anon: unpublished hidden', (select count(*) from projects), 0);
select pg_temp.expect('anon: credits hidden', (select count(*) from credits), 0);
do $$ begin
  begin insert into submissions (org_id, form, email) select id, 'contact', 'a@b.c' from orgs; raise exception 'FAIL anon wrote inbox';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  inbox is server-only'; end;
end $$;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
update projects set visibility = 'public', published_at = now() - interval '1 minute';
reset request.jwt.claim.sub; set role anon;
select pg_temp.expect('anon: published project', (select count(*) from projects), 1);
select pg_temp.expect('anon: public credit', (select count(*) from credits), 1);
select pg_temp.expect('anon: public trivia', (select count(*) from trivia), 1);
select pg_temp.expect('anon: private blooper hidden', (select count(*) from media), 0);
select pg_temp.expect('anon: no documents', (select count(*) from documents), 0);
select pg_temp.expect('anon: filmography via person', (select count(*) from credits c join people p on p.id = c.person_id where p.slug = 'actor'), 1);

-- Invite flow: server creates the invite, newcomer signs up and accepts.
reset role;
insert into invites (org_id, email, token_hash, org_role, project_id, project_role, departments, invited_by)
select org_id, 'New@N.test', encode(digest('tok123', 'sha256'), 'hex'), 'crew', id, 'crew', '{sound}', created_by from projects;
set role anon;
select pg_temp.expect('anon invite preview', (select count(*) from (select invite_preview('tok123') v) s where v->>'project' = 'White Silence'), 1);
select pg_temp.expect('wrong token preview', (select count(*) from (select invite_preview('nope') v) s where v is not null), 0);
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ee', 'new@n.test');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ee';
set request.jwt.claims = '{"email": "new@n.test"}';
select accept_invite('tok123') is not null as accepted \gset
select pg_temp.expect('newcomer is project crew', (select count(*) from project_members where user_id = auth.uid() and role = 'crew'), 1);
select pg_temp.expect('newcomer docs (call sheet only, not camera)', (select count(*) from documents), 1);
do $$ begin
  begin perform accept_invite('tok123'); raise exception 'FAIL reused invite';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  invite single-use'; end;
end $$;
reset role;
select 'ALL RLS TESTS PASSED' as result;
