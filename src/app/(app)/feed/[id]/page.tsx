import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clubConfig, postKindStyle } from "@/club.config";
import { Badge } from "@/components/app-shell";
import { PageBody, PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { CodeTag, KindLabel, buttonClass } from "@/components/ui";
import { formatLongDate, formatRelative } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getPost } from "@/server/feed";

export async function generateMetadata({ params }: PageProps<"/feed/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPost(id);
  return { title: p?.title ?? "Post" };
}

/* UC2 — read a club update in full. */
export default async function PostPage({ params }: PageProps<"/feed/[id]">) {
  const { id } = await params;
  await requireUser();
  const p = await getPost(id);
  if (!p) notFound();

  return (
    <>
      <PageHeader title={p.kind} backHref="/feed" action={<ShareButton title={p.title} text={p.title} />} />
      <PageBody className="max-w-3xl">
        <article
          className="flex flex-col gap-5 rounded-card border-t-4 bg-surface p-5 sm:p-8"
          style={{ borderTopColor: postKindStyle(p.kind).colour }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <KindLabel kind={p.kind} />
            <CodeTag code={p.category} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{p.title}</h2>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
              <Badge size={26} />
            </span>
            <div>
              <p className="font-semibold">{clubConfig.postAuthor}</p>
              <p className="text-xs text-muted">
                <time dateTime={p.publishedAt.toISOString()}>{formatLongDate(p.publishedAt)}</time> ·{" "}
                {formatRelative(p.publishedAt)}
              </p>
            </div>
          </div>
          {p.imageUrl && (
            <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80">
              <Image
                src={p.imageUrl}
                unoptimized={!p.imageUrl.startsWith("/")}
                alt=""
                fill
                priority
                sizes="(min-width: 768px) 720px, 100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-4 text-lg leading-relaxed whitespace-pre-line text-ink/90">{p.body}</div>
          {p.ctaHref && p.ctaLabel && (
            <Link href={p.ctaHref} className={buttonClass("primary", "w-full sm:w-fit")}>
              {p.ctaLabel}
            </Link>
          )}
        </article>
        <Link href="/feed" className="mt-6 inline-block text-sm font-semibold text-navy hover:underline">
          ← Back to the feed
        </Link>
      </PageBody>
    </>
  );
}
