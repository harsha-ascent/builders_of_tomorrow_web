CREATE TABLE "event_interest" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop" text DEFAULT 'water-rocket' NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"city" text NOT NULL,
	"kids" integer DEFAULT 1 NOT NULL,
	"ages" text,
	"format" text DEFAULT 'either' NOT NULL,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_interest" ADD CONSTRAINT "event_interest_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_interest_created_idx" ON "event_interest" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_interest_email_idx" ON "event_interest" USING btree ("email");