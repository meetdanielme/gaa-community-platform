import { z } from "zod";
import { codes } from "@/club.config";

/** Shared form schemas, used by member and admin actions. */

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const codeIds = codes.map((c) => c.id) as [string, ...string[]];

export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2, "Enter the member's full name").max(80),
  relationship: z.enum(["self", "child", "partner", "sibling", "parent", "other"]),
  code: z.union([z.enum(codeIds), z.literal("")]).transform((v) => (v === "" ? null : v)),
  team: optional(30),
});

export function parseMemberForm(formData: FormData) {
  return memberSchema.safeParse({
    id: formData.get("id") || undefined,
    fullName: formData.get("fullName") ?? "",
    relationship: formData.get("relationship") ?? "child",
    code: formData.get("code") ?? "",
    team: formData.get("team") ?? "",
  });
}

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: optional(30).refine((v) => v === null || /^[+\d][\d\s()-]{6,}$/.test(v), "Enter a valid phone number"),
  eircode: optional(10).refine(
    (v) => v === null || /^[A-Za-z]\d[\dWw]\s?[A-Za-z\d]{4}$/.test(v),
    "Enter a valid Eircode, e.g. T12 KV06",
  ),
});

export { optional };
