import { getVoteProgress, registerVote } from "@/db/votes";
import { PARTS } from "@/db/schema";
import { toClassName } from "@/lib/class-name";
import { parseVoteSubmission } from "@/lib/vote-validation";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const gradeValue = searchParams.get("grade");
  const className = searchParams.get("className");
  const partValue = searchParams.get("part");
  const grade = Number(gradeValue);
  const classname =
    gradeValue && className ? toClassName(grade, className) : null;
  const part = PARTS.find((candidate) => candidate === partValue);

  if (!classname || !part) {
    return Response.json({ error: "INVALID_VOTE_GROUP" }, { status: 400 });
  }

  try {
    const progress = await getVoteProgress(classname, part, grade);
    return Response.json({
      ...progress,
      absentCount: progress.registeredCount - progress.votedCount,
    });
  } catch (error) {
    console.error("Could not load vote progress", error);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

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
    if (result === "idempotency-conflict") {
      return Response.json({ error: "IDEMPOTENCY_CONFLICT" }, { status: 409 });
    }

    return Response.json(
      { ok: true, replayed: result === "replayed" },
      { status: result === "created" ? 201 : 200 },
    );
  } catch (error) {
    console.error("Could not save vote", error);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
