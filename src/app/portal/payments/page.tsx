"use client";

import { useState } from "react";
import { usePortalPayments } from "@/hooks/usePortal";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function PortalPaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePortalPayments(page, 20);

  const payments = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    partial: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Payment History</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading payments...</p>
      ) : error ? (
        <p className="text-red-500">Failed to load payments.</p>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500">No payments received yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 font-medium text-gray-500">Invoice</th>
                <th className="px-4 py-3 font-medium text-gray-500">Certificate</th>
                <th className="px-4 py-3 font-medium text-gray-500">Gross Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500">Deductions</th>
                <th className="px-4 py-3 font-medium text-gray-500">Net Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500">Paid</th>
                <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">Method</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-500">{p.certificate_number || "-"}</td>
                  <td className="px-4 py-3">{formatCurrency(p.gross_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(p.deductions)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(p.net_amount)}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(p.paid_amount)}</td>
                  <td className="px-4 py-3">{p.payment_date || "-"}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || ""}`}>
                      {p.status}
                    </span>
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
