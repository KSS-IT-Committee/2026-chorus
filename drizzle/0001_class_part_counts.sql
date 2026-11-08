CREATE TABLE "class_part_counts" (
	"classname" "class_name" NOT NULL,
	"part" "part" NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "class_part_counts_classname_part_unique" UNIQUE("classname","part"),
	CONSTRAINT "class_part_counts_count_nonnegative" CHECK ("class_part_counts"."count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "part";
