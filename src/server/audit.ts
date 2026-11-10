import { auditLog } from "@/db/schema";
import type { CurrentUser } from "@/lib/session";
import type { Exec } from "./fundraising";

/** Records an admin action in the governance log. */
export async function audit(exec: Exec, actor: CurrentUser, action: string, summary: string) {
  await exec.insert(auditLog).values({ actorUserId: actor.id, actorName: actor.name, action, summary });
}
