"use client";

import { useState } from "react";
import {
  usePortalNCRs,
  usePortalRespondNCR,
  usePortalPunchItems,
  usePortalRespondPunchItem,
  usePortalSafetyObservations,
} from "@/hooks/usePortal";
import { extractApiError } from "@/lib/api";

const TABS = ["NCRs", "Punch Items", "Safety Observations"];

function NCRTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [respondId, setRespondId] = useState<string | null>(null);

  const { data, isLoading } = usePortalNCRs(statusFilter, page, 20);
  const { mutate: respond, isPending } = usePortalRespondNCR();

  const items = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    acknowledged: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
    disputed: "bg-purple-100 text-purple-700",
  };

  const handleRespond = (ncrId: string, formData: { root_cause: string; corrective_action: string; preventive_action?: string }) => {
    respond({ ncrId, ...formData }, { onSuccess: () => setRespondId(null) });
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {[undefined, "open", "acknowledged", "in_progress", "resolved", "closed"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading NCRs...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No NCRs found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((ncr) => (
            <div key={ncr.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{ncr.ncr_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[ncr.severity] || ""}`}>{ncr.severity}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ncr.status] || ""}`}>{ncr.status.replace("_", " ")}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-medium">{ncr.title}</h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{ncr.description}</p>
                  {ncr.due_date && <p className="mt-1 text-xs text-gray-500">Due: {ncr.due_date}</p>}
                  {ncr.corrective_action && (
                    <p className="mt-1 text-xs text-green-600">Response: {ncr.corrective_action}</p>
                  )}
                </div>
                {(ncr.status === "open" || ncr.status === "acknowledged" || ncr.status === "in_progress") && (
                  <button
                    onClick={() => setRespondId(respondId === ncr.id ? null : ncr.id)}
                    className="ml-3 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    {respondId === ncr.id ? "Cancel" : "Respond"}
                  </button>
                )}
              </div>

              {respondId === ncr.id && (
                <NCRRespondForm
                  onSubmit={(data) => handleRespond(ncr.id, data)}
                  isPending={isPending}
                />
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

function NCRRespondForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ root_cause: "", corrective_action: "", preventive_action: "" });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Root Cause</label>
          <textarea
            value={form.root_cause}
            onChange={(e) => setForm({ ...form, root_cause: e.target.value })}
            required
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Corrective Action</label>
          <textarea
            value={form.corrective_action}
            onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
            required
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Preventive Action (optional)</label>
          <textarea
            value={form.preventive_action}
            onChange={(e) => setForm({ ...form, preventive_action: e.target.value })}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit Response"}
        </button>
      </div>
    </form>
  );
}

function PunchItemsTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [respondId, setRespondId] = useState<string | null>(null);

  const { data, isLoading } = usePortalPunchItems(statusFilter, page, 20);
  const { mutate: respond, isPending } = usePortalRespondPunchItem();

  const items = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    verified: "bg-blue-100 text-blue-700",
    rejected: "bg-purple-100 text-purple-700",
  };

  const handleRespond = (itemId: string, formData: { remarks: string; status: string }) => {
    respond({ itemId, ...formData }, { onSuccess: () => setRespondId(null) });
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {[undefined, "open", "in_progress", "completed", "verified", "rejected"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading punch items...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No punch items found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.item_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] || ""}`}>{item.status.replace("_", " ")}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">{item.priority}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                  {item.due_date && <p className="mt-1 text-xs text-gray-500">Due: {item.due_date}</p>}
                </div>
                {(item.status === "open" || item.status === "in_progress") && (
                  <button
                    onClick={() => setRespondId(respondId === item.id ? null : item.id)}
                    className="ml-3 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"
                  >
                    {respondId === item.id ? "Cancel" : "Mark Complete"}
                  </button>
                )}
              </div>

              {respondId === item.id && (
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleRespond(item.id, { remarks: fd.get("remarks") as string, status: "completed" }); }} className="mt-3 flex gap-2">
                  <input
                    name="remarks"
                    required
                    placeholder="Completion remarks..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPending ? "..." : "Submit"}
                  </button>
                </form>
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

function SafetyObservationsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePortalSafetyObservations(page, 20);

  const items = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">Safety observations recorded for your subcontractor.</p>

      {isLoading ? (
        <p className="text-gray-500">Loading safety observations...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No safety observations.</p>
      ) : (
        <div className="space-y-3">
          {items.map((obs) => (
            <div key={obs.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{obs.observation_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${obs.is_positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {obs.observation_type.replace("_", " ")}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">{obs.status}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-medium">{obs.title}</h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{obs.description}</p>
                  {obs.action_taken && <p className="mt-1 text-xs text-gray-500">Action: {obs.action_taken}</p>}
                  {obs.notes && <p className="mt-1 text-xs text-gray-500">Notes: {obs.notes}</p>}
                </div>
              </div>
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

export default function PortalQualityPage() {
  const [tab, setTab] = useState("NCRs");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Quality & Safety</h1>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "NCRs" && <NCRTab />}
      {tab === "Punch Items" && <PunchItemsTab />}
      {tab === "Safety Observations" && <SafetyObservationsTab />}
    </div>
  );
}
