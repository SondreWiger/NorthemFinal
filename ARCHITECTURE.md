# Northem platform — architecture

One Turborepo monorepo (pnpm workspaces), deployed to Vercel as three projects, on one Supabase project, mail via Resend.

## Apps

| App | Hosts | What it does |
| --- | --- | --- |
| `apps/web` | northem.group, prod., dev., specprod., so. | All five public sites in one Next.js app. `proxy.ts` maps the host to a folder (`app/landing`, `app/prod`, `app/dev`, `app/specprod`, `app/so`), each with its own layout, stylesheet, fonts and micrographics. Locally or on preview URLs, `?site=prod` switches site. |
| `apps/portal` | portal.northem.group | Employee web app: dashboard, projects (documents gated by role and department, photos, bloopers, trivia, diary, Screenplay Studio scripts, Graphite tasks), realtime chat (channels, DMs, groups, threads, reactions, files), people, profile with tool connections, notifications, press room, invite acceptance. Org-branded for whitelabel. |
| `apps/admin` | admin.northem.group | Control room: inbox for every form (status, notes, mail replies), team and invites, roles and permission matrix, projects (details, publish, credits, public media and trivia, linked tools), hand-built public page builder with live preview, themes, credited people pages, podcasts, jobs and casting calls, press kits, divisions, branding and domains, audit log. |

| Site | Feel |
| --- | --- |
| Landing | Calm, northern, confident. Dark sky, aurora, compass and topo lines; the four divisions as doors. |
| Productions | Raw and human. Film grain, warm tungsten, slates and sprocket holes. |
| Development | Precise and playful. Blueprint grid, mono type, telemetry. |
| Specprod | Gritty and extreme. Storm grey, frost, ash, hazard orange, weather HUD. |
| SoNorthem | Loud and fast. Cream and hot pink, stickers, chunky shadows. |

Public project pages render on the division site that owns them (`prod.northem.group/p/<slug>`, `northem.group/work/<slug>` for projects without a division) with the project's own look: site theme, then an optional saved theme, then per-project tokens, section order and scoped custom CSS from the admin page builder. People pages (`/people/<slug>`) list every credit, IMDb style.

## Shared packages

- `packages/core`: types, role helpers mirroring the SQL, env, Supabase clients (server, browser, service role, proxy session refresh with the cookie on `.northem.group` so one sign-in covers portal and admin), session/permission guards, public queries with demo fallback, Resend mail templates, public form handling (honeypot, timing, rate limit), invites, encrypted tool connections and the Screenplay Studio / Graphite MCP clients.
- `packages/ui`: micrographics (pure SVG), generated posters, theme tokens and CSS scoping, public page components (project page, person page, galleries, trivia deck, podcasts), form components, and the portal/admin shell. Styles in `styles/public.css` and `styles/app.css`.

The portal is built so a native app can follow: all access rules live in Postgres (RLS), the browser client already handles realtime and uploads, and a `devices` table is ready for push tokens.

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
