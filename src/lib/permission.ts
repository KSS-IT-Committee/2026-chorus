import { PERMISSION } from "@/db/schema";

type Permission = (typeof PERMISSION)[number];

export function hasMinimumPermission(
  user: { permission: Permission } | null | undefined,
  minimum: Permission,
): user is { permission: Permission } {
  if (!user) return false;
  const actualIndex = PERMISSION.indexOf(user.permission);
  const minimumIndex = PERMISSION.indexOf(minimum);
  if (user.permission === "it") return minimumIndex >= 0;
  if (minimum === "it") return user.permission === "admin";
  return actualIndex >= 0 && minimumIndex >= 0 && actualIndex <= minimumIndex;
}
