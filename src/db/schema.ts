import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["customer", "partner", "admin"]);
export const langEnum = pgEnum("lang", ["en", "ur"]);
export const salonTypeEnum = pgEnum("salon_type", ["men", "women", "unisex"]);
export const salonModeEnum = pgEnum("salon_mode", ["queue", "booking", "both"]);
export const salonStatusEnum = pgEnum("salon_status", ["pending", "approved", "rejected"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
  "no_show",
]);
export const queueStatusEnum = pgEnum("queue_status", [
  "waiting",
  "called",
  "served",
  "left",
  "no_show",
]);

/** One entry per weekday, index 0 = Sunday. `null` means closed that day. */
export type OpeningHours = ({ open: string; close: string } | null)[];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  role: roleEnum("role").notNull().default("customer"),
  language: langEnum("language").notNull().default("en"),
  gender: text("gender"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_phone_idx").on(t.phone)],
);

export const salons = pgTable(
  "salons",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    type: salonTypeEnum("type").notNull(),
    mode: salonModeEnum("mode").notNull().default("both"),
    status: salonStatusEnum("status").notNull().default("pending"),
    description: text("description"),
    phone: text("phone"),
    address: text("address").notNull(),
    area: text("area").notNull(),
    city: text("city").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    hours: jsonb("hours").$type<OpeningHours>().notNull(),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    isOpen: boolean("is_open").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("salons_city_area_idx").on(t.city, t.area)],
);

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id")
    .notNull()
    .references(() => salons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  durationMin: integer("duration_min").notNull(),
  active: boolean("active").notNull().default(true),
});

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id")
    .notNull()
    .references(() => salons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  /** Working today — the queue wait estimate divides by the number of staff on duty. */
  onDuty: boolean("on_duty").notNull().default(true),
});

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    salonId: integer("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    staffId: integer("staff_id").references(() => staff.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_salon_time_idx").on(t.salonId, t.startsAt),
    index("bookings_user_idx").on(t.userId),
  ],
);

export const queueEntries = pgTable(
  "queue_entries",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    walkInName: text("walk_in_name"),
    serviceId: integer("service_id").references(() => services.id),
    status: queueStatusEnum("status").notNull().default("waiting"),
    nearAlertSent: boolean("near_alert_sent").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("queue_salon_status_idx").on(t.salonId, t.status)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    queueEntryId: integer("queue_entry_id").references(() => queueEntries.id, {
      onDelete: "cascade",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    anonymous: boolean("anonymous").notNull().default(false),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_booking_uq").on(t.bookingId),
    uniqueIndex("reviews_queue_uq").on(t.queueEntryId),
  ],
);

/** Outbox of WhatsApp/SMS messages. Delivered by the configured provider, or just logged in demo mode. */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  body: text("body").notNull(),
  status: text("status").notNull().default("logged"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Salon = typeof salons.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type QueueEntry = typeof queueEntries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
