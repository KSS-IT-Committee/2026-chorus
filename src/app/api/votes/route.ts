import { getVoteProgress } from "@/db/votes";
import { PARTS } from "@/db/schema";
import { toClassName } from "@/lib/class-name";

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
    const progress = await getVoteProgress(classname, part);
    return Response.json({
      ...progress,
      absentCount: progress.registeredCount - progress.votedCount,
    });
  } catch (error) {
    console.error("Could not load vote progress", error);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
