CREATE TABLE "fx_rate_cache" (
	"currency" text PRIMARY KEY NOT NULL,
	"rate_from_usd" numeric(18, 8) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD COLUMN "currency" text DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_currency" text DEFAULT 'GBP' NOT NULL;