CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donation" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"user_id" text,
	"amount_cents" integer NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payment_ref" text,
	"receipt_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donation_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"venue" text NOT NULL,
	"image_url" text,
	"headline" text NOT NULL,
	"description" text NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"good_to_know" text,
	"recap" text,
	"capacity" integer,
	"rsvp_deadline" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_reminder" (
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_reminder_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "event_response" (
	"event_id" text NOT NULL,
	"member_id" text NOT NULL,
	"response" text NOT NULL,
	"responded_by_user_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_response_event_id_member_id_pk" PRIMARY KEY("event_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "goal" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"headline" text,
	"description" text,
	"target_cents" integer NOT NULL,
	"offline_raised_cents" integer DEFAULT 0 NOT NULL,
	"breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"activated_at" timestamp,
	"funded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "goal_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"managed_by_user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"relationship" text DEFAULT 'child' NOT NULL,
	"code" text,
	"team" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_fee" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"season" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"paid_by_user_id" text,
	"payment_ref" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"cta_label" text,
	"cta_href" text,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"phone" text,
	"eircode" text,
	"roles" text DEFAULT 'family_supporter' NOT NULL,
	"helps_with" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"round_id" text NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vote_round_id_user_id_pk" PRIMARY KEY("round_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "voting_round" (
	"id" text PRIMARY KEY NOT NULL,
	"active_goal_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"winning_goal_id" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_goal_id_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reminder" ADD CONSTRAINT "event_reminder_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reminder" ADD CONSTRAINT "event_reminder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_response" ADD CONSTRAINT "event_response_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_response" ADD CONSTRAINT "event_response_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_response" ADD CONSTRAINT "event_response_responded_by_user_id_user_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_managed_by_user_id_user_id_fk" FOREIGN KEY ("managed_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_fee" ADD CONSTRAINT "membership_fee_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_fee" ADD CONSTRAINT "membership_fee_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_round_id_voting_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."voting_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_goal_id_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_round" ADD CONSTRAINT "voting_round_active_goal_id_goal_id_fk" FOREIGN KEY ("active_goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_round" ADD CONSTRAINT "voting_round_winning_goal_id_goal_id_fk" FOREIGN KEY ("winning_goal_id") REFERENCES "public"."goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donation_goal_idx" ON "donation" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "member_manager_idx" ON "member" USING btree ("managed_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_member_season_uq" ON "membership_fee" USING btree ("member_id","season");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_round_uq" ON "voting_round" USING btree ("status") WHERE "voting_round"."status" = 'open';