import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const CLASSNAMES = [
  "1A",
  "1B",
  "1C",
  "1D",
  "2A",
  "2B",
  "2C",
  "2D",
  "3A",
  "3B",
  "3C",
  "3D",
] as const;

export const PARTS = ["Soprano", "Alto", "Tenor", "Bass"] as const;

export const classEnum = pgEnum("class_name", CLASSNAMES);

export const partEnum = pgEnum("part", PARTS);

export const members = pgTable("members", {
  username: varchar("username", { length: 32 }).primaryKey(),
  password: varchar("password_hash", { length: 60 }).notNull(),
  hasLoggedIn: boolean("has_logged_in").notNull().default(false),
});

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    username: varchar("username", { length: 32 })
      .notNull()
      .references(() => members.username, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_username_idx").on(table.username)],
);

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  classname: classEnum("classname").notNull(),
  artworkFilename: text("artwork_filename"),
});

// 委員側が生徒の出席名簿を登録できる仕組み。在籍する生徒の生徒番号はここにはいる。
export const students = pgTable(
  "students",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    grade: integer("grade").notNull(),
    class: varchar("class", { length: 1 }).notNull(),
    classname: classEnum("classname").notNull(),
    attendanceNumber: integer("attendance_number").notNull(),
    part: partEnum("part").notNull(),
  },
  (table) => [
    unique("students_grade_class_number_unique").on(
      table.grade,
      table.class,
      table.attendanceNumber,
    ),
    check("students_grade_range", sql`${table.grade} between 1 and 3`),
    check("students_class_valid", sql`${table.class} in ('A', 'B', 'C', 'D')`),
    check(
      "students_classname_matches",
      sql`${table.classname}::text = ${table.grade}::text || ${table.class}`,
    ),
    check(
      "students_attendance_number_positive",
      sql`${table.attendanceNumber} > 0`,
    ),
  ],
);

// 生徒の投票情報を記録する。
export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    studentId: varchar("student_id", { length: 32 })
      .notNull()
      .references(() => students.id),
    grade: integer("grade").notNull(),
    firstClass: classEnum("first_class").notNull(),
    secondClass: classEnum("second_class").notNull(),
    requestId: uuid("request_id"),
    votedAt: timestamp("voted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("votes_student_grade_unique").on(table.studentId, table.grade),
    uniqueIndex("votes_request_id_unique").on(table.requestId),
    check("votes_grade_range", sql`${table.grade} between 1 and 3`),
    check(
      "votes_different_classes",
      sql`${table.firstClass} <> ${table.secondClass}`,
    ),
    check(
      "votes_classes_match_grade",
      sql`left(${table.firstClass}::text, 1) = ${table.grade}::text and left(${table.secondClass}::text, 1) = ${table.grade}::text`,
    ),
  ],
);

// 委員の操作履歴を記録する。
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  operatorName: text("operator_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
