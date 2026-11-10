import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { clubConfig, codes, eventCategories } from "@/club.config";
import { FilterChips } from "@/components/filter-chips";
import { PageBody, PageHeader } from "@/components/page-header";
import { CodeTag, KindLabel, buttonClass } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { listPosts } from "@/server/feed";

export const metadata: Metadata = { title: "Feed" };

const filters = [...codes.map((c) => ({ id: c.id, label: c.label })), { id: "social", label: "Social" }];

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { code } = await searchParams;
  const category = typeof code === "string" && code in eventCategories && code !== "all" ? code : undefined;
  const posts = await listPosts(category);

  return (
    <>
      <PageHeader title="Feed" />
      <PageBody className="flex flex-col gap-6">
        <FilterChips basePath="/feed" active={category} options={filters} />

        {posts.length === 0 ? (
          <p className="rounded-card bg-white p-8 text-center text-muted">No posts yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <article key={p.id} className="flex flex-col gap-4 rounded-card bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-navy text-lg font-semibold text-white">
                    {clubConfig.name[0]}
                  </span>
                  <div>
                    <p className="font-semibold">{p.authorName}</p>
                    <p className="text-xs text-muted">{formatRelative(p.publishedAt)}</p>
                  </div>
                </div>
                {p.imageUrl && (
                  <div className="relative h-48 overflow-hidden rounded-2xl">
                    <Image
                      src={p.imageUrl}
                      unoptimized={!p.imageUrl.startsWith("/")}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <CodeTag code={p.category} />
                  <KindLabel>{p.kind}</KindLabel>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
                <p className="max-w-md text-ink/90">{p.body}</p>
                {p.ctaHref && p.ctaLabel && (
                  <Link href={p.ctaHref} className={buttonClass("secondary", "mt-auto w-full")}>
                    {p.ctaLabel}
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
