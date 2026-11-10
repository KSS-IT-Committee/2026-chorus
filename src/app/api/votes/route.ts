import { registerVote } from "@/db/votes";
import { parseVoteSubmission } from "@/lib/vote-validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_VOTE" }, { status: 400 });
  }

  const submission = parseVoteSubmission(body);
  if (!submission) {
    return Response.json({ error: "INVALID_VOTE" }, { status: 400 });
  }

  try {
    const result = await registerVote(submission);
    if (result === "student-not-found") {
      return Response.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }
    if (result === "already-voted") {
      return Response.json({ error: "ALREADY_VOTED" }, { status: 409 });
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Could not save vote", error);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
