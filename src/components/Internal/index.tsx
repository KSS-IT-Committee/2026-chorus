import { PERMISSION } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function Internal({
  children,
  minimumPermission,
}: {
  children: React.ReactNode;
  minimumPermission: (typeof PERMISSION)[number];
}) {
  const user = await getCurrentUser();
  const required = PERMISSION.indexOf(minimumPermission);
  const actual = user ? PERMISSION.indexOf(user.permission) : -1;
  if (required < 0 || actual < 0 || actual > required) return null;
  return <>{children}</>;
}
