"use client";

import { useFormAction } from "@/lib/use-form-action";
import { codes, postKinds } from "@/club.config";
import { ImageField } from "@/components/admin/image-field";
import { Field, Input, Select } from "@/components/form";
import { Textarea } from "@/components/textarea";
import { limits } from "@/lib/limits";
import { Button, Card, Notice } from "@/components/ui";
import { savePostAction } from "./actions";

type PostValues = {
  id: string;
  kind: string;
  category: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  pinned: boolean;
};

export function PostForm({ post, author }: { post?: PostValues; author: string }) {
  const [state, onSubmit, pending] = useFormAction(savePostAction);
  const err = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Card className="flex min-w-0 flex-col gap-4">
        <Field label="Headline" error={err.title} limit={limits.post.title}>
          <Input name="title" defaultValue={post?.title} limit={limits.post.title} />
        </Field>
        <Field label="Text" error={err.body} hint={`Published as ${author}.`}>
          <Textarea name="body" defaultValue={post?.body} limit={limits.post.body} className="min-h-48" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Button label (optional)" error={err.ctaLabel}>
            <Input
              name="ctaLabel"
              defaultValue={post?.ctaLabel ?? ""}
              limit={limits.post.ctaLabel}
              placeholder="See event details"
            />
          </Field>
          <Field label="Button link" error={err.ctaHref} hint="e.g. /events/culture-night or /donate">
            <Input name="ctaHref" defaultValue={post?.ctaHref ?? ""} limit={limits.post.ctaHref} placeholder="/events" />
          </Field>
        </div>
      </Card>
      <Card className="flex min-w-0 flex-col gap-4">
        <Field label="Type" error={err.kind} hint="Each type has its own icon and colour in the feed.">
          <Select name="kind" defaultValue={post?.kind ?? postKinds[0].id} required>
            {postKinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.id}
              </option>
            ))}
            {/* Keep a type typed before the fixed list existed. */}
            {post && !postKinds.some((k) => k.id === post.kind) && <option value={post.kind}>{post.kind}</option>}
          </Select>
        </Field>
        <Field label="Code" error={err.category}>
          <Select name="category" defaultValue={post?.category ?? ""}>
            <option value="">All codes</option>
            {codes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value="social">Social</option>
          </Select>
        </Field>
        <label className="flex items-start gap-3 rounded-xl bg-paper p-3">
          <input type="checkbox" name="pinned" defaultChecked={post?.pinned} className="mt-1 size-4 accent-navy" />
          <span>
            <span className="block font-semibold">Pin to the top of the feed</span>
            <span className="text-sm text-muted">For important notices, like weather cancellations. Unpin it once it no longer applies.</span>
          </span>
        </label>
        <ImageField defaultValue={post?.imageUrl} error={err.imageUrl} />
        {state && !state.ok && <Notice tone="error">Please check the highlighted fields.</Notice>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Publishing…" : post ? "Save changes" : "Publish to feed"}
        </Button>
      </Card>
    </form>
  );
}
