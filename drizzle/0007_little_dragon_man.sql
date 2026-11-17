ALTER TABLE "votes" ADD COLUMN "request_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_request_id_unique" ON "votes" USING btree ("request_id");