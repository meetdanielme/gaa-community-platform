"use client";

import { useState } from "react";
import { Field, Input, Select } from "../form";

/** Built-in photos, plus any https image URL. */
export const presetImages = [
  { url: "/images/sliotar.jpg", label: "Sliotar in the grass" },
  { url: "/images/pitch.jpg", label: "Pitch maintenance" },
  { url: "/images/stadium.jpg", label: "Stadium" },
];

export function ImageField({ defaultValue, error }: { defaultValue: string | null | undefined; error?: string }) {
  const isPreset = !defaultValue || presetImages.some((p) => p.url === defaultValue);
  const [choice, setChoice] = useState(isPreset ? (defaultValue ?? "") : "custom");
  const [custom, setCustom] = useState(isPreset ? "" : (defaultValue ?? ""));
  const value = choice === "custom" ? custom : choice;

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="imageUrl" value={value} />
      <Field label="Photo" error={error}>
        <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">No photo</option>
          {presetImages.map((p) => (
            <option key={p.url} value={p.url}>
              {p.label}
            </option>
          ))}
          <option value="custom">Image from a link…</option>
        </Select>
      </Field>
      {choice === "custom" && (
        <Field label="Image link" hint="An https:// link to a photo you have permission to use.">
          <Input type="url" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://" />
        </Field>
      )}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary URL
        <img src={value} alt="" className="h-36 w-full rounded-2xl bg-paper object-cover" />
      )}
    </div>
  );
}
