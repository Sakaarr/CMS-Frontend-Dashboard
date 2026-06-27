"use client";

import { useState } from "react";
import { usePortalContracts, usePortalContractBOQItems } from "@/hooks/usePortal";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

function BOQItemsTable({ contractId }: { contractId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePortalContractBOQItems(contractId, page, 50);

  if (isLoading) return <p className="py-2 text-sm text-gray-500">Loading BOQ items...</p>;
  if (!data || data.data.length === 0) return <p className="py-2 text-sm text-gray-400">No BOQ items assigned.</p>;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700">
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Rate</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Completed</th>
            <th className="px-3 py-2">Remaining</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-3 py-2 font-medium">{item.item_number}</td>
              <td className="px-3 py-2">{item.description}</td>
              <td className="px-3 py-2">{item.unit}</td>
              <td className="px-3 py-2">{item.assigned_quantity}</td>
              <td className="px-3 py-2">{formatCurrency(item.unit_rate)}</td>
              <td className="px-3 py-2">{formatCurrency(item.contract_amount)}</td>
              <td className="px-3 py-2">{item.cumulative_progress}</td>
              <td className="px-3 py-2">{item.remaining_quantity}</td>
              <td className="px-3 py-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.status === "completed" ? "bg-green-100 text-green-700" :
                  item.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {item.status.replace("_", " ")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractCard({ contract }: { contract: any }) {
  const [showBOQ, setShowBOQ] = useState(false);
  const bgColor =
    contract.status === "active" ? "border-l-green-500" :
    contract.status === "completed" ? "border-l-blue-500" :
    contract.status === "draft" ? "border-l-gray-400" :
    contract.status === "terminated" ? "border-l-red-500" : "border-l-yellow-500";

  return (
    <div className={`rounded-xl border border-l-4 ${bgColor} border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{contract.title}</h3>
          <p className="text-sm text-gray-500">{contract.contract_number}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
          contract.status === "active" ? "bg-green-100 text-green-700" :
          contract.status === "completed" ? "bg-blue-100 text-blue-700" :
          contract.status === "draft" ? "bg-gray-100 text-gray-600" :
          "bg-red-100 text-red-700"
        }`}>
          {contract.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Value:</span>{" "}
          <span className="font-medium">{formatCurrency(contract.contract_value)}</span>
        </div>
        <div>
          <span className="text-gray-500">BOQ Items:</span>{" "}
          <span className="font-medium">{contract.boq_item_count}</span>
        </div>
        {contract.start_date && (
          <div>
            <span className="text-gray-500">Start:</span>{" "}
            <span className="font-medium">{contract.start_date}</span>
          </div>
        )}
        {contract.end_date && (
          <div>
            <span className="text-gray-500">End:</span>{" "}
            <span className="font-medium">{contract.end_date}</span>
          </div>
        )}
      </div>

      {contract.scope_of_work && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{contract.scope_of_work}</p>
      )}

      <button
        onClick={() => setShowBOQ(!showBOQ)}
        className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        {showBOQ ? "Hide BOQ Items" : `View BOQ Items (${contract.boq_item_count})`}
      </button>

      {showBOQ && <BOQItemsTable contractId={contract.id} />}
    </div>
  );
}

export default function PortalContractsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePortalContracts(page, 20);

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">My Contracts</h1>
        <p className="text-gray-500">Loading contracts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">My Contracts</h1>
        <p className="text-red-500">Failed to load contracts.</p>
      </div>
    );
  }

  const contracts = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">My Contracts</h1>

      {contracts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500">No contracts assigned to your subcontractor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
