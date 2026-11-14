import { forbidden, unauthorized } from "next/navigation";

import { PERMISSION } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function AuthGuard({
  children,
  minimumPermission,
}: {
  children: React.ReactNode;
  minimumPermission?: (typeof PERMISSION)[number];
}) {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }

  if (minimumPermission !== undefined) {
    const required = PERMISSION.indexOf(minimumPermission);
    const actual = PERMISSION.indexOf(user.permission);
    if (required < 0 || actual < 0 || actual > required) forbidden();
  }

  return <>{children}</>;
}
