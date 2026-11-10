import { getSession } from "@/lib/session";

/** For route handlers (CSV exports): true only for signed-in club admins. */
export async function isAdminRequest() {
  const session = await getSession();
  return session?.user.isAdmin === true;
}
