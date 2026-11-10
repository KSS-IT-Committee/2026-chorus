import { stdin, stdout } from "node:process";
import postgres from "postgres";
import { hashPassword } from "../src/lib/password.ts";

const username = process.argv[2];
if (
  !username ||
  username.length > 32 ||
  !process.env.DATABASE_URL ||
  !stdin.isTTY
) {
  console.error(
    "Usage: DATABASE_URL=... node scripts/create-member.mjs <username> (interactive terminal required)",
  );
  process.exit(1);
}
stdout.write("Password: ");
stdin.setRawMode(true);
let password = "";
try {
  for await (const chunk of stdin) {
    const value = chunk.toString();
    if (value.includes("\u0003")) throw new Error("Cancelled");
    for (const character of value) {
      if (character === "\r" || character === "\n") break;
      if (character === "\u007f") password = password.slice(0, -1);
      else password += character;
    }
    if (value.includes("\r") || value.includes("\n")) break;
  }
} finally {
  stdin.setRawMode(false);
  stdout.write("\n");
}
if (password.length < 8 || Buffer.byteLength(password) > 1024)
  throw new Error(
    "Password must be at least 8 characters and at most 1024 bytes",
  );
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const hash = await hashPassword(password);
  await sql`insert into members (username, password_hash) values (${username}, ${hash})`;
  console.log("Member created.");
} finally {
  await sql.end();
}
