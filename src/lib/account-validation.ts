export function isValidUsername(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 32 &&
    !/[^!-~]/.test(value)
  );
}

export function isValidNewPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 1024 &&
    !/[^!-~]/.test(value)
  );
}

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
  if (!isValidNewPassword(next))
    return "新しいパスワードは半角英数字と記号で8文字以上、1024文字以下にしてください。";
  if (next !== confirmation) return "新しいパスワードが一致しません。";
  return null;
}
