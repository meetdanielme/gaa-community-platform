"use client";

import { useState, type ComponentProps } from "react";
import type { Limit } from "@/lib/limits";
import { lengthProps, textareaClass } from "./form";

/** A textarea that enforces a [min, max] length and shows a live character count. */
export function Textarea({ limit, defaultValue, ...props }: ComponentProps<"textarea"> & { limit: Limit }) {
  const [length, setLength] = useState(String(defaultValue ?? "").length);
  const [min, max] = limit;
  return (
    <span className="flex flex-col gap-1">
      <textarea
        {...lengthProps(limit)}
        {...props}
        defaultValue={defaultValue}
        onChange={(e) => {
          setLength(e.target.value.length);
          props.onChange?.(e);
        }}
        className={`${textareaClass} ${props.className ?? ""}`}
      />
      <span aria-hidden className={`self-end text-xs ${length > 0 && length < min ? "text-red-700 dark:text-red-300" : "text-muted"}`}>
        {length.toLocaleString("en-IE")} / {max.toLocaleString("en-IE")}
      </span>
    </span>
  );
}
