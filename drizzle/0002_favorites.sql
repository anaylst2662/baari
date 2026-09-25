CREATE TABLE "favorites" (
	"user_id" integer NOT NULL,
	"salon_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_salon_id_pk" PRIMARY KEY("user_id","salon_id")
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Keep Supabase's public Data API out, like every other table (see 0001_enable_rls.sql).
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
