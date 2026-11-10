import type { Metadata } from "next";
import { clubConfig } from "@/club.config";
import { AdminPage } from "../../ui";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <AdminPage title="New post" back={{ href: "/admin/posts", label: "Posts" }}>
      <PostForm author={clubConfig.postAuthor} />
    </AdminPage>
  );
}
