import postgres from "postgres";

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
    id: `${GRADE}${CLASS}${attendanceNumber.toString()}`,
    grade: GRADE,
    class: CLASS,
    classname: `${GRADE}${CLASS}`,
    attendance_number: attendanceNumber,
    part: parts[i],
  }));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const students = createStudents();

    await sql.begin(async (tx) => {
      for (const student of students) {
        await tx`
          INSERT INTO students (
            id,
            grade,
            class,
            classname,
            attendance_number,
            part
          )
          VALUES (
            ${student.id},
            ${student.grade},
            ${student.class},
            ${student.classname},
            ${student.attendance_number},
            ${student.part}
          )
        `;
      }
    });

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
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
