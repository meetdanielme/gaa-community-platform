import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clubConfig } from "@/club.config";
import { ConfirmButton } from "@/components/confirm-button";
import { getPostAdmin } from "@/server/admin/content";
import { AdminPage } from "../../ui";
import { deletePostAction } from "../actions";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const post = await getPostAdmin(id);
  if (!post) notFound();
  return (
    <AdminPage
      title="Edit post"
      back={{ href: "/admin/posts", label: "Posts" }}
      actions={
        <ConfirmButton
          label="Delete post"
          title="Delete this post?"
          confirmLabel="Delete post"
          size="sm"
          action={deletePostAction.bind(null, post.id)}
        >
          &ldquo;{post.title}&rdquo; will be removed from everyone&apos;s feed.
        </ConfirmButton>
      }
    >
      <PostForm post={post} author={clubConfig.postAuthor} />
    </AdminPage>
  );
}
