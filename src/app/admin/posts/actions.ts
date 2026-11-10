"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eventCategories } from "@/club.config";
import { fieldErrors, formFields, type FormState } from "@/lib/form-state";
import { requireAdmin } from "@/lib/session";
import { optional } from "@/lib/validation";
import { deletePost, savePost } from "@/server/admin/content";

const imageUrl = optional(500).refine(
  (v) => v === null || v.startsWith("/images/") || /^https:\/\/\S+$/.test(v),
  "Use one of the club photos or an https:// link",
);

const postSchema = z.object({
  id: z.string().uuid().optional(),
  authorName: z.string().trim().min(2, "Who is this from?").max(60),
  kind: z.string().trim().min(2, "e.g. Club update, Match report").max(40),
  category: z.string().refine((v) => v === "" || v in eventCategories).transform((v) => (v === "" || v === "all" ? null : v)),
  title: z.string().trim().min(3, "Add a headline").max(120),
  body: z.string().trim().min(10, "Write a little more").max(2000),
  imageUrl,
  ctaLabel: optional(40),
  ctaHref: optional(200).refine((v) => v === null || /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), "Use a /path or https:// link"),
});

export async function savePostAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = postSchema.safeParse(
    formFields(formData, ["id", "authorName", "kind", "category", "title", "body", "imageUrl", "ctaLabel", "ctaHref"]),
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
