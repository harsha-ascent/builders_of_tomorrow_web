ALTER TABLE "users" ADD COLUMN "digest_opt_in" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_digest_at" timestamp with time zone;