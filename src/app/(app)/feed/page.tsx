import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { clubConfig, codes, eventCategories, postKindStyle, postKinds } from "@/club.config";
import { Badge } from "@/components/app-shell";
import { FilterChips } from "@/components/filter-chips";
import { FilterMenu } from "@/components/filter-menu";
import { PageBody, PageHeader } from "@/components/page-header";
import { CodeTag, KindLabel, buttonClass } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { listPosts } from "@/server/feed";

export const metadata: Metadata = { title: "Feed" };

const filters = [...codes.map((c) => ({ id: c.id, label: c.label })), { id: "social", label: "Social" }];

function feedHref(code?: string, type?: string) {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (type) params.set("type", type);
  const q = params.toString();
  return q ? `/feed?${q}` : "/feed";
}

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { code, type } = await searchParams;
  const category = typeof code === "string" && code in eventCategories && code !== "all" ? code : undefined;
  const kind = typeof type === "string" && postKinds.some((k) => k.id === type) ? type : undefined;
  const posts = await listPosts(category, kind);
  // Each filter keeps the other one, e.g. hurling match reports.
  const typeHref = (t?: string) => feedHref(category, t);

  return (
    <>
      <PageHeader
        title="Feed"
        action={
          <FilterMenu
            label="Filter posts by type"
            heading="Show posts of type"
            all={{ label: "All types", href: typeHref() }}
            options={postKinds.map((k) => ({ id: k.id, label: k.id, href: typeHref(k.id) }))}
            active={kind}
          />
        }
      />
      <PageBody className="flex flex-col gap-6">
        <FilterChips basePath="/feed" active={category} options={filters} extraParams={kind ? { type: kind } : undefined} />
        {kind && (
          <div className="flex flex-wrap items-center gap-3">
            <KindLabel kind={kind} />
            <Link href={typeHref()} className="text-sm font-semibold text-navy hover:underline">
              Show all types
            </Link>
          </div>
        )}

        {posts.length === 0 ? (
          <p className="rounded-card bg-surface p-8 text-center text-muted">{kind || category ? "No posts match this filter yet." : "No posts yet."}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((p) => {
              const { colour } = postKindStyle(p.kind);
              const href = `/feed/${p.id}`;
              return (
                <article
                  key={p.id}
                  className="flex flex-col gap-4 rounded-card border-t-4 bg-surface p-5"
                  style={{ borderTopColor: colour }}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
                      <Badge size={26} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{clubConfig.postAuthor}</p>
                      <p className="text-xs text-muted">{formatRelative(p.publishedAt)}</p>
                    </div>
                    <KindLabel kind={p.kind} />
                  </div>
                  {p.imageUrl && (
                    <Link href={href} tabIndex={-1} aria-hidden className="relative block h-48 overflow-hidden rounded-2xl">
                      <Image
                        src={p.imageUrl}
                        unoptimized={!p.imageUrl.startsWith("/")}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 40vw, 100vw"
                        className="object-cover transition hover:scale-[1.02]"
                      />
                    </Link>
                  )}
                  <div>
                    <CodeTag code={p.category} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    <Link href={href} className="hover:text-navy hover:underline">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="line-clamp-3 max-w-md text-ink/90">{p.body}</p>
                  <div className="mt-auto flex flex-col gap-2">
                    <Link href={href} className="text-sm font-semibold text-navy hover:underline">
                      Read more <span className="sr-only">about {p.title}</span>
                    </Link>
                    {p.ctaHref && p.ctaLabel && (
                      <Link href={p.ctaHref} className={buttonClass("secondary", "w-full")}>
                        {p.ctaLabel}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
