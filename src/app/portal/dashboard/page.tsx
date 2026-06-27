"use client";

import { usePortalDashboard } from "@/hooks/usePortal";
import { usePortalAuthStore } from "@/store/portal-auth.store";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function PortalDashboardPage() {
  const { data, isLoading, error } = usePortalDashboard();
  const { user } = usePortalAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">Failed to load dashboard.</p>
      </div>
    );
  }

  const cards = [
    { label: "Active Contracts", value: data.active_contracts, color: "bg-blue-500" },
    { label: "Total Contract Value", value: formatCurrency(data.total_contract_value), color: "bg-green-500" },
    { label: "Certified Value", value: formatCurrency(data.total_certified_value), color: "bg-purple-500" },
    { label: "Paid Amount", value: formatCurrency(data.total_paid_amount), color: "bg-teal-500" },
    { label: "Pending Progress", value: data.pending_progress_entries, color: "bg-amber-500" },
    { label: "Approved Progress", value: data.approved_progress_entries, color: "bg-emerald-500" },
    { label: "Open NCRs", value: data.open_ncrs, color: data.open_ncrs > 0 ? "bg-red-500" : "bg-gray-400" },
    { label: "Open Punch Items", value: data.open_punch_items, color: data.open_punch_items > 0 ? "bg-orange-500" : "bg-gray-400" },
    { label: "Expiring Documents", value: data.expiring_documents, color: data.expiring_documents > 0 ? "bg-rose-500" : "bg-gray-400" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {user?.full_name || "Subcontractor"}
        </h1>
        <p className="text-sm text-gray-500">
          {user?.subcontractor_name} &middot; {user?.role.replace("_", " ")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color} text-sm font-bold text-white`}>
                {typeof card.value === "number" ? card.value.toString()[0] : "₹"}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
