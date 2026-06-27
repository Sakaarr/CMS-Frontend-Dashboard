"use client";

import { useState } from "react";
import {
  usePortalProgressList,
  usePortalCreateProgress,
  usePortalSubmitProgress,
  usePortalContracts,
  usePortalContractBOQItems,
} from "@/hooks/usePortal";
import { extractApiError } from "@/lib/api";

export default function PortalProgressPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = usePortalProgressList(statusFilter, page, 20);
  const { mutate: createProgress, isPending: isCreating, error: createError } = usePortalCreateProgress();
  const { mutate: submitProgress } = usePortalSubmitProgress();

  const entries = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Progress Entries</h1>
          <p className="text-sm text-gray-500">Track and submit your work progress</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Record Progress"}
        </button>
      </div>

      {showForm && <ProgressForm onSubmit={(data) => { createProgress(data, { onSuccess: () => setShowForm(false) }); }} isPending={isCreating} error={createError} />}

      <div className="mb-4 flex gap-2">
        {[undefined, "draft", "submitted", "approved", "rejected"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading progress entries...</p>
      ) : error ? (
        <p className="text-red-500">Failed to load progress entries.</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500">No progress entries found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">Item</th>
                <th className="px-4 py-3 font-medium text-gray-500">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-500">Cumulative</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Remarks</th>
                <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">{entry.work_date}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{entry.item_number}</span>
                    <p className="truncate max-w-[200px]">{entry.item_description}</p>
                  </td>
                  <td className="px-4 py-3">{entry.quantity_completed}</td>
                  <td className="px-4 py-3">{entry.cumulative_quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status] || "bg-gray-100 text-gray-600"}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="max-w-[150px] truncate px-4 py-3 text-gray-500">{entry.remarks || "-"}</td>
                  <td className="px-4 py-3">
                    {entry.status === "draft" && (
                      <button
                        onClick={() => submitProgress(entry.id)}
                        className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        Submit
                      </button>
                    )}
                    {entry.status === "rejected" && entry.rejection_reason && (
                      <span className="text-xs text-red-500" title={entry.rejection_reason}>
                        Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function ProgressForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (data: any) => void;
  isPending: boolean;
  error: Error | null;
}) {
  const { data: contractsData } = usePortalContracts(1, 100);
  const contracts = contractsData?.data || [];
  const [selectedContract, setSelectedContract] = useState("");
  const { data: boqData } = usePortalContractBOQItems(selectedContract, 1, 100);
  const boqItems = boqData?.data || [];
  const [form, setForm] = useState({
    contract_id: "",
    boq_item_id: "",
    report_date: new Date().toISOString().split("T")[0],
    work_date: new Date().toISOString().split("T")[0],
    quantity_completed: 0,
    remarks: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Record Progress</h2>

      {error && <p className="mb-3 text-sm text-red-600">{extractApiError(error)}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contract</label>
          <select
            value={form.contract_id}
            onChange={(e) => { setForm({ ...form, contract_id: e.target.value, boq_item_id: "" }); setSelectedContract(e.target.value); }}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select contract</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.contract_number} - {c.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">BOQ Item</label>
          <select
            value={form.boq_item_id}
            onChange={(e) => setForm({ ...form, boq_item_id: e.target.value })}
            required
            disabled={!form.contract_id}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select BOQ item</option>
            {boqItems.filter((i) => i.remaining_quantity > 0).map((item) => (
              <option key={item.boq_item_id} value={item.boq_item_id}>
                {item.item_number} - {item.description} (Remaining: {item.remaining_quantity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Report Date</label>
          <input
            type="date"
            value={form.report_date}
            onChange={(e) => setForm({ ...form, report_date: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Work Date</label>
          <input
            type="date"
            value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity Completed</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.quantity_completed}
            onChange={(e) => setForm({ ...form, quantity_completed: parseFloat(e.target.value) || 0 })}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Remarks</label>
          <input
            type="text"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Draft"}
      </button>
    </form>
  );
}
