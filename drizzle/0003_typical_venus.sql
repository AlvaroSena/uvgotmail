CREATE TYPE "public"."ring_status" AS ENUM('ringing', 'joined', 'declined', 'missed');--> statement-breakpoint
ALTER TYPE "public"."conversation_kind" ADD VALUE 'group';--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"with_video" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_rings" (
	"call_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" "ring_status" DEFAULT 'ringing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_rings_call_id_user_id_pk" PRIMARY KEY("call_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "caller_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "callee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "call_signals" ADD COLUMN "from_participant_id" integer;--> statement-breakpoint
ALTER TABLE "call_signals" ADD COLUMN "to_participant_id" integer;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "started_by" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "peak_participants" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_rings" ADD CONSTRAINT "call_rings_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_rings" ADD CONSTRAINT "call_rings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_participants_call_idx" ON "call_participants" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_participants_user_idx" ON "call_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "call_rings_user_idx" ON "call_rings" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_started_by_user_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;