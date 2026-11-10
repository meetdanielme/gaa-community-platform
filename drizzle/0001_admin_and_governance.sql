CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_response" DROP CONSTRAINT "event_response_responded_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_fee" DROP CONSTRAINT "membership_fee_paid_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "event_response" ALTER COLUMN "responded_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "event_response" ADD CONSTRAINT "event_response_responded_by_user_id_user_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_fee" ADD CONSTRAINT "membership_fee_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;