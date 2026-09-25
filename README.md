# Baari — salon & barber booking (web app)

**Baari** (باری, "turn") lets people in Islamabad and Rawalpindi find nearby salons and
barbershops, see whether they're open, check prices and live wait times, and then
**join the queue** or **book an appointment** from home. It's a mobile-first PWA in
English and Urdu (RTL).

## Three experiences, one login

The web address decides which experience you see, not the person's role. Each experience has its own header and bottom menu, and they never mix.

| Experience | Addresses | Look | Menu |
| --- | --- | --- | --- |
| **Baari** (customers) | `/`, `/search`, `/s/…`, `/book/…`, `/bookings`, `/profile` | light teal | Home · Search · Bookings · Profile |
| **Baari Business** (salon owners) | `/business/…` | dark, "Baari Business" | Today · Bookings · Queue · My Salon |
| **Admin** (`ADMIN_PHONES` only) | `/admin/…` | navy, "Admin" badge; sidebar on desktop | Overview · Salons · Users · Reviews · More |

- **Switching:** the avatar menu has a **Switch to** list (Customer app / My Salon / Admin). It shows only the experiences a person can use, so normal customers never see it.
- **After login:** admins go to `/admin` and salon owners to their Business "Today" page. Customers go back to the page they were on.
- **Guests:** anyone can browse without an account. Login is asked for only when booking, joining a queue or saving a salon.
- **Old addresses** (`/salons`, `/account`, `/partner/…`, `/s/…/book`) redirect to the new ones (see `next.config.ts`).

**Code layout, ready to split into apps later**
- `src/experiences/customer`, `src/experiences/business` and `src/experiences/admin` hold each experience's header and menus.
- `src/experiences/shared` holds the avatar menu, bottom and side menus, the step progress bar, and the loading and error screens.
- Pages live in `src/app/(customer)`, `src/app/business` and `src/app/admin`.
- All business logic (`src/lib`, `src/lib/actions`) is shared. Future apps can call it the same way.

**Security (checked on the server)**
- `/admin/*`: only numbers in `ADMIN_PHONES`, re-checked on every request. Everyone else, including guests, gets **404**.
- `/business/[salon]/*`: only that salon's owner, or an admin (shown a blue "Viewing as admin" banner). Anyone else gets **404**. Every salon action checks the same rule.
- `/business/join` (signup) is the one Business page open to any logged-in person. It shows no business data.
- Access checks run before any page content is sent, so blocked pages return a real 404 or a login redirect.

**Customers:** home (categories Men/Women/Bridal/Spa, nearby, live queue status, featured), search with price, rating and open-now filters in a list or map, salon pages (photos, prices, stylists, reviews, hours, save ♡), a 4-step booking with a progress bar, bookings (Upcoming/Past, cancel, change time, review), and profile (name, language, saved salons, help, List your salon).

**Salon owners:**
- **Today:** open/close, today's earnings, appointments, live queue, quick actions.
- **Bookings:** requests, calendar and list views, accept or decline.
- **Queue:** walk-ins and "Call next".
- **My Salon:** services & prices, staff, hours, photos, reviews, details.
- **Signup:** 4 steps, then a friendly "Waiting for approval" screen.

**Admin:** overview, salons (approve, feature, open any business dashboard), users, reviews, messages, and a settings health check.

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
