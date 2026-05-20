"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { postComment, deleteComment } from "@/app/actions/social";

export interface CommentData {
  id: string;
  text: string;
  created_at: string | null;
  user: {
    id: string;
    username: string;
    display_name: string;
  };
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Comments({
  hikeId,
  initialComments,
  currentUserId,
  hikeOwnerId,
}: {
  hikeId: string;
  initialComments: CommentData[];
  currentUserId: string | null;
  hikeOwnerId: string;
}) {
  const [optimistic, addOptimistic] = useOptimistic(
    initialComments,
    (state: CommentData[], action: { type: "add"; comment: CommentData } | { type: "remove"; id: string }) => {
      if (action.type === "add") return [...state, action.comment];
      return state.filter((c) => c.id !== action.id);
    }
  );

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !currentUserId) return;
    setError(null);

    const optimisticComment: CommentData = {
      id: `optimistic-${Date.now()}`,
      text: text.trim(),
      created_at: new Date().toISOString(),
      user: { id: currentUserId, username: "", display_name: "You" },
    };

    const submitted = text;
    setText("");

    startTransition(async () => {
      addOptimistic({ type: "add", comment: optimisticComment });
      const result = await postComment(hikeId, submitted);
      if (!result.ok) setError(result.error);
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      addOptimistic({ type: "remove", id: commentId });
      await deleteComment(commentId, hikeId);
    });
  }

  const isSignedIn = !!currentUserId;

  return (
    <div className="space-y-5">
      {/* Comment list */}
      {optimistic.length === 0 ? (
        <p className="text-sm text-text-muted py-4">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {optimistic.map((comment) => {
            const canDelete =
              currentUserId === comment.user.id || currentUserId === hikeOwnerId;
            return (
              <div key={comment.id} className="flex gap-3 group">
                <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center shrink-0 text-xs font-medium text-accent">
                  {comment.user.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {comment.user.username ? (
                      <Link
                        href={`/u/${comment.user.username}`}
                        className="text-sm font-medium text-text hover:text-accent transition-colors"
                      >
                        {comment.user.display_name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-text">{comment.user.display_name}</span>
                    )}
                    <span className="text-xs text-text-muted font-mono">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-text-soft mt-0.5 leading-relaxed">{comment.text}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    aria-label="Delete comment"
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all duration-[150ms] shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Compose */}
      {isSignedIn ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-muted text-text text-sm
                       resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft
                       leading-relaxed placeholder:text-text-muted"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-mono">{text.length}/500</span>
            <div className="flex items-center gap-3">
              {error && <span className="text-xs text-danger">{error}</span>}
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-4 py-1.5 rounded-md bg-accent text-accent-on text-xs font-medium
                           hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors duration-[150ms]"
              >
                Post
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-sm text-text-muted">
          <Link href="/signin" className="text-accent hover:text-accent-hover">Sign in</Link> to comment.
        </p>
      )}
    </div>
  );
}
