import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { post } from "@/db/schema";

/**
 * Feed posts, newest first. Filtering by a code also includes club-wide
 * posts (no code), since those apply to everyone. `kind` filters by post type.
 */
export async function listPosts(category?: string, kind?: string) {
  return db
    .select()
    .from(post)
    .where(
      and(
        category ? or(eq(post.category, category), isNull(post.category)) : undefined,
        kind ? eq(post.kind, kind) : undefined,
      ),
    )
    .orderBy(desc(post.publishedAt));
}

export async function getPost(id: string) {
  const [p] = await db.select().from(post).where(eq(post.id, id));
  return p ?? null;
}
