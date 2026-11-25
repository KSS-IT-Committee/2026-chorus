import { PERMISSION } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { hasMinimumPermission } from "@/lib/permission";

export async function Internal({
  children,
  minimumPermission,
}: {
  children: React.ReactNode;
  minimumPermission: (typeof PERMISSION)[number];
}) {
  const user = await getCurrentUser();
  if (!hasMinimumPermission(user, minimumPermission)) return null;
  return <>{children}</>;
}
