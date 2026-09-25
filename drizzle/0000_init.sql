CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."lang" AS ENUM('en', 'ur');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('waiting', 'called', 'served', 'left', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('customer', 'partner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."salon_mode" AS ENUM('queue', 'booking', 'both');--> statement-breakpoint
CREATE TYPE "public"."salon_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."salon_type" AS ENUM('men', 'women', 'unisex');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"salon_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"staff_id" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'logged' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"salon_id" integer NOT NULL,
	"user_id" integer,
	"walk_in_name" text,
	"service_id" integer,
	"status" "queue_status" DEFAULT 'waiting' NOT NULL,
	"near_alert_sent" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"salon_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"booking_id" integer,
	"queue_entry_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"anonymous" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salons" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"owner_id" integer,
	"name" text NOT NULL,
	"type" "salon_type" NOT NULL,
	"mode" "salon_mode" DEFAULT 'both' NOT NULL,
	"status" "salon_status" DEFAULT 'pending' NOT NULL,
	"description" text,
	"phone" text,
	"address" text NOT NULL,
	"area" text NOT NULL,
	"city" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"hours" jsonb NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"salon_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"salon_id" integer NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"on_duty" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"role" "role" DEFAULT 'customer' NOT NULL,
	"language" "lang" DEFAULT 'en' NOT NULL,
	"gender" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_queue_entry_id_queue_entries_id_fk" FOREIGN KEY ("queue_entry_id") REFERENCES "public"."queue_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salons" ADD CONSTRAINT "salons_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_salon_time_idx" ON "bookings" USING btree ("salon_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_phone_idx" ON "otp_codes" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "queue_salon_status_idx" ON "queue_entries" USING btree ("salon_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_uq" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_queue_uq" ON "reviews" USING btree ("queue_entry_id");--> statement-breakpoint
CREATE INDEX "salons_city_area_idx" ON "salons" USING btree ("city","area");