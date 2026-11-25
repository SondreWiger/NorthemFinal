# Northem platform — architecture

One Turborepo monorepo, deployed to Vercel as seven projects, on one Supabase project, mail via Resend.

## Apps

| App | Host | Feel | What it does |
| --- | --- | --- | --- |
| `apps/landing` | northem.group | Calm, northern, confident. Dark sky, aurora accents, the four divisions as doors. | Story, divisions, featured work, people, podcast, "reach out" hub, Northem Pro licence page. |
| `apps/prod` | prod.northem.group | Raw and human. Film grain, warm tungsten, handwritten notes, faces first. | Productions slate, IMDb-style project pages, people, openings, pitch an idea. |
| `apps/dev` | dev.northem.group | Precise and playful. Blueprint grid, mono type, live code-ish micrographics. | Products and client work, case studies, "start a project" brief form, tools to try. |
| `apps/specprod` | specprod.northem.group | Gritty and extreme. Storm grey, frost, ash, hazard orange, weather telemetry HUD. | Extreme-environment showreel, capabilities (cold, volcano, storm, aerial), "book a shoot" form. |
| `apps/so` | so.northem.group | Loud and fast. Bold colour blocks, stickers, vertical-video frames. | Social work, formats, results, "grow with us" form. |
| `apps/portal` | portal.northem.group | Calm work tool, org-branded (whitelabel). | Projects, documents (incl. Screenplay Studio + Graphite), chat, people, profile editor, notifications, invites. |
| `apps/admin` | admin.northem.group | Dense control room. | Orgs, divisions, domains, roles & permissions, people, invites, inbox (forms/applications), openings, projects + public page/theme builder, podcasts, press kits, audit log. |

Public project pages render in the division app that owns them (`prod.northem.group/p/white-silence`) with the project's own theme; people pages at `/people/<slug>` show their credits, tagged photos, bloopers and podcast appearances.

## Shared packages

- `packages/db`: Supabase migrations (this folder), generated types, typed queries.
- `packages/auth`: Supabase SSR clients, session cookie on `.northem.group` so one sign-in covers portal and admin, role helpers mirroring the SQL.
- `packages/ui`: primitives (buttons, forms, dialogs) themed by CSS variables, so each app and each project page can restyle them.
- `packages/micro`: SVG micrographics and motion bits (grain, weather HUD, blueprint, aurora, stickers).
- `packages/mail`: Resend client + React Email templates (invite, added to project, form receipt, new submission alert).
- `packages/integrations`: Screenplay Studio and Graphite clients. Both are separate Supabase projects; we call their MCP/API with each person's own token (`sps_...` for SPS, Graphite personal token), stored encrypted in `user_connections`. The portal therefore never shows more than the person could see in those apps.
- `packages/themes`: project/division theme schema (zod), presets, and the renderer for hand-built page blocks.
- `packages/config`: tsconfig, eslint, tailwind preset (loosely from the Northem brand kit).

## Data and access (Supabase)

See `supabase/migrations`. Summary:

- **Tenancy:** every row has `org_id`; `org_domains` maps hosts to org + app, so the same deployment can serve another studio's intranet (whitelabel). Branding lives on `orgs.branding`.
- **Roles:** org role `guest < press < cast < crew < producer < admin < owner`; project role `guest < cast < crew < head < lead`. Admin can toggle capabilities per role (`role_permissions`). Owners can't lock themselves out; nobody grants a role at or above their own.
- **Documents and links** carry `min_role` + `departments`: cast see sides and call sheets, not budgets; camera sees camera notes.
- **Public pages** read only `is_public` rows on published projects. Crew can upload BTS and bloopers but only heads/leads publish.
- **People vs profiles:** `people` are credit-able names (no account needed). When someone joins, their account links to their person and they edit their own bio/photo/links.
- **Invites:** adding an email that has no account creates an invite (hashed token, 14 days) and a Resend mail; `accept_invite()` wires org role, project role and the credited person. Existing users are added directly and notified.
- **Inbox:** all public forms go through server actions (validation, rate limit, bot check) into `submissions`; anon can't read or write it.
- **Real side of productions:** `media` (stills, BTS, bloopers, video), `trivia` (trivia, goofs, quotes, confessions), `moments` (production diary), `podcast_episodes` (internal audio or Spotify/YouTube/Apple links, many per project) with guests.
- **Press:** `press_kits` + items; Press role sees all kits, public kits are downloadable.
- **Chat:** org channels, project channels (auto-created), groups, DMs, threads, reactions, read markers; Supabase Realtime under RLS.
- **App-ready:** `devices` for push tokens; all access rules live in Postgres so a native app uses the same API safely.

`supabase/tests/run.sh` applies everything to a plain Postgres with a small Supabase stub and runs 39 RLS scenarios (actor, gaffer, director, press, outsider, anonymous, invite).

## Environment (Vercel, per app)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, portal/admin/division apps for forms), `RESEND_API_KEY`, `MAIL_FROM`, `CONNECTIONS_ENC_KEY` (32-byte base64 for integration tokens), `SPS_BASE_URL`, `GRAPHITE_BASE_URL`, `NEXT_PUBLIC_ROOT_DOMAIN=northem.group`.

## Setup order

1. Create the Supabase project, then `supabase link` + `supabase db push`, then run `seed.sql` and make yourself owner (see the comment at the top of `seed.sql`).
2. Supabase Auth: site URL `https://portal.northem.group`, redirect URLs for portal and admin, email templates sent through Resend SMTP.
3. Resend: verify `northem.group`, add the API key to Vercel.
4. Vercel: one project per app (root directory `apps/<name>`), domains as above.
