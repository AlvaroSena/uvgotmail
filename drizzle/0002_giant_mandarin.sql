ALTER TABLE "calls" ADD COLUMN "caller_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "callee_seen_at" timestamp;