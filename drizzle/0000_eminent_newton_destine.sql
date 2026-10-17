CREATE TABLE "designs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workshop" text NOT NULL,
	"name" text NOT NULL,
	"params" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
CREATE TABLE "launches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"design_id" text,
	"design_name" text NOT NULL,
	"settings" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"role" text DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worksheet_progress" (
	"user_id" text NOT NULL,
	"workshop" text NOT NULL,
	"worksheet_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worksheet_progress_user_id_workshop_worksheet_id_pk" PRIMARY KEY("user_id","workshop","worksheet_id")
);
--> statement-breakpoint
ALTER TABLE "designs" ADD CONSTRAINT "designs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_progress" ADD CONSTRAINT "worksheet_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "designs_user_workshop_idx" ON "designs" USING btree ("user_id","workshop");--> statement-breakpoint
CREATE INDEX "files_user_idx" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "launches_user_idx" ON "launches" USING btree ("user_id","created_at");