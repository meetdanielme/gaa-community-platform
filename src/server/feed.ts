import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { post, postLike } from "@/db/schema";

export async function listPosts(userId: string) {
  const likes = db
    .select({
      postId: postLike.postId,
      count: sql<number>`count(*)::int`.as("count"),
      mine: sql<boolean>`bool_or(${postLike.userId} = ${userId})`.as("mine"),
    })
    .from(postLike)
    .groupBy(postLike.postId)
    .as("likes");

  const rows = await db
    .select({ post, likeCount: likes.count, likedByMe: likes.mine })
    .from(post)
    .leftJoin(likes, eq(likes.postId, post.id))
    .orderBy(desc(post.publishedAt));

  return rows.map((r) => ({
    ...r.post,
    likeCount: Number(r.likeCount ?? 0),
    likedByMe: Boolean(r.likedByMe),
  }));
}

export async function toggleLike(userId: string, postId: string) {
  const deleted = await db
    .delete(postLike)
    .where(and(eq(postLike.postId, postId), eq(postLike.userId, userId)))
    .returning();
  if (deleted.length === 0) {
    await db.insert(postLike).values({ postId, userId }).onConflictDoNothing();
  }
}
