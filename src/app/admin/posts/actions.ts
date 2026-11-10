"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eventCategories } from "@/club.config";
import { fieldErrors, formFields, type FormState } from "@/lib/form-state";
import { requireAdmin } from "@/lib/session";
import { optional, text } from "@/lib/validation";
import { limits } from "@/lib/limits";
import { deletePost, savePost } from "@/server/admin/content";

const imageUrl = optional(500).refine(
  (v) => v === null || v.startsWith("/images/") || /^https:\/\/\S+$/.test(v),
  "Use one of the club photos or an https:// link",
);

const postSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.string().trim().min(2, "Choose a post type").max(40),
  category: z.string().refine((v) => v === "" || v in eventCategories).transform((v) => (v === "" || v === "all" ? null : v)),
  title: text(limits.post.title, "Add a headline"),
  body: text(limits.post.body, "Write a little more"),
  imageUrl,
  ctaLabel: optional(limits.post.ctaLabel[1]),
  ctaHref: optional(limits.post.ctaHref[1]).refine((v) => v === null || /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), "Use a /path or https:// link"),
});

export async function savePostAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = postSchema.safeParse(
    formFields(formData, ["id", "kind", "category", "title", "body", "imageUrl", "ctaLabel", "ctaHref"]),
  );
  if (!parsed.success) return fieldErrors(parsed.error);
  const { ctaLabel, ctaHref } = parsed.data;
  if (Boolean(ctaLabel) !== Boolean(ctaHref)) return { ok: false, errors: { ctaHref: "Add both a button label and a link, or neither." } };
  await savePost(admin, parsed.data);
  redirect("/admin/posts");
}

export async function deletePostAction(id: string) {
  const admin = await requireAdmin();
  await deletePost(admin, z.string().uuid().parse(id));
  redirect("/admin/posts");
}
