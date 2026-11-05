import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

// The rehearsal vote page is public, so without a gate anyone who finds the
// URL could cast a vote in any rostered student's name. Operators enter this
// shared code (handed out by the 合唱委員会 on rehearsal day) before voting,
// and every submission re-checks it on the server.
//
// Fail closed: when VOTE_ACCESS_CODE is unset, voting is not accepted at all.

function digest(value: string): Buffer {
  return createHash("sha256").update(value.normalize("NFKC").trim()).digest();
}

export function isVotingConfigured(): boolean {
  return Boolean(process.env.VOTE_ACCESS_CODE?.trim());
}

export function isValidVoteAccessCode(code: unknown): boolean {
  const expected = process.env.VOTE_ACCESS_CODE;
  if (!expected?.trim() || typeof code !== "string") return false;
  // Comparing fixed-length digests keeps the check constant-time regardless
  // of how long the submitted code is.
  return timingSafeEqual(digest(code), digest(expected));
}
