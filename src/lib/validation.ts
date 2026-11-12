import { z } from "zod";
import { clubConfig, codeGroup, codes } from "@/club.config";
import { assignTeam, codesCombine } from "@/lib/rules/membership";
import { limits } from "@/lib/limits";

/** Shared form schemas, used by member and admin actions. */

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it to ${max.toLocaleString("en-IE")} characters or fewer`)
    .transform((v) => (v === "" ? null : v));

/** A required text field with a [min, max] length and a friendly message when it's too short. */
const text = ([min, max]: readonly [number, number], tooShort: string) =>
  z
    .string()
    .trim()
    .min(min, tooShort)
    .max(max, `Keep it to ${max.toLocaleString("en-IE")} characters or fewer`);

const codeIds = codes.map((c) => c.id) as [string, ...string[]];

export const memberSchema = z
  .object({
    id: z.string().uuid().optional(),
    fullName: text(limits.member.fullName, "Enter the member's full name"),
    relationship: z.enum(["self", "child", "partner", "sibling", "parent", "other"]),
    codes: z
      .array(z.enum(codeIds))
      .transform((v) => [...new Set(v)])
      .refine((v) => v.length <= clubConfig.maxCodesPerMember, `Choose up to ${clubConfig.maxCodesPerMember} codes`)
      .refine((v) => codesCombine(v, codeGroup, clubConfig.maxCodesPerMember), "These codes can't be played together"),
    dateOfBirth: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Enter a valid date")
      .refine((v) => v === null || new Date(v) <= new Date(), "Date of birth can't be in the future")
      .refine((v) => v === null || Number(v.slice(0, 4)) >= 1900, "Enter a valid date"),
  })
  .superRefine((m, ctx) => {
    if (m.codes.length === 0) return;
    // Teams are assigned from date of birth, so players need one.
    if (!m.dateOfBirth) {
      ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Add a date of birth so we can place them in a team" });
    } else if (!assignTeam(m.dateOfBirth, clubConfig.season, clubConfig.ageGrades, clubConfig.minPlayingAge)) {
      ctx.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: `Players must turn ${clubConfig.minPlayingAge} during the ${clubConfig.season} season`,
      });
    }
  });

export function parseMemberForm(formData: FormData) {
  return memberSchema.safeParse({
    id: formData.get("id") || undefined,
    fullName: formData.get("fullName") ?? "",
    relationship: formData.get("relationship") ?? "child",
    codes: formData.getAll("codes").map(String),
    dateOfBirth: formData.get("dateOfBirth") ?? "",
  });
}

export const contactSchema = z.object({
  name: text(limits.contact.name, "Enter your full name"),
  phone: optional(limits.contact.phone[1]).refine((v) => v === null || /^[+\d][\d\s()-]{6,}$/.test(v), "Enter a valid phone number"),
  eircode: optional(limits.contact.eircode[1]).refine(
    (v) => v === null || /^[A-Za-z]\d[\dWw]\s?[A-Za-z\d]{4}$/.test(v),
    "Enter a valid Eircode, e.g. T12 KV06",
  ),
});

export { optional, text };
