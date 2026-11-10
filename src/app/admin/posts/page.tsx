import Link from "next/link";
import type { Metadata } from "next";
import { CodeTag, LinkButton } from "@/components/ui";
import { formatLongDate } from "@/lib/format";
import { listPostsAdmin } from "@/server/admin/content";
import { AdminPage, Table, Td } from "../ui";

export const metadata: Metadata = { title: "Posts" };

export default async function AdminPostsPage() {
  const posts = await listPostsAdmin();
  return (
    <AdminPage
      title="Posts"
      actions={
        <LinkButton href="/admin/posts/new" variant="primary" size="sm">
          New post
        </LinkButton>
      }
    >
      <Table head={["Headline", "From", "Code", "Published"]} empty="No posts yet — publish the first one.">
        {posts.map((p) => (
          <tr key={p.id}>
            <Td>
              <Link href={`/admin/posts/${p.id}`} className="font-semibold text-navy hover:underline">
                {p.title}
              </Link>
              <p className="text-xs text-muted">{p.kind}</p>
            </Td>
            <Td>{p.authorName}</Td>
            <Td>
              <CodeTag code={p.category} />
            </Td>
            <Td className="whitespace-nowrap">{formatLongDate(p.publishedAt)}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
