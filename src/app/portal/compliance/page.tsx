"use client";

import { useState } from "react";
import { usePortalComplianceDocs } from "@/hooks/usePortal";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "license", label: "License" },
  { value: "tax_certificate", label: "Tax Certificate" },
  { value: "insurance", label: "Insurance" },
  { value: "safety_cert", label: "Safety Cert" },
  { value: "quality_cert", label: "Quality Cert" },
  { value: "registration", label: "Registration" },
  { value: "other", label: "Other" },
];

export default function PortalCompliancePage() {
  const [category, setCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePortalComplianceDocs(category, page, 20);

  const docs = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    expiring_soon: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
    revoked: "bg-gray-100 text-gray-600",
    pending_renewal: "bg-orange-100 text-orange-700",
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Compliance Documents</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => { setCategory(c.value || undefined); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              (category || "") === c.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading documents...</p>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500">No compliance documents found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 font-medium text-gray-500">Document</th>
                <th className="px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Issued</th>
                <th className="px-4 py-3 font-medium text-gray-500">Expiry</th>
                <th className="px-4 py-3 font-medium text-gray-500">Reference</th>
                <th className="px-4 py-3 font-medium text-gray-500">Verified</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{doc.title}</p>
                    <p className="text-xs text-gray-400">{doc.document_number}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{doc.category.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[doc.status] || ""}`}>
                      {doc.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{doc.issued_date || "-"}</td>
                  <td className={`px-4 py-3 ${doc.expiry_date && new Date(doc.expiry_date) < new Date() ? "text-red-600 font-medium" : ""}`}>
                    {doc.expiry_date || "-"}
                  </td>
                  <td className="px-4 py-3">{doc.reference_number || "-"}</td>
                  <td className="px-4 py-3">
                    {doc.verified_by ? `${doc.verified_at || ""}` : "-"}
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
