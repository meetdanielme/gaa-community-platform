import { desc } from "drizzle-orm";
import { db } from "@/db";
import { post } from "@/db/schema";

export async function listPosts() {
  return db.select().from(post).orderBy(desc(post.publishedAt));
}
