CREATE TYPE "public"."permission" AS ENUM('admin', 'operator', 'member');--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "permission" "permission" DEFAULT 'member' NOT NULL;