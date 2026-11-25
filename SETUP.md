# Setting up Northem (one time)

Three Vercel projects from this one repo, one Supabase project, Resend for mail.

| Vercel project | Root directory | Domains |
| --- | --- | --- |
| northem-web | `apps/web` | northem.group, www.northem.group, prod.northem.group, dev.northem.group, specprod.northem.group, so.northem.group |
| northem-portal | `apps/portal` | portal.northem.group |
| northem-admin | `apps/admin` | admin.northem.group |

`apps/web` serves the landing site and all four division sites; it picks the site from the hostname. That keeps one build, one cache and shared project pages, and each site still has its own look.

## 1. Database (Supabase)

1. Supabase dashboard → SQL editor → paste all of `supabase/apply_all.sql` → Run. It creates every table, the access rules, storage buckets and the Northem org with its four divisions.
2. Authentication → URL configuration:
   - Site URL: `https://portal.northem.group`
   - Redirect URLs: `https://portal.northem.group/**`, `https://admin.northem.group/**`, `http://localhost:3001/**`, `http://localhost:3002/**`
3. Authentication → Emails → SMTP settings → enable custom SMTP with Resend, so sign-in mails come from northem.group:
   host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `hello@northem.group`.
4. Sign in once at portal.northem.group (magic link), then make yourself owner in the SQL editor:

```sql
insert into org_members (org_id, user_id, role)
select o.id, u.id, 'owner' from orgs o, auth.users u
where o.slug = 'northem' and u.email = 'YOUR EMAIL';
```

From then on, everyone else is added from admin.northem.group → Team & invites (by email; new people get an invite mail), or from a project's Team tab in the portal. If mail isn't set up yet, the invite link is shown once on screen so you can send it yourself.

## 2. Environment variables (Vercel)

Add these to all three projects (Vercel team → Settings → Environment Variables lets you share them):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key (`sb_secret_…`). Server only. |
| `RESEND_API_KEY` | Resend API key |
| `MAIL_FROM` | `Northem <hello@northem.group>` |
| `MAIL_INBOX` | where new form submissions are announced, e.g. `hello@northem.group` |
| `ORG_SLUG` | `northem` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `northem.group` |
| `NEXT_PUBLIC_SITE_URL` | `https://northem.group` |
| `NEXT_PUBLIC_PORTAL_URL` | `https://portal.northem.group` |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.northem.group` |
| `COOKIE_DOMAIN` | `.northem.group` (one sign-in for portal and admin) |
| `CONNECTIONS_ENC_KEY` | portal + admin: output of `openssl rand -base64 32` |
| `SPS_BASE_URL` | `https://screenplaystudio.fun` |
| `GRAPHITE_BASE_URL` | `https://graphite.cinderra.fun` |

Without the Supabase variables the public sites still build and show demo content.

## 3. DNS

Point `northem.group` and the subdomains above at Vercel as each project's Domains tab tells you.

## Local development

```bash
pnpm install
cp .env.example apps/web/.env.local     # and apps/portal, apps/admin; leave COOKIE_DOMAIN empty
pnpm dev                                # web :3000, portal :3001, admin :3002
```

Division sites locally: `http://prod.localhost:3000`, `http://specprod.localhost:3000`, and so on.

Database tests: `pnpm test:db` (needs a local Postgres; see `supabase/tests/run.sh`).
