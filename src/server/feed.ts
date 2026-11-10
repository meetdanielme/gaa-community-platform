import { desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { post } from "@/db/schema";

/**
 * Feed posts, newest first. Filtering by a code also includes club-wide
 * posts (no code), since those apply to everyone.
 */
export async function listPosts(category?: string) {
  return db
    .select()
    .from(post)
    .where(category ? or(eq(post.category, category), isNull(post.category)) : undefined)
    .orderBy(desc(post.publishedAt));
}
