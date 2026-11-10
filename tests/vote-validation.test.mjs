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

test("parses a valid vote and normalizes its class names", () => {
  assert.deepEqual(
    parseVoteSubmission({
      grade: "2",
      className: "a",
      attendanceNumber: 12,
      firstClass: "B",
      secondClass: "D",
    }),
    {
      grade: 2,
      classname: "2A",
      attendanceNumber: 12,
      firstClass: "2B",
      secondClass: "2D",
    },
  );
});

test("rejects malformed or out-of-range voter data", () => {
  for (const attendanceNumber of [0, 41, 1.5, "12"]) {
    assert.equal(
      parseVoteSubmission({
        grade: 1,
        className: "A",
        attendanceNumber,
        firstClass: "B",
        secondClass: "C",
      }),
      null,
    );
  }

  assert.equal(parseVoteSubmission(null), null);
  assert.equal(
    parseVoteSubmission({
      grade: "4",
      className: "A",
      attendanceNumber: 1,
      firstClass: "B",
      secondClass: "C",
    }),
    null,
  );
});

test("rejects same-class, self-class, and invalid-class choices", () => {
  const input = {
    grade: 1,
    className: "A",
    attendanceNumber: 1,
    firstClass: "B",
    secondClass: "C",
  };

  assert.equal(parseVoteSubmission({ ...input, secondClass: "B" }), null);
  assert.equal(parseVoteSubmission({ ...input, firstClass: "A" }), null);
  assert.equal(parseVoteSubmission({ ...input, secondClass: "E" }), null);
});
