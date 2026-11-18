import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});

const { parseVoteSubmission } = await import("../src/lib/vote-validation.ts");

const input = {
  grade: "1",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  className: "A",
  part: "Soprano",
  attendanceNumber: 1,
  choices: [{ grade: 1, firstClass: "B", secondClass: "C" }],
};

test("a first-year student can rank classes in their own grade", () => {
  assert.deepEqual(parseVoteSubmission(input)?.choices, [
    { grade: 1, firstClass: "1B", secondClass: "1C" },
  ]);
});

test("rejects invalid identification, duplicate grades, and invalid rankings", () => {
  const [first] = input.choices;
  for (const overrides of [
    { attendanceNumber: 0 },
    { attendanceNumber: 41 },
    { grade: "4" },
    { part: "Unknown" },
    { requestId: "not-a-uuid" },
    { choices: [] },
    { choices: [first, first] },
    { choices: [{ ...first, grade: 2 }] },
    { choices: [{ ...first, firstClass: "A" }] },
    { choices: [{ ...first, secondClass: "B" }] },
    { choices: [{ ...first, firstClass: "E" }] },
  ])
    assert.equal(parseVoteSubmission({ ...input, ...overrides }), null);
});
