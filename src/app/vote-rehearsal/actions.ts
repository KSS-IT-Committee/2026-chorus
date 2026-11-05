"use server";

import {
  recordRehearsalVote,
  type RehearsalVoteInput,
  type RehearsalVoteResult,
} from "@/db/votes";
import { isValidVoteAccessCode, isVotingConfigured } from "@/lib/vote-access";

export type AccessCheckResult = { ok: true } | { ok: false; message: string };

function accessError(): { ok: false; message: string } {
  return isVotingConfigured()
    ? { ok: false, message: "投票コードが正しくありません。" }
    : { ok: false, message: "現在、投票は受け付けていません。" };
}

/** Lets the setup step reject a wrong code before anyone starts voting. */
export async function checkVoteAccessCode(
  accessCode: string,
): Promise<AccessCheckResult> {
  return isValidVoteAccessCode(accessCode) ? { ok: true } : accessError();
}

export async function submitRehearsalVote(
  accessCode: string,
  input: RehearsalVoteInput,
): Promise<RehearsalVoteResult> {
  if (!isValidVoteAccessCode(accessCode)) {
    return {
      ok: false,
      reason: "unauthorized",
      message: accessError().message,
    };
  }

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
