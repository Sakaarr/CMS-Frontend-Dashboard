"use client";

import { useState } from "react";
import { usePortalCertificates, usePortalCertificate } from "@/hooks/usePortal";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

function CertificateDetail({ certId, onClose }: { certId: string; onClose: () => void }) {
  const { data, isLoading } = usePortalCertificate(certId);

  if (isLoading) return <p className="py-4 text-center text-gray-500">Loading...</p>;
  if (!data) return <p className="py-4 text-center text-red-500">Not found</p>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{data.certificate_number}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Period:</span> {data.period_start} to {data.period_end}</div>
          <div><span className="text-gray-500">Status:</span> <span className={`font-medium capitalize ${data.status === "paid" ? "text-green-600" : data.status === "approved" ? "text-blue-600" : ""}`}>{data.status}</span></div>
          <div><span className="text-gray-500">Previous Certified:</span> {formatCurrency(data.previous_certified_value)}</div>
          <div><span className="text-gray-500">Current Work Value:</span> {formatCurrency(data.current_completed_value)}</div>
          <div><span className="text-gray-500">Total Certified:</span> {formatCurrency(data.total_certified_value)}</div>
          <div><span className="text-gray-500">Retention ({data.retention_percentage}%):</span> {formatCurrency(data.retention_amount)}</div>
          <div><span className="text-gray-500">Deductions:</span> {formatCurrency(data.deductions)}</div>
          <div><span className="text-gray-500">Gross Payable:</span> {formatCurrency(data.gross_payable)}</div>
          <div><span className="text-gray-500">Net Payable:</span> {formatCurrency(data.net_payable)}</div>
          <div><span className="text-gray-500">Previously Paid:</span> {formatCurrency(data.previous_paid_amount)}</div>
          <div className="col-span-2 font-semibold text-lg">Amount Due: {formatCurrency(data.amount_due)}</div>
          {data.remarks && <div className="col-span-2"><span className="text-gray-500">Remarks:</span> {data.remarks}</div>}
        </div>

        {data.items.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Items</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-2 py-1">Description</th>
                  <th className="px-2 py-1">Prev Qty</th>
                  <th className="px-2 py-1">Current</th>
                  <th className="px-2 py-1">Total</th>
                  <th className="px-2 py-1">Amount</th>
                  <th className="px-2 py-1">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1">{item.description}</td>
                    <td className="px-2 py-1">{item.previous_certified_qty}</td>
                    <td className="px-2 py-1">{item.current_qty}</td>
                    <td className="px-2 py-1">{item.total_certified_qty}</td>
                    <td className="px-2 py-1">{formatCurrency(item.total_certified_amount)}</td>
                    <td className="px-2 py-1">{item.remaining_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortalCertificatesPage() {
  const [page, setPage] = useState(1);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const { data, isLoading, error } = usePortalCertificates(page, 20);

  const certs = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Payment Certificates</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading certificates...</p>
      ) : error ? (
        <p className="text-red-500">Failed to load certificates.</p>
      ) : certs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500">No certificates yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              onClick={() => setSelectedCertId(cert.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{cert.certificate_number}</h3>
                  <p className="text-xs text-gray-500">Rev {cert.revision_number}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[cert.status] || ""}`}>
                  {cert.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Period:</span> {cert.period_start}</div>
                <div><span className="text-gray-500">Net Payable:</span> <span className="font-medium">{formatCurrency(cert.net_payable)}</span></div>
                <div><span className="text-gray-500">Amount Due:</span> <span className="font-semibold text-blue-600">{formatCurrency(cert.amount_due)}</span></div>
                <div><span className="text-gray-500">Retention:</span> {formatCurrency(cert.retention_amount)}</div>
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

      {selectedCertId && <CertificateDetail certId={selectedCertId} onClose={() => setSelectedCertId(null)} />}
    </div>
  );
}
