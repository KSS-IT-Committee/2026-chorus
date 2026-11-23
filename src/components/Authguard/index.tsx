import { forbidden, unauthorized } from "next/navigation";

import { PERMISSION } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { hasMinimumPermission } from "@/lib/permission";

export async function AuthGuard({
  children,
  minimumPermission,
  excludeIt = false,
}: {
  children: React.ReactNode;
  minimumPermission?: (typeof PERMISSION)[number];
  excludeIt?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  if (excludeIt && user.permission === "it") forbidden();

  if (
    minimumPermission !== undefined &&
    !hasMinimumPermission(user, minimumPermission)
  ) {
    forbidden();
  }

  return <>{children}</>;
}
