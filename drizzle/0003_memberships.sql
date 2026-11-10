CREATE TABLE "membership" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "fee_member_season_uq";--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "membership_fee" ADD COLUMN "code" text;--> statement-breakpoint
-- Each existing fee covered the member's single code.
UPDATE "membership_fee" f SET "code" = coalesce(m."code", 'other') FROM "member" m WHERE m."id" = f."member_id";--> statement-breakpoint
ALTER TABLE "membership_fee" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
INSERT INTO "membership" ("id", "member_id", "code") SELECT gen_random_uuid()::text, "id", "code" FROM "member" WHERE "code" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_member_code_uq" ON "membership" USING btree ("member_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_member_code_season_uq" ON "membership_fee" USING btree ("member_id","code","season");