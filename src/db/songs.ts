import "server-only";

import { asc, eq } from "drizzle-orm";

import { songs } from "@/db/schema";
import { toClassName } from "@/lib/class-name";
import { db, type Executor } from "@/lib/db";

export type FreeSong = {
  title: string;
  artist: string;
  artworkFilename: string | null;
};

/**
 * Returns the 自由曲 registered for the given grade and class (e.g. 2, "C"),
 * or null when the input isn't a real class or no song is registered yet.
 *
 * `songs` has no unique constraint on `classname`; if several rows exist for
 * one class the oldest (lowest id) wins so the result is deterministic.
 */
export async function getFreeSong(
  grade: number | string,
  classLetter: string,
  executor: Executor = db,
): Promise<FreeSong | null> {
  const className = toClassName(grade, classLetter);
  if (!className) return null;

  const [song] = await executor
    .select({
      title: songs.title,
      artist: songs.artist,
      artworkFilename: songs.artworkFilename,
    })
    .from(songs)
    .where(eq(songs.classname, className))
    .orderBy(asc(songs.id))
    .limit(1);

  return song ?? null;
}
