"use client";

import { useState } from "react";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useComments";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, Reply, Trash2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CommentSectionProps {
  targetType: string;
  targetId: string;
  title?: string;
}

export function CommentSection({ targetType, targetId, title = "Comments" }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { user } = useAuthStore();

  const { data: commentsData, isLoading } = useComments(targetType, targetId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const comments = commentsData?.data ?? [];
  const total = commentsData?.total ?? 0;

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await createComment.mutateAsync({
      content: newComment,
      target_type: targetType,
      target_id: targetId,
    });
    setNewComment("");
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    await createComment.mutateAsync({
      content: replyText,
      target_type: targetType,
      target_id: targetId,
      parent_id: parentId,
    });
    setReplyTo(null);
    setReplyText("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {title} ({total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No comments yet. Start the conversation.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userId={user?.id}
                onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                replyTo={replyTo === comment.id}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onReplySubmit={() => handleReply(comment.id)}
                onDelete={() => deleteComment.mutate({ commentId: comment.id, targetType, targetId })}
                replying={createComment.isPending}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            loading={createComment.isPending}
            disabled={!newComment.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentItem({
  comment, userId, onReply, replyTo, replyText, onReplyTextChange,
  onReplySubmit, onDelete, replying,
}: {
  comment: any; userId?: string; onReply: () => void;
  replyTo: boolean; replyText: string; onReplyTextChange: (v: string) => void;
  onReplySubmit: () => void; onDelete: () => void; replying: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold flex-shrink-0">
          {comment.author_name?.slice(0, 2).toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {comment.author_name || "Unknown"}
            </span>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{comment.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
            {comment.author_id === userId && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          {replyTo && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
              />
              <Button size="sm" onClick={onReplySubmit} loading={replying} disabled={!replyText.trim()}>
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      {comment.replies?.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-gray-100 dark:border-gray-800 pl-4">
          {comment.replies.map((reply: any) => (
            <div key={reply.id} className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-semibold flex-shrink-0">
                {reply.author_name?.slice(0, 2).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {reply.author_name || "Unknown"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
