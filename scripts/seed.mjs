import { Client } from "pg";
import { randomBytes } from "node:crypto";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const GRADE = 1;
const CLASS = "A";

const partCounts = {
  Soprano: 7,
  Alto: 6,
  Tenor: 4,
  Bass: 3,
};

function shuffle(array) {
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function createStudents() {
  const attendanceNumbers = shuffle(
    Array.from({ length: 20 }, (_, i) => i + 1),
  );

  const parts = Object.entries(partCounts).flatMap(([part, count]) =>
    Array(count).fill(part),
  );

  shuffle(parts);

  return attendanceNumbers.map((attendanceNumber, i) => ({
    id: randomBytes(16).toString("hex"),
    grade: GRADE,
    class: CLASS,
    classname: `${GRADE}${CLASS}`,
    attendance_number: attendanceNumber,
    part: parts[i],
  }));
}

async function main() {
  await client.connect();

  try {
    await client.query("BEGIN");

    const students = createStudents();

    for (const student of students) {
      await client.query(
        `
          INSERT INTO students (
            id,
            grade,
            class,
            classname,
            attendance_number,
            part
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          student.id,
          student.grade,
          student.class,
          student.classname,
          student.attendance_number,
          student.part,
        ],
      );
    }

    await client.query("COMMIT");

    console.table(
      [...students].sort((a, b) => a.attendance_number - b.attendance_number),
    );

    console.log("20 students inserted successfully.");

    console.table(
      Object.fromEntries(
        Object.keys(partCounts).map((part) => [
          part,
          students.filter((student) => student.part === part).length,
        ]),
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
