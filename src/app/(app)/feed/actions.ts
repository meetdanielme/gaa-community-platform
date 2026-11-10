"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { toggleLike } from "@/server/feed";

export async function toggleLikeAction(postId: string) {
  const user = await requireUser();
  await toggleLike(user.id, z.string().uuid().parse(postId));
  refresh();
}
