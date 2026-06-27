"use client";

import { useState } from "react";
import {
  usePortalNotifications,
  usePortalMarkNotificationRead,
  usePortalMarkAllNotificationsRead,
} from "@/hooks/usePortal";

export default function PortalNotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePortalNotifications(unreadOnly, page, 50);
  const { mutate: markRead } = usePortalMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = usePortalMarkAllNotificationsRead();

  const items = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const typeIcons: Record<string, string> = {
    progress_approved: "✅",
    progress_rejected: "❌",
    progress_submitted: "📤",
    cert_approved: "🏅",
    cert_paid: "💰",
    ncr_assigned: "⚠️",
    punch_assigned: "📋",
    doc_expiring: "🔔",
    doc_verified: "✔️",
    contract_activated: "📄",
    general: "📢",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500">Stay updated on approvals, rejections, and alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
              className="rounded border-gray-300"
            />
            Unread only
          </label>
          <button
            onClick={() => markAllRead()}
            disabled={isMarkingAll}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          >
            {isMarkingAll ? "..." : "Mark all read"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading notifications...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500">No notifications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                notif.is_read
                  ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
              }`}
            >
              <span className="text-xl">{typeIcons[notif.notification_type] || "📢"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{notif.title}</p>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{notif.message}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
              {!notif.is_read && (
                <button
                  onClick={() => markRead(notif.id)}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
