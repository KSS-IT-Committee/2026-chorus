CREATE TYPE "public"."class_name" AS ENUM('1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C', '3D');--> statement-breakpoint
CREATE TYPE "public"."part" AS ENUM('Soprano', 'Alto', 'Tenor', 'Bass');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_name" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"username" varchar(32) PRIMARY KEY NOT NULL,
	"password_hash" varchar(60) NOT NULL,
	"has_logged_in" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"username" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"classname" "class_name" NOT NULL,
	"artwork_filename" text
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"grade" integer NOT NULL,
	"class" varchar(1) NOT NULL,
	"classname" "class_name" NOT NULL,
	"attendance_number" integer NOT NULL,
	"part" "part" NOT NULL,
	CONSTRAINT "students_grade_class_number_unique" UNIQUE("grade","class","attendance_number"),
	CONSTRAINT "students_grade_range" CHECK ("students"."grade" between 1 and 3),
	CONSTRAINT "students_class_valid" CHECK ("students"."class" in ('A', 'B', 'C', 'D')),
	CONSTRAINT "students_classname_matches" CHECK ("students"."classname"::text = "students"."grade"::text || "students"."class"),
	CONSTRAINT "students_attendance_number_positive" CHECK ("students"."attendance_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar(32) NOT NULL,
	"grade" integer NOT NULL,
	"first_class" "class_name" NOT NULL,
	"second_class" "class_name" NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_student_grade_unique" UNIQUE("student_id","grade"),
	CONSTRAINT "votes_grade_range" CHECK ("votes"."grade" between 1 and 3),
	CONSTRAINT "votes_different_classes" CHECK ("votes"."first_class" <> "votes"."second_class"),
	CONSTRAINT "votes_classes_match_grade" CHECK (left("votes"."first_class"::text, 1) = "votes"."grade"::text and left("votes"."second_class"::text, 1) = "votes"."grade"::text)
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_username_members_username_fk" FOREIGN KEY ("username") REFERENCES "public"."members"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_username_idx" ON "sessions" USING btree ("username");