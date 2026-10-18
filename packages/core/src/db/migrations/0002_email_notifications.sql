CREATE TABLE IF NOT EXISTS "email_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"user_id" text,
	"idempotency_key" text NOT NULL,
	"recipient_email" text NOT NULL,
	"template" text NOT NULL,
	"subject" text NOT NULL,
	"resend_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"notify_incident_opened" boolean DEFAULT true NOT NULL,
	"notify_action_proposed" boolean DEFAULT true NOT NULL,
	"notify_action_resolved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_deliveries_ws_idx" ON "email_deliveries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_deliveries_user_idx" ON "email_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_deliveries_created_at_idx" ON "email_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_ws_idx" ON "notification_preferences" USING btree ("user_id","workspace_id");
