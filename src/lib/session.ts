import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";
import { parseRoles, type Role } from "./rules/roles";

/** Reads the current session once per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  eircode: string | null;
  roles: Role[];
  isAdmin: boolean;
};

/**
 * Returns the signed-in user or redirects to sign-in. Call this in every page
 * and server action that needs a user — never trust the client.
 */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    eircode: u.eircode ?? null,
    roles: parseRoles(u.roles),
    isAdmin: u.isAdmin === true,
  };
}

/** Like requireUser, but only for club admins; everyone else gets a 404. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) notFound();
  return user;
}
