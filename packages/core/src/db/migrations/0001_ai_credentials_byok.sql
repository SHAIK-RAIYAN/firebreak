ALTER TABLE "ai_credentials" RENAME COLUMN "api_key_ciphertext" TO "ciphertext";--> statement-breakpoint
ALTER TABLE "ai_credentials" RENAME COLUMN "api_key_iv" TO "iv";--> statement-breakpoint
ALTER TABLE "ai_credentials" RENAME COLUMN "api_key_auth_tag" TO "auth_tag";--> statement-breakpoint
ALTER TABLE "ai_credentials" RENAME COLUMN "api_key_key_version" TO "key_version";--> statement-breakpoint
ALTER TABLE "ai_credentials" RENAME COLUMN "api_key_last4" TO "last4";--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD COLUMN IF NOT EXISTS "model" text;--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD COLUMN IF NOT EXISTS "validated_at" timestamp with time zone;
