"use client";

import { useOptimistic, useTransition } from "react";
import { HeartIcon } from "@/components/icons";
import { toggleLikeAction } from "./actions";

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic({ liked, count });

  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) });
          await toggleLikeAction(postId);
        })
      }
      className={`flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-paper ${state.liked ? "text-navy" : ""}`}
    >
      <HeartIcon filled={state.liked} className="size-4" />
      {state.count}
    </button>
  );
}
