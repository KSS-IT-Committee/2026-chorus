"use server";

import {
  recordRehearsalVote,
  type RehearsalVoteInput,
  type RehearsalVoteResult,
} from "@/db/votes";

export async function submitRehearsalVote(
  input: RehearsalVoteInput,
): Promise<RehearsalVoteResult> {
  try {
    return await recordRehearsalVote(input);
  } catch (error) {
    console.error("Failed to record rehearsal vote", error);
    return {
      ok: false,
      reason: "error",
      message:
        "投票を保存できませんでした。時間をおいてもう一度お試しください。",
    };
  }
}
