CREATE TABLE "brokerage_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker" text NOT NULL,
	"account_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dividend_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"ex_dividend_date" date NOT NULL,
	"pay_date" date,
	"record_date" date,
	"declared_date" date,
	"amount" numeric(10, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source" text DEFAULT 'alpha_vantage' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dividend_schedule_ticker_exdate_unique" UNIQUE("ticker","ex_dividend_date")
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brokerage_account_id" uuid NOT NULL,
	"ticker" text NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"avg_cost_basis" numeric(18, 6) NOT NULL,
	"total_cost" numeric(18, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holdings_user_account_ticker_unique" UNIQUE("user_id","brokerage_account_id","ticker")
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brokerage_account_id" uuid,
	"original_filename" text NOT NULL,
	"detected_format" text NOT NULL,
	"headers" jsonb NOT NULL,
	"raw_rows" jsonb NOT NULL,
	"suggested_mapping" jsonb NOT NULL,
	"column_mapping" jsonb,
	"row_count" integer NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"error_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insider_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"insider_name" text NOT NULL,
	"insider_title" text,
	"transaction_type" text NOT NULL,
	"transaction_date" date NOT NULL,
	"shares" numeric(20, 2) NOT NULL,
	"price" numeric(18, 6),
	"shares_owned_after" numeric(20, 2),
	"filing_url" text,
	"provider" text DEFAULT 'finnhub' NOT NULL,
	"external_id" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insider_trades_provider_external_id_unique" UNIQUE("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "news_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"image_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"provider" text DEFAULT 'finnhub' NOT NULL,
	"external_id" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_cache_provider_external_id_unique" UNIQUE("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"ticker" text,
	"related_entity_type" text,
	"related_entity_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_unique" UNIQUE("user_id","type","related_entity_type","related_entity_id")
);
--> statement-breakpoint
CREATE TABLE "political_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"politician_name" text NOT NULL,
	"chamber" text NOT NULL,
	"party" text,
	"transaction_type" text NOT NULL,
	"transaction_date" date NOT NULL,
	"disclosure_date" date NOT NULL,
	"amount_range" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "political_trades_provider_external_id_unique" UNIQUE("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "provider_status" (
	"provider" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"is_configured" boolean DEFAULT false NOT NULL,
	"using_seed_data" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_cache" (
	"ticker" text PRIMARY KEY NOT NULL,
	"last_price" numeric(18, 6) NOT NULL,
	"previous_close" numeric(18, 6),
	"change_pct" numeric(10, 4),
	"currency" text DEFAULT 'USD' NOT NULL,
	"provider" text DEFAULT 'finnhub' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brokerage_account_id" uuid NOT NULL,
	"import_batch_id" uuid,
	"ticker" text NOT NULL,
	"transaction_type" text NOT NULL,
	"trade_date" date NOT NULL,
	"settle_date" date,
	"quantity" numeric(18, 6) NOT NULL,
	"price" numeric(18, 6),
	"fees" numeric(18, 6) DEFAULT '0' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"raw_row" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker" text NOT NULL,
	"notes" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_user_ticker_unique" UNIQUE("user_id","ticker")
);
--> statement-breakpoint
CREATE TABLE "whale_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"institution_name" text NOT NULL,
	"institution_cik" text NOT NULL,
	"filing_type" text DEFAULT '13F-HR' NOT NULL,
	"quarter" text NOT NULL,
	"shares" numeric(20, 2) NOT NULL,
	"shares_change" numeric(20, 2),
	"value_usd" numeric(20, 2),
	"action" text NOT NULL,
	"filed_date" date NOT NULL,
	"provider" text DEFAULT 'sec_edgar' NOT NULL,
	"external_id" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whale_trades_provider_external_id_unique" UNIQUE("provider","external_id")
);
--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD CONSTRAINT "brokerage_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_brokerage_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("brokerage_account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_brokerage_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("brokerage_account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_brokerage_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("brokerage_account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insider_trades_ticker_idx" ON "insider_trades" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "news_cache_ticker_idx" ON "news_cache" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "political_trades_ticker_idx" ON "political_trades" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "transactions_user_ticker_idx" ON "transactions" USING btree ("user_id","ticker");--> statement-breakpoint
CREATE INDEX "whale_trades_ticker_idx" ON "whale_trades" USING btree ("ticker");