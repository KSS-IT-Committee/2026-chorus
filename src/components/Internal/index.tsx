import { getCurrentUser } from "@/lib/session";

/**
 * Renders children only for a logged-in user who holds at least one of the
 * roles in `role`; everyone else gets nothing — the fragment leaves no trace
 * in the HTML.
 *
 * Deny-by-default: with no `role` prop it renders nothing for anybody.
 * Callers must state which roles may see the fragment —
 * `role={INTERNAL_ROLES}` for "any logged-in school account". Username
 * shapes are never consulted.
 */
export async function Internal({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <>{children}</>;
}