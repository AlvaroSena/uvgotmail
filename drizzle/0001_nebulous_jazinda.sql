CREATE TYPE "public"."call_status" AS ENUM('ringing', 'active', 'ended', 'declined', 'missed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."signal_kind" AS ENUM('offer', 'answer', 'ice');--> statement-breakpoint
CREATE TABLE "call_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"from_user_id" text NOT NULL,
	"kind" "signal_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"caller_id" text NOT NULL,
	"callee_id" text NOT NULL,
	"status" "call_status" DEFAULT 'ringing' NOT NULL,
	"with_video" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"answered_at" timestamp,
	"ended_at" timestamp,
	"ended_by" text
);
--> statement-breakpoint
ALTER TABLE "call_signals" ADD CONSTRAINT "call_signals_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_signals" ADD CONSTRAINT "call_signals_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_user_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_callee_id_user_id_fk" FOREIGN KEY ("callee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_signals_call_idx" ON "call_signals" USING btree ("call_id","id");--> statement-breakpoint
CREATE INDEX "calls_callee_status_idx" ON "calls" USING btree ("callee_id","status");--> statement-breakpoint
CREATE INDEX "calls_caller_status_idx" ON "calls" USING btree ("caller_id","status");