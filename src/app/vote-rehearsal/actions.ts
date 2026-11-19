"use server";

import { getVoteProgress, registerVote } from "@/db/votes";
import { parseVoteSubmission } from "@/lib/vote-validation";

export async function submitRehearsalVote(input: unknown) {
  const submission = parseVoteSubmission(input);
  if (!submission) return { error: "投票内容を確認してください。" };

  try {
    const result = await registerVote(submission);
    if (result === "student-not-found") {
      return { error: "この出席番号は名簿にありません。" };
    }
    if (result === "idempotency-conflict") {
      return {
        error: "送信済みの内容と一致しません。画面を再読み込みしてください。",
      };
    }
    const progress = await getVoteProgress(
      submission.classname,
      submission.part,
    );
    return {
      progress: {
        ...progress,
        absentCount: progress.registeredCount - progress.votedCount,
      },
      error:
        result === "already-voted"
          ? "投票状況が変わりました。確認画面を閉じ、登録状況を確認してください。"
          : null,
    };
  } catch {
    return {
      error: "投票結果を確認できませんでした。もう一度送信してください。",
    };
  }
}
