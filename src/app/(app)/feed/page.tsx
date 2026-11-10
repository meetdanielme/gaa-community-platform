import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { clubConfig, codeLabel } from "@/club.config";
import { PageBody, PageHeader } from "@/components/page-header";
import { Tag, buttonClass } from "@/components/ui";
import { formatRelative, formatToday } from "@/lib/format";
import { listPosts } from "@/server/feed";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  const posts = await listPosts();

  return (
    <>
      <PageHeader title="Feed" />
      <PageBody>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{formatToday(new Date())}</p>
            <p className="mt-3 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
              One club.
              <br />
              Every generation.
            </p>
          </div>
          <Tag className="normal-case">{clubConfig.season}</Tag>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-card bg-white p-8 text-center text-muted">No club updates yet. Check back soon.</p>
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
                    <p className="text-xs text-muted">
                      {formatRelative(p.publishedAt)} · {p.kind}
                    </p>
                  </div>
                </div>
                {p.imageUrl && (
                  <div className="relative h-48 overflow-hidden rounded-2xl">
                    <Image src={p.imageUrl} unoptimized={!p.imageUrl.startsWith("/")} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                  </div>
                )}
                <div>
                  <Tag>{codeLabel(p.category)}</Tag>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
                <p className="max-w-md text-ink/90">{p.body}</p>
                {p.ctaHref && p.ctaLabel && (
                  <Link href={p.ctaHref} className={buttonClass("secondary", "w-full")}>
                    {p.ctaLabel}
                  </Link>
                )}
                <p className="mt-auto text-xs text-muted">{clubConfig.name} community</p>
              </article>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
