export function slugify(text: string) {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/** Appends -2, -3… until `exists` says the slug is free. */
export async function uniqueSlug(text: string, exists: (slug: string) => Promise<boolean>) {
  const base = slugify(text);
  let slug = base;
  for (let n = 2; await exists(slug); n++) slug = `${base}-${n}`;
  return slug;
}
