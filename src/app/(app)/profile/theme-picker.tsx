"use client";

import { useSyncExternalStore } from "react";
import { Card } from "@/components/ui";

const options = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

type Theme = (typeof options)[number]["id"];

/* The current choice lives on <html data-theme>, set by the root layout's script. */
function readTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function applyTheme(next: Theme) {
  try {
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  } catch {
    // Storage blocked: the choice still applies until the page reloads.
  }
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
}

/** Light, dark or follow the device. Saved on this device only. */
export function ThemePicker() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">Appearance</h2>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-2xl bg-paper p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={theme === o.id}
            onClick={() => applyTheme(o.id)}
            className={`min-h-11 rounded-xl text-sm font-semibold transition ${
              theme === o.id ? "bg-surface text-navy shadow-sm" : "text-muted hover:text-navy"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">System follows your device&apos;s light or dark setting.</p>
    </Card>
  );
}
