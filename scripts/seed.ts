/**
 * Seeds demo data for the Islamabad/Rawalpindi pilot areas.
 * WARNING: wipes all existing data. On a real database (DATABASE_URL) it refuses
 * to run if data already exists, unless called with --force.
 */
import "./env";
import { sql } from "drizzle-orm";
import { getDb, rowsOf, schema } from "../src/db";
import type { OpeningHours } from "../src/db/schema";
import { describeTarget } from "./target";

const db = getDb();

const everyday = (open: string, close: string): OpeningHours => Array(7).fill({ open, close });
const withFridayBreak = (open: string, close: string): OpeningHours =>
  everyday(open, close).map((h, i) => (i === 5 ? { open: "15:00", close } : h));
const closedMonday = (open: string, close: string): OpeningHours =>
  everyday(open, close).map((h, i) => (i === 1 ? null : h));

type SeedService = [name: string, category: string, price: number, duration: number];

const menServices: SeedService[] = [
  ["Haircut", "Haircut", 500, 25],
  ["Kids haircut", "Haircut", 350, 20],
  ["Beard trim & shape", "Beard", 300, 15],
  ["Shave", "Beard", 250, 15],
  ["Haircut + beard", "Haircut", 750, 40],
  ["Hair colour", "Hair colour", 1200, 45],
  ["Facial (basic)", "Facial", 1500, 40],
  ["Head massage", "Massage", 400, 15],
];

const womenServices: SeedService[] = [
  ["Haircut & blow-dry", "Haircut", 1500, 45],
  ["Eyebrow threading", "Threading", 200, 10],
  ["Upper lip threading", "Threading", 100, 5],
  ["Full arms waxing", "Waxing", 1200, 30],
  ["Whitening facial", "Facial", 3000, 60],
  ["Manicure", "Mani & Pedi", 1200, 40],
  ["Pedicure", "Mani & Pedi", 1500, 45],
  ["Party makeup", "Makeup", 5000, 75],
  ["Hair colour (roots)", "Hair colour", 3500, 90],
];

const bridal: SeedService[] = [
  ["Bridal makeup (Barat)", "Bridal", 45000, 180],
  ["Mehndi makeup", "Bridal", 20000, 120],
];

type SeedSalon = {
  name: string;
  type: "men" | "women" | "unisex";
  mode: "queue" | "booking" | "both";
  area: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  hours: OpeningHours;
  services: SeedService[];
  staff: string[];
  rating: number;
  description: string;
  owned?: boolean;
  status?: "pending" | "approved";
  featured?: boolean;
  queue?: number;
};

const salons: SeedSalon[] = [
  {
    name: "Ustad Ji Hair Studio",
    type: "men",
    mode: "queue",
    area: "G-9 Markaz",
    city: "Islamabad",
    address: "Shop 14, Karachi Company, G-9 Markaz",
    lat: 33.6938,
    lng: 73.0287,
    hours: withFridayBreak("10:00", "23:00"),
    services: menServices,
    staff: ["Aslam", "Bilal", "Rehan"],
    rating: 4.6,
    description: "Neighbourhood barbershop since 2004. Fades, classic cuts and hot-towel shaves.",
    owned: true,
    featured: true,
    queue: 4,
  },
  {
    name: "Sharp Cuts Barber",
    type: "men",
    mode: "queue",
    area: "G-9 Markaz",
    city: "Islamabad",
    address: "Ground floor, Shahid Plaza, G-9 Markaz",
    lat: 33.6929,
    lng: 73.0301,
    hours: withFridayBreak("11:00", "01:00"),
    services: menServices.map(([n, c, p, d]) => [n, c, Math.round(p * 0.8), d] as SeedService),
    staff: ["Imran", "Shahzad"],
    rating: 4.2,
    description: "Quick, affordable cuts. Open late.",
    queue: 2,
  },
  {
    name: "Glow Ladies Salon",
    type: "women",
    mode: "booking",
    area: "G-9 Markaz",
    city: "Islamabad",
    address: "1st floor, Al-Rehman Plaza, G-9 Markaz",
    lat: 33.6945,
    lng: 73.0275,
    hours: closedMonday("11:00", "20:00"),
    services: [...womenServices, ...bridal],
    staff: ["Saima", "Nadia", "Hina"],
    rating: 4.7,
    description: "Friendly women-only salon. Facials, waxing, party and bridal makeup. Female staff only.",
    owned: true,
  },
  {
    name: "The Grooming Lounge",
    type: "men",
    mode: "both",
    area: "G-11 Markaz",
    city: "Islamabad",
    address: "Shop 3, Mid City Mall, G-11 Markaz",
    lat: 33.6685,
    lng: 72.9978,
    hours: everyday("10:00", "22:00"),
    services: menServices.map(([n, c, p, d]) => [n, c, Math.round(p * 1.4), d] as SeedService),
    staff: ["Faisal", "Usman", "Kashif"],
    rating: 4.5,
    description: "Modern grooming for men — book ahead or walk in.",
    queue: 1,
  },
  {
    name: "Nazakat Beauty Parlour",
    type: "women",
    mode: "both",
    area: "G-11 Markaz",
    city: "Islamabad",
    address: "Office 7, Sector G-11/3 Markaz",
    lat: 33.6692,
    lng: 72.9966,
    hours: closedMonday("10:30", "20:30"),
    services: womenServices,
    staff: ["Rubina", "Asma"],
    rating: 4.3,
    description: "Affordable threading, waxing and facials. Walk-ins welcome.",
    queue: 3,
  },
  {
    name: "Family Hair & Care",
    type: "unisex",
    mode: "booking",
    area: "F-10 Markaz",
    city: "Islamabad",
    address: "Shop 22, Tahir Plaza, F-10 Markaz",
    lat: 33.6953,
    lng: 73.0136,
    hours: everyday("10:00", "21:00"),
    services: [
      ["Men's haircut", "Haircut", 800, 30],
      ["Women's haircut", "Haircut", 1800, 45],
      ["Kids haircut", "Haircut", 500, 20],
      ["Keratin treatment", "Hair colour", 12000, 150],
      ["Facial", "Facial", 2500, 50],
    ],
    staff: ["Zara", "Ahmed"],
    rating: 4.1,
    description: "Separate sections for men and women. Kids welcome.",
  },
  {
    name: "Saddar Classic Barber",
    type: "men",
    mode: "queue",
    area: "Saddar",
    city: "Rawalpindi",
    address: "Bank Road, near Cantt Plaza, Saddar",
    lat: 33.5968,
    lng: 73.0483,
    hours: withFridayBreak("09:00", "23:00"),
    services: menServices.map(([n, c, p, d]) => [n, c, Math.round(p * 0.6), d] as SeedService),
    staff: ["Javed", "Nadeem", "Tariq", "Sajid"],
    rating: 4.4,
    description: "Old-school barbers, very quick. The busiest chairs in Saddar.",
    queue: 6,
  },
  {
    name: "Rung Beauty Studio",
    type: "women",
    mode: "booking",
    area: "Saddar",
    city: "Rawalpindi",
    address: "Haider Road, Saddar",
    lat: 33.5979,
    lng: 73.0461,
    hours: closedMonday("11:00", "20:00"),
    services: [...womenServices.map(([n, c, p, d]) => [n, c, Math.round(p * 0.85), d] as SeedService), ...bridal],
    staff: ["Farah", "Mehwish"],
    rating: 4.6,
    description: "Bridal specialists — book party and wedding makeup early for Eid and wedding season.",
    featured: true,
  },
  {
    name: "Commercial Market Hair Point",
    type: "men",
    mode: "both",
    area: "Commercial Market",
    city: "Rawalpindi",
    address: "Block D, Commercial Market, Satellite Town",
    lat: 33.6345,
    lng: 73.0712,
    hours: withFridayBreak("10:00", "00:00"),
    services: menServices.map(([n, c, p, d]) => [n, c, Math.round(p * 0.7), d] as SeedService),
    staff: ["Waqas", "Ali"],
    rating: 4.0,
    description: "Busy spot in Commercial Market. Join the queue before you leave home.",
    queue: 2,
  },
  {
    name: "Aks Women's Salon",
    type: "women",
    mode: "both",
    area: "Commercial Market",
    city: "Rawalpindi",
    address: "Near Fawara Chowk, Commercial Market",
    lat: 33.6338,
    lng: 73.0699,
    hours: closedMonday("11:00", "20:00"),
    services: womenServices.map(([n, c, p, d]) => [n, c, Math.round(p * 0.75), d] as SeedService),
    staff: ["Shazia", "Iqra"],
    rating: 4.2,
    description: "Everyday beauty at fair prices. Private, women-only.",
  },
  {
    name: "New Look Salon (pending)",
    type: "unisex",
    mode: "both",
    area: "G-9 Markaz",
    city: "Islamabad",
    address: "Shop 40, G-9 Markaz",
    lat: 33.6932,
    lng: 73.0294,
    hours: everyday("10:00", "21:00"),
    services: menServices.slice(0, 4),
    staff: ["Kamran"],
    rating: 0,
    description: "Just signed up — awaiting approval.",
    status: "pending",
  },
];

async function main() {
  const remote = Boolean(process.env.DATABASE_URL);
  if (remote && !process.argv.includes("--force")) {
    const [{ count }] = rowsOf<{ count: number }>(await db.execute(sql`select count(*)::int as count from users`));
    if (count > 0) {
      console.error(
        `${describeTarget()} already has ${count} users. Seeding would DELETE ALL DATA.\n` +
          "Nothing was changed. If you really want to wipe it, run: npm run db:seed -- --force",
      );
      process.exit(1);
    }
  }
  console.log(`Seeding ${describeTarget()} — resetting tables…`);
  await db.execute(sql`
    truncate table favorites, notifications, reviews, queue_entries, bookings, staff, services, salons,
      sessions, otp_codes, users restart identity cascade
  `);

  const [admin, partner, customer, customer2, customer3] = await db
    .insert(schema.users)
    .values([
      { phone: "+923000000000", name: "Baari Admin", role: remote ? "customer" : "admin" },
      { phone: "+923002222222", name: "Aslam (salon owner)", role: "partner" },
      { phone: "+923001111111", name: "Ali Khan", role: "customer" },
      { phone: "+923003333333", name: "Sana Malik", role: "customer" },
      { phone: "+923004444444", name: "Hamza", role: "customer" },
    ])
    .returning();
  void admin;

  const walkIns = ["Umer", "Danish", "Zain", "Fahad", "Noman", "Asad", "Hassan"];

  for (const [i, s] of salons.entries()) {
    const slug = s.name
      .toLowerCase()
      .replace(/\(.*\)/, "")
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, "");
    const [salon] = await db
      .insert(schema.salons)
      .values({
        slug,
        ownerId: s.owned ? partner.id : null,
        name: s.name,
        type: s.type,
        mode: s.mode,
        status: s.status ?? "approved",
        description: s.description,
        phone: `+9230055500${String(i).padStart(2, "0")}`,
        address: s.address,
        area: s.area,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        hours: s.hours,
        isOpen: true,
        featured: s.featured ?? false,
        ratingAvg: s.rating,
        ratingCount: s.rating ? 8 + i * 3 : 0,
      })
      .returning();

    const svc = await db
      .insert(schema.services)
      .values(s.services.map(([name, category, price, durationMin]) => ({ salonId: salon.id, name, category, price, durationMin })))
      .returning();
    const staffRows = await db
      .insert(schema.staff)
      .values(s.staff.map((name) => ({ salonId: salon.id, name })))
      .returning();

    for (let q = 0; q < (s.queue ?? 0); q++) {
      await db.insert(schema.queueEntries).values({
        salonId: salon.id,
        walkInName: walkIns[q % walkIns.length],
        serviceId: svc[q % 3].id,
        status: q === 0 ? "called" : "waiting",
        joinedAt: new Date(Date.now() - (s.queue! - q) * 7 * 60_000),
        calledAt: q === 0 ? new Date(Date.now() - 5 * 60_000) : null,
      });
    }

    if (s.rating) {
      const past = new Date(Date.now() - (5 + i) * 86_400_000);
      const [done] = await db
        .insert(schema.bookings)
        .values({
          userId: i % 2 ? customer2.id : customer3.id,
          salonId: salon.id,
          serviceId: svc[0].id,
          staffId: staffRows[0].id,
          startsAt: past,
          endsAt: new Date(past.getTime() + svc[0].durationMin * 60_000),
          status: "completed",
        })
        .returning();
      await db.insert(schema.reviews).values({
        salonId: salon.id,
        userId: done.userId,
        bookingId: done.id,
        rating: Math.round(s.rating),
        comment:
          s.type === "women"
            ? "Very clean and professional. Prices were exactly as listed."
            : "Good cut, didn't have to wait thanks to the queue.",
        anonymous: s.type === "women",
      });
    }
  }

  // A completed booking for the demo customer so they can try leaving a review.
  const [glow] = await db.select().from(schema.salons).where(sql`slug = 'ustad-ji-hair-studio'`);
  const [glowSvc] = await db.select().from(schema.services).where(sql`salon_id = ${glow.id}`).limit(1);
  const yesterday = new Date(Date.now() - 86_400_000);
  await db.insert(schema.bookings).values({
    userId: customer.id,
    salonId: glow.id,
    serviceId: glowSvc.id,
    startsAt: yesterday,
    endsAt: new Date(yesterday.getTime() + glowSvc.durationMin * 60_000),
    status: "completed",
  });

  console.log(`Seeded ${salons.length} salons.`);
  console.log("Demo logins (OTP code is shown on screen in demo mode):");
  console.log("  customer 0300 1111111 · salon owner 0300 2222222 · admin 0300 0000000");
  if (remote) console.log("  On this database, admin access comes only from the ADMIN_PHONES setting.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
