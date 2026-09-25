# Baari — salon & barber booking (web app)

**Baari** (باری, "turn") lets people in Islamabad and Rawalpindi find nearby salons and
barbershops, see whether they're open, check prices and live wait times, and then
**join the queue** or **book an appointment** from home. It's a mobile-first PWA in
English and Urdu (RTL).

## What's in the MVP

**Customers**
- Phone-number login with a one-time code (WhatsApp/SMS), no password or email
- Nearby salons as a list or map: filter by men/women/unisex, service, max price, area, open now; sort by distance
- Salon profile: open/closed status, live queue length and estimated wait, services and prices, hours, map, reviews
- Live queue ticket (position, wait range, auto-refresh) plus WhatsApp "your turn is near" alerts
- Appointment booking: service, optional stylist, date, free time slot
- My bookings: cancel, book again, and rate a completed visit (with an anonymous option)
- Urdu/English switch, installable as an app, offline fallback page

**Salon partners** (`/partner`)
- Self-registration (the salon goes live after admin approval)
- One-tap open/close toggle
- Queue manager: add walk-ins, call next, done or no-show, remove
- Booking list by day: accept, decline, complete, no-show
- Services and prices, staff on duty, profile, hours (including past midnight), map pin and photos

**Admin** (`/admin`)
- Key numbers: active salons, bookings, queue joins, no-show rate, repeat customers
- Approve or reject salons, set featured listings, hide reviews
- WhatsApp outbox and recent users

**Rules from the business plan that the code enforces**
- Wait estimate = minutes of service ahead ÷ staff on duty, shown as a range
- A salon counts as open only if it is toggled open *and* within its hours (outside hours it closes automatically)
- Salons with no activity for 30 days drop out of search
- 3 no-shows in 90 days pause a customer's bookings (they can still join queues)

## Tech stack

| Part | Choice |
| --- | --- |
| Front end | Next.js 16 (App Router, server actions), React 19, Tailwind CSS 4 |
| Database | Postgres through Drizzle ORM. Locally it uses embedded **PGlite**, so there is nothing to install |
| Maps | Leaflet + OpenStreetMap (no API key) |
| Messaging | WhatsApp Business Cloud API, with every message also recorded in an outbox table |
| Live updates | Server-rendered pages that refresh every 10–30 s while visible |

## Getting started

```bash
npm install
npm run db:setup   # apply migrations and seed demo data (wipes the local DB)
npm run dev        # http://localhost:3000
```

In development no WhatsApp provider is configured, so the OTP code appears on the login
screen. Demo accounts:

| Role | Phone |
| --- | --- |
| Customer | 0300 1111111 |
| Salon owner (owns Ustad Ji Hair Studio and Glow Ladies Salon) | 0300 2222222 |
| Admin | 0300 0000000 |

> PGlite is single-process: stop `npm run dev` before running `db:migrate` or `db:seed`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Create a SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Reset the database and load demo data (**destructive**) |

## Deploying

1. Create a Postgres database (Supabase and Neon both work) and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `APP_URL` and `ADMIN_PHONES`, plus `WHATSAPP_TOKEN` and
   `WHATSAPP_PHONE_NUMBER_ID` for real OTPs and alerts (see `.env.example`).
   In production, login is refused until messaging is configured, unless you set
   `DEMO_MODE=true` for a closed pilot.
3. Run `npm run db:migrate` against that database, then deploy (for example on Vercel).
4. Schedule `GET /api/cron/reminders` every 10–15 minutes with
   `Authorization: Bearer $CRON_SECRET` to send booking reminders.

Outside WhatsApp's 24-hour customer-service window, Meta requires pre-approved
message templates. `src/lib/notify.ts` is the single place to switch to them.

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
