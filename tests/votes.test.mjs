import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "@/lib/db")
      return {
        url: "data:text/javascript,export const db = {}",
        shortCircuit: true,
      };
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});

const [{ getVoteProgress, registerVote }, { students, votes }] =
  await Promise.all([
    import("../src/db/votes.ts"),
    import("../src/db/schema.ts"),
  ]);

// votes_student_grade_unique は (student_id, grade) WHERE invalid = false の
// 部分ユニークインデックスなので、モックでも有効票の重複だけを 23505 で拒否する。
function violatesStudentGradeUnique(rows, row) {
  return rows.some(
    (vote) =>
      !vote.invalid &&
      vote.studentId === row.studentId &&
      vote.grade === row.grade,
  );
}

function createDatabase({
  existingVotes = [],
  // SELECT には見えないが INSERT 時には存在する票（同時投票の競合を再現する）。
  concurrentVotes = [],
  student = { id: "student-1" },
} = {}) {
  const savedVotes = [...existingVotes];
  const executor = {
    select: () => ({
      from: (table) => ({
        where: () => {
          if (table === votes) return Promise.resolve([...savedVotes]);
          assert.equal(table, students);
          return {
            limit: () => ({ for: async () => (student ? [student] : []) }),
          };
        },
        leftJoin: () => ({
          where: () => ({
            orderBy: async () => [
              {
                attendanceNumber: 1,
                voteId: savedVotes.some(
                  ({ grade, invalid }) => grade === 1 && !invalid,
                )
                  ? 1
                  : null,
              },
              { attendanceNumber: 2, voteId: null },
            ],
          }),
        }),
      }),
    }),
    insert: () => ({
      values: async (row) => {
        if (
          violatesStudentGradeUnique([...savedVotes, ...concurrentVotes], row)
        )
          throw Object.assign(new Error("duplicate key value"), {
            code: "23505",
            constraint_name: "votes_student_grade_unique",
          });
        savedVotes.push(row);
      },
    }),
  };
  return {
    executor,
    database: { transaction: async (callback) => callback(executor) },
    savedVotes,
  };
}

const submission = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  classname: "1A",
  part: "Soprano",
  attendanceNumber: 1,
  choices: [{ grade: 1, firstClass: "1B", secondClass: "1C" }],
};

test("registers one grade, accepts a retry, and rejects a different ballot", async () => {
  const { database, savedVotes } = createDatabase();
  assert.equal(await registerVote(submission, database), "created");
  assert.equal(await registerVote(submission, database), "replayed");
  const choices = [{ ...submission.choices[0], firstClass: "1D" }];
  assert.equal(
    await registerVote({ ...submission, choices }, database),
    "idempotency-conflict",
  );
  assert.equal(
    await registerVote({ ...submission, requestId: "different-id" }, database),
    "already-voted",
  );
  assert.deepEqual(
    savedVotes.map(({ grade, requestId }) => [grade, requestId]),
    [[1, submission.requestId]],
  );
});

test("votes for other grades do not block the rehearsal ballot", async () => {
  const existing = {
    studentId: "student-1",
    grade: 2,
    firstClass: "2A",
    secondClass: "2B",
    requestId: null,
  };
  const { database, executor, savedVotes } = createDatabase({
    existingVotes: [existing],
  });
  assert.equal(
    (await getVoteProgress("1A", "Soprano", executor)).votedCount,
    0,
  );
  assert.equal(await registerVote(submission, database), "created");
  assert.equal(savedVotes[0], existing);
  assert.deepEqual(await getVoteProgress("1A", "Soprano", executor), {
    registeredCount: 2,
    votedCount: 1,
    students: [
      { attendanceNumber: 1, voted: true },
      { attendanceNumber: 2, voted: false },
    ],
  });
});

test("returns student-not-found when the roster has no matching student", async () => {
  const { database } = createDatabase({ student: null });
  assert.equal(await registerVote(submission, database), "student-not-found");
});

test("an invalidated ballot does not block a new vote for the same grade", async () => {
  const existing = {
    studentId: "student-1",
    grade: 1,
    firstClass: "1B",
    secondClass: "1C",
    requestId: "old-request",
    invalid: true,
  };
  const { database, executor, savedVotes } = createDatabase({
    existingVotes: [existing],
  });
  assert.equal(
    (await getVoteProgress("1A", "Soprano", executor)).votedCount,
    0,
  );
  assert.equal(await registerVote(submission, database), "created");
  assert.equal(savedVotes.length, 2);
  assert.equal(
    (await getVoteProgress("1A", "Soprano", executor)).votedCount,
    1,
  );
  assert.equal(
    await registerVote({ ...submission, requestId: "another-id" }, database),
    "already-voted",
  );
});

test("a concurrent valid ballot for the same grade is reported as already-voted", async () => {
  const { database, savedVotes } = createDatabase({
    concurrentVotes: [
      {
        studentId: "student-1",
        grade: 1,
        firstClass: "1C",
        secondClass: "1D",
        requestId: "other-request",
        invalid: false,
      },
    ],
  });
  assert.equal(await registerVote(submission, database), "already-voted");
  assert.equal(savedVotes.length, 0);
});

test("the voting action validates submissions without a login", async () => {
  const { submitRehearsalVote } =
    await import("../src/app/vote-rehearsal/actions.ts");
  assert.match((await submitRehearsalVote(null)).error, /投票内容/);
});
