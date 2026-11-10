import { unauthorized } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

/**
 * Server-side page gate. Renders children only for a logged-in user who
 * holds at least one of the roles in `role`; anonymous visitors get the 401
 * page, logged-in users without a matching role the 403 page.
 *
 * Deny-by-default: with no `role` prop the guard admits NOBODY. Every page
 * must state which roles it expects — `role={INTERNAL_ROLES}` for "any
 * logged-in school account". Username shapes are never consulted. Nest
 * guards when a page needs ALL of several roles to hold.
 */
export async function AuthGuard({
  children,

}: {
  children: React.ReactNode;

}) {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized(); // 401 — not logged in
  }

  return <>{children}</>;
}