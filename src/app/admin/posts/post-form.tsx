"use client";

import { useFormAction } from "@/lib/use-form-action";
import { codes } from "@/club.config";
import { ImageField } from "@/components/admin/image-field";
import { Field, Input, Select, textareaClass } from "@/components/form";
import { Button, Card, Notice } from "@/components/ui";
import { savePostAction } from "./actions";

type PostValues = {
  id: string;
  authorName: string;
  kind: string;
  category: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export function PostForm({ post, clubName }: { post?: PostValues; clubName: string }) {
  const [state, onSubmit, pending] = useFormAction(savePostAction);
  const err = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Card className="flex flex-col gap-4">
        <Field label="Headline" error={err.title}>
          <Input name="title" defaultValue={post?.title} required maxLength={120} />
        </Field>
        <Field label="Text" error={err.body}>
          <textarea name="body" defaultValue={post?.body} required maxLength={2000} className={textareaClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button label (optional)" error={err.ctaLabel}>
            <Input name="ctaLabel" defaultValue={post?.ctaLabel ?? ""} placeholder="See event details" />
          </Field>
          <Field label="Button link" error={err.ctaHref} hint="e.g. /events/culture-night or /donate">
            <Input name="ctaHref" defaultValue={post?.ctaHref ?? ""} placeholder="/events" />
          </Field>
        </div>
      </Card>
      <Card className="flex flex-col gap-4">
        <Field label="From" error={err.authorName} hint={`e.g. ${clubName} Hurling, ${clubName} Coaching`}>
          <Input name="authorName" defaultValue={post?.authorName ?? `${clubName} Community`} required />
        </Field>
        <Field label="Type" error={err.kind}>
          <Input name="kind" defaultValue={post?.kind ?? "Club update"} required list="post-kinds" />
          <datalist id="post-kinds">
            {["Club update", "Match report", "Training notice", "Goal update", "Behind the scenes"].map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
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
        <ImageField defaultValue={post?.imageUrl} error={err.imageUrl} />
        {state && !state.ok && <Notice tone="error">Please check the highlighted fields.</Notice>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Publishing…" : post ? "Save changes" : "Publish to feed"}
        </Button>
      </Card>
    </form>
  );
}
