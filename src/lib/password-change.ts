export function validatePasswordChange(
  current: FormDataEntryValue | null,
  next: FormDataEntryValue | null,
  confirmation: FormDataEntryValue | null,
): string | null {
  if (
    typeof current !== "string" ||
    !current ||
    Buffer.byteLength(current) > 1024
  )
    return "現在のパスワードを入力してください。";
  if (
    typeof next !== "string" ||
    next.length < 8 ||
    Buffer.byteLength(next) > 1024
  )
    return "新しいパスワードは8文字以上、1024バイト以下にしてください。";
  if (next !== confirmation) return "新しいパスワードが一致しません。";
  return null;
}
