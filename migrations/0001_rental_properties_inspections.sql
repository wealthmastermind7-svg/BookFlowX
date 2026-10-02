ALTER TABLE "services"
  ADD COLUMN IF NOT EXISTS "photos" text[] NOT NULL DEFAULT ARRAY[]::text[];
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "rental_properties" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" varchar NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "address" text NOT NULL,
  "tenant_name" text,
  "tenant_email" text,
  "tenant_phone" text,
  "move_in_date" text,
  "lease_end_date" text,
  "status" text NOT NULL DEFAULT 'active',
  "notes" text,
  "photos" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "rental_properties_business_id_idx" ON "rental_properties" ("business_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inspection_reports" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" varchar NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "property_id" varchar NOT NULL REFERENCES "rental_properties"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "date" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "rooms" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inspection_reports_business_id_idx" ON "inspection_reports" ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_reports_property_id_idx" ON "inspection_reports" ("property_id");