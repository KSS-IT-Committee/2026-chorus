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

const [{ registerVote }, { students, votes }] = await Promise.all([
  import("../src/db/votes.ts"),
  import("../src/db/schema.ts"),
]);

function createExecutor({
  existingVotes = [],
  student = { id: "student-1" },
} = {}) {
  const savedVotes = [...existingVotes];
  let currentRequestId;
  const executor = {
    select: () => ({
      from: (table) => ({
        where: () => ({
          limit: async () => {
            if (table === students) return student ? [student] : [];
            if (table === votes) {
              return savedVotes.filter(
                (vote) => vote.requestId === currentRequestId,
              );
            }
            throw new Error("Unexpected table");
          },
        }),
      }),
    }),
    insert: () => ({
      values: async (vote) => {
        currentRequestId = vote.requestId;
        if (savedVotes.some((saved) => saved.requestId === vote.requestId)) {
          throw {
            code: "23505",
            constraint: "votes_request_id_unique",
          };
        }
        if (
          savedVotes.some(
            (saved) =>
              saved.studentId === vote.studentId && saved.grade === vote.grade,
          )
        ) {
          throw {
            code: "23505",
            constraint: "votes_student_grade_unique",
          };
        }
        savedVotes.push(vote);
      },
    }),
  };

  return { executor, savedVotes };
}

const submission = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  grade: 1,
  classname: "1A",
  attendanceNumber: 1,
  firstClass: "1B",
  secondClass: "1C",
};

test("retries of the same request and vote are accepted without a second insert", async () => {
  const { executor, savedVotes } = createExecutor();

  assert.equal(await registerVote(submission, executor), "created");
  assert.equal(await registerVote(submission, executor), "replayed");
  assert.equal(savedVotes.length, 1);
});

test("reuse of a request ID for different vote contents is rejected", async () => {
  const { executor, savedVotes } = createExecutor();

  assert.equal(await registerVote(submission, executor), "created");
  assert.equal(
    await registerVote({ ...submission, firstClass: "1D" }, executor),
    "idempotency-conflict",
  );
  assert.equal(savedVotes.length, 1);
});

test("a different request ID cannot make a duplicate student vote succeed", async () => {
  const { executor, savedVotes } = createExecutor();

  assert.equal(await registerVote(submission, executor), "created");
  assert.equal(
    await registerVote(
      { ...submission, requestId: "123e4567-e89b-42d3-a456-426614174001" },
      executor,
    ),
    "already-voted",
  );
  assert.equal(savedVotes.length, 1);
});

test("returns student-not-found when the roster has no matching student", async () => {
  const { executor } = createExecutor({ student: null });

  assert.equal(await registerVote(submission, executor), "student-not-found");
});
