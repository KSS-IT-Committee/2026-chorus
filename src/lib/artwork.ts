import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { songs } from "@/db/schema";
import { artworkExtension } from "@/lib/artwork-image";
import { db } from "@/lib/db";

const artworkDir = path.resolve(process.env.UPLOADS_DIR || "./uploads", "artwork");

export async function saveSongArtwork(songId: number, data: Buffer): Promise<string> {
  const extension = await artworkExtension(data);
  const hash = createHash("sha256").update(data).digest("hex");
  const filename = `${hash}-${randomUUID()}.${extension}`;
  // A failed commit can have an unknown outcome, so keep the new file for recovery.
  const oldFilename = await db.transaction(async (tx) => {
    const [song] = await tx.select({ artworkFilename: songs.artworkFilename })
      .from(songs).where(eq(songs.id, songId)).for("update");
    if (!song) throw new Error("Song not found");
    await mkdir(artworkDir, { recursive: true });
    await writeFile(path.join(artworkDir, filename), data, { flag: "wx" });
    try {
      await tx.update(songs).set({ artworkFilename: filename }).where(eq(songs.id, songId));
    } catch (error) {
      await unlink(path.join(artworkDir, filename)).catch((cleanupError: NodeJS.ErrnoException) => {
        if (cleanupError.code !== "ENOENT") console.error("Could not remove new artwork", cleanupError);
      });
      throw error;
    }
    return song.artworkFilename;
  });

  if (oldFilename && /^[0-9a-f]{64}-[0-9a-f-]{36}\.(jpg|png|webp)$/.test(oldFilename)) {
    await unlink(path.join(artworkDir, oldFilename)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") console.error("Could not remove old artwork", error);
    });
  }
  return filename;
}
