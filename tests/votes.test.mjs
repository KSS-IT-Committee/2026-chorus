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

function createDatabase({
  existingVotes = [],
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
            groupBy: () => ({
              orderBy: async () => [
                {
                  attendanceNumber: 1,
                  grades: savedVotes.map((vote) => vote.grade),
                },
                { attendanceNumber: 2, grades: [] },
              ],
            }),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: async (rows) => savedVotes.push(...rows),
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
  choices: [
    { grade: 1, firstClass: "1B", secondClass: "1C" },
    { grade: 2, firstClass: "2A", secondClass: "2C" },
    { grade: 3, firstClass: "3B", secondClass: "3C" },
  ],
};

test("registers all grades, accepts a retry, and rejects a different ballot", async () => {
  const { database, savedVotes } = createDatabase();
  assert.equal(await registerVote(submission, database), "created");
  assert.equal(await registerVote(submission, database), "replayed");
  const choices = [
    { ...submission.choices[0], firstClass: "1D" },
    ...submission.choices.slice(1),
  ];
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
    [
      [1, submission.requestId],
      [2, null],
      [3, null],
    ],
  );
});

test("only fills missing grades and counts a student once all grades are registered", async () => {
  const existing = {
    ...submission.choices[0],
    requestId: null,
    studentId: "student-1",
  };
  const { database, executor, savedVotes } = createDatabase({
    existingVotes: [existing],
  });
  assert.equal(
    (await getVoteProgress("1A", "Soprano", executor)).votedCount,
    0,
  );
  assert.equal(await registerVote(submission, database), "already-voted");
  assert.equal(
    await registerVote(
      { ...submission, choices: submission.choices.slice(1, 2) },
      database,
    ),
    "already-voted",
  );
  const remaining = { ...submission, choices: submission.choices.slice(1) };
  assert.equal(await registerVote(remaining, database), "created");
  assert.equal(await registerVote(remaining, database), "replayed");
  assert.equal(savedVotes[0], existing);
  assert.deepEqual(await getVoteProgress("1A", "Soprano", executor), {
    registeredCount: 2,
    votedCount: 1,
    students: [
      { attendanceNumber: 1, voted: true, grades: [1, 2, 3] },
      { attendanceNumber: 2, voted: false, grades: [] },
    ],
  });
});

test("returns student-not-found when the roster has no matching student", async () => {
  const { database } = createDatabase({ student: null });
  assert.equal(await registerVote(submission, database), "student-not-found");
});

test("the voting action validates submissions without a login", async () => {
  const { submitRehearsalVote } =
    await import("../src/app/vote-rehearsal/actions.ts");
  assert.match((await submitRehearsalVote(null)).error, /投票内容/);
});
