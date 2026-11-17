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
  choices: [
    { grade: 1, firstClass: "B", secondClass: "C" },
    { grade: 2, firstClass: "A", secondClass: "D" },
    { grade: 3, firstClass: "C", secondClass: "B" },
  ],
};

test("a first-year student can rank classes in all three grades", () => {
  assert.deepEqual(parseVoteSubmission(input)?.choices, [
    { grade: 1, firstClass: "1B", secondClass: "1C" },
    { grade: 2, firstClass: "2A", secondClass: "2D" },
    { grade: 3, firstClass: "3C", secondClass: "3B" },
  ]);
});

test("rejects invalid identification, duplicate grades, and invalid rankings", () => {
  const [first, second] = input.choices;
  for (const overrides of [
    { attendanceNumber: 0 },
    { attendanceNumber: 41 },
    { grade: "4" },
    { part: "Unknown" },
    { requestId: "not-a-uuid" },
    { choices: [] },
    { choices: [first, first] },
    { choices: [{ ...first, firstClass: "A" }, second] },
    { choices: [{ ...first, secondClass: "B" }, second] },
    { choices: [{ ...second, firstClass: "E" }] },
  ])
    assert.equal(parseVoteSubmission({ ...input, ...overrides }), null);
});
