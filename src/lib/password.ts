import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(12).toString("base64url");
  const key = (await scrypt(password, salt, 24)) as Buffer;
  return `scrypt$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const parts = hash.split("$");
  if (
    parts.length !== 3 ||
    parts[0] !== "scrypt" ||
    !/^[\w-]{16}$/.test(parts[1]) ||
    !/^[\w-]{32}$/.test(parts[2])
  )
    return false;
  const expected = Buffer.from(parts[2], "base64url");
  const actual = (await scrypt(password, parts[1], 24)) as Buffer;
  return timingSafeEqual(actual, expected);
}
