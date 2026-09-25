# Baari — salon & barber booking (web app)

**Baari** (باری, "turn") lets people in Islamabad and Rawalpindi find nearby salons and
barbershops, see whether they're open, check prices and live wait times, and then
**join the queue** or **book an appointment** from home. It's a mobile-first PWA in
English and Urdu (RTL).

## Who sees what

Each person gets their own menu at the bottom of the screen, and after logging in lands on their own home page.

| Role | Who | Lands on | Menu |
| --- | --- | --- | --- |
| Customer | anyone | Home | Home · Find salons · My bookings · Profile |
| Salon owner | anyone who owns a salon | their salon dashboard | Dashboard · Queue / Bookings · Services & prices · Salon settings |
| Admin | phone numbers in `ADMIN_PHONES` | Admin area (dark header, "Admin area" label) | Overview · Salons · Reviews · Messages |

An admin who also owns a salon gets an **Admin / My salon** switch at the top.

**Security**
- `ADMIN_PHONES` is the only source of admin rights, and it's checked on every request, so removing a number takes effect immediately.
- Every admin page and admin action checks it on the server. Anyone else gets "page not found", even when typing the address directly.
- Salon tools check ownership on the server, so an owner can't open or change another owner's salon.

**Customers**
- Phone-number login with a one-time code (WhatsApp/SMS), no password or email
- Nearby salons as a list or map: filter by men/women/unisex, service, max price, area, open now; sort by distance
- Salon profile: open/closed status, live queue length and estimated wait, services and prices, hours, map, reviews
- Live queue ticket (position, wait range, auto-refresh) plus WhatsApp "your turn is near" alerts
- Appointment booking: service, optional stylist, date, free time slot
- My bookings: cancel, book again, and rate a completed visit (with an anonymous option)
- Urdu/English switch, installable as an app, offline fallback page

**Salon owners** (`/partner`)
- Self-registration from "List your salon" (the salon goes live after admin approval)
- Dashboard: one-tap open/close, today's numbers, shortcuts
- Queue: add walk-ins, call next, done or no-show. Bookings: accept, decline, complete, no-show
- Services and prices; Salon settings (staff on duty, profile, hours, map pin, photos)

**Admin** (`/admin`)
- Overview: key numbers and salons waiting for approval
- Salons: approve or reject, feature, open any salon's dashboard for support
- Reviews: hide or unhide. Messages: the WhatsApp log and recent users with their roles

**Rules from the business plan that the code enforces**
- Wait estimate = minutes of service ahead ÷ staff on duty, shown as a range
- A salon counts as open only if it is toggled open *and* within its hours (outside hours it closes automatically)
- Salons with no activity for 30 days drop out of search
- 3 no-shows in 90 days pause a customer's bookings (they can still join queues)

## Tech stack

| Part | Choice |
| --- | --- |
| Front end | Next.js 16 (App Router, server actions), React 19, Tailwind CSS 4 |
| Database | PostgreSQL (Supabase) through Drizzle ORM and postgres.js. Without `DATABASE_URL` it uses embedded **PGlite**, so local testing needs nothing installed |
| Maps | Leaflet + OpenStreetMap (no API key) |
| Messaging | WhatsApp Business Cloud API, with every message also recorded in an outbox table |
| Live updates | Server-rendered pages that refresh every 10–30 s while visible |

## Getting started

```bash
npm install
npm run db:setup   # apply migrations and seed demo data (wipes the local test DB)
npm run dev        # http://localhost:3000
```

In development no WhatsApp provider is configured, so the OTP code appears on the login
screen. Demo accounts:

| Role | Phone |
| --- | --- |
| Customer | 0300 1111111 |
| Salon owner (owns Ustad Ji Hair Studio and Glow Ladies Salon) | 0300 2222222 |
| Admin | 0300 0000000 |

With no `DATABASE_URL`, everything runs on a local test database in `.data/`.
The scripts and the app read `.env` / `.env.local` automatically.

> PGlite is single-process: stop `npm run dev` before running `db:migrate` or `db:seed`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Create a SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Reset the database and load demo data (**destructive**; refuses on a non-empty `DATABASE_URL` database unless you add `-- --force`) |

## Deploying (Supabase + Vercel)

1. **Supabase:** create a project. For Pakistan, pick the **South Asia (Mumbai)** region,
   which matches the `bom1` region in `vercel.json`. Under **Connect**, copy the
   **Transaction pooler** connection string (port 6543) and put your database password into it.
2. **Create the tables** from your laptop. Put the string in a `.env` file as `DATABASE_URL=…`
   (see `.env.example`), then run:
   ```bash
   npm run db:migrate   # creates the tables and turns on Row Level Security
   npm run db:seed      # optional: loads demo salons (only runs on an empty database)
   ```
   The seed refuses to run when the database already has users, so it can't wipe live data.
   `npm run db:seed -- --force` overrides that and **deletes everything**.
3. **Vercel:** import the GitHub repo, then add the variables from `.env.example` under
   *Settings → Environment Variables*. `DATABASE_URL` and `AUTH_SECRET` are required.
   You'll also want `ADMIN_PHONES` and the two `WHATSAPP_*` values. Then deploy.
4. **Booking reminders:** call `GET /api/cron/reminders` every 10–15 minutes with the header
   `Authorization: Bearer $CRON_SECRET`. Vercel Cron can only do this on the Pro plan
   (Hobby runs cron jobs once a day). A free scheduler such as cron-job.org also works.

How the database connection works:
- The app uses Supabase's Transaction pooler with prepared statements turned off
  (`prepare: false`), which that pooler requires.
- Each server instance opens at most 5 connections; change this with `DATABASE_POOL_MAX`.
- On Vercel, a missing `DATABASE_URL` stops the app with a clear error instead of
  falling back to the local test database.
- Every table has Row Level Security turned on, so Supabase's public Data API can't read
  or change it. The app connects as the table owner, so it isn't affected.

In production, login is refused until WhatsApp is configured, unless you set
`DEMO_MODE=true` for a closed pilot. That setting shows login codes on screen, so
anyone could log in as any number: never use it for a public launch. Outside
WhatsApp's 24-hour customer-service window, Meta requires pre-approved message
templates. `src/lib/notify.ts` is the single place to switch to them.

## Project layout

```
src/
  app/            routes: / (home), salons, s/[slug] (profile, queue, book), q/[id] (ticket),
                  bookings, account, login, partner/…, admin, api/cron/reminders
  components/     UI, navigation, map (Leaflet), client helpers
  db/             Drizzle schema and client (Postgres or PGlite)
  lib/            auth (OTP + sessions), queue and wait estimates, slots, notify, i18n, time (PKT)
  lib/actions/    server actions for customer, partner and admin
scripts/          migrate and seed
drizzle/          SQL migrations
```

## Next steps (from the roadmap)

Favorites and one-tap rebook, off-peak deals, JazzCash/Easypaisa payments and deposits
for bridal bookings, photo uploads (for example Supabase Storage), partner reports,
push notifications, and native Android/iOS apps.
