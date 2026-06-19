"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { useApprovalsInbox } from "@/hooks/useApprovals";
import { useHasApprovalInboxAccess } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Clock3,
  FileText,
  Inbox,
  Loader2,
  Package,
  ShoppingCart,
  FileSpreadsheet,
} from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  finance: "Finance",
  procurement: "Procurement",
  inventory: "Inventory",
  boq: "BOQ",
  documents: "Documents",
};

const MODULE_ICONS: Record<string, ElementType> = {
  finance: FileText,
  procurement: ShoppingCart,
  inventory: Package,
  boq: FileSpreadsheet,
  documents: ClipboardList,
};

function formatMeta(item: { meta: Record<string, string | number | null> }) {
  const meta = item.meta ?? {};
  const currency = typeof meta.currency === "string" ? meta.currency : "NPR";
  if (typeof meta.grand_total === "number") {
    return formatCurrency(meta.grand_total, currency);
  }
  if (typeof meta.total_amount === "number") {
    return formatCurrency(meta.total_amount, currency);
  }
  if (typeof meta.amount === "number") {
    return formatCurrency(meta.amount, currency);
  }
  return null;
}

export default function ApprovalsInboxPage() {
  const hasAccess = useHasApprovalInboxAccess();
  const { data, isLoading, isError } = useApprovalsInbox(100, hasAccess);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-xl dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Approvals Inbox
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your account does not currently have access to any approval-capable modules.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
            <Inbox className="h-3.5 w-3.5" />
            Pending action across modules
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Approvals Inbox
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Everything that needs your approval in one place.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Pending items
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {total}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(MODULE_LABELS).map(([key, label]) => {
          const count = counts[key] ?? 0;
          const Icon = MODULE_ICONS[key] ?? ClipboardList;
          return (
            <Card key={key} className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {count}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="dark:text-gray-100">Action required</CardTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sorted by newest pending item first.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading approvals...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-red-600">
              We could not load the inbox right now.
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <Clock3 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                You&apos;re all caught up
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nothing is currently waiting for your approval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const moduleLabel = MODULE_LABELS[item.module] ?? item.module;
                const Icon = MODULE_ICONS[item.module] ?? ClipboardList;
                const metaAmount = formatMeta(item);

                return (
                  <div
                    key={`${item.module}-${item.id}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-950/40"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge label={moduleLabel} />
                            <Badge label={item.item_type.replace(/_/g, " ")} />
                            <Badge status={item.status} />
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {item.project_name ? `${item.project_name}${item.project_code ? ` (${item.project_code})` : ""}` : "No project linked"}
                            {item.subtitle ? ` • ${item.subtitle}` : ""}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>Created {formatDate(item.created_at)}</span>
                            {metaAmount && <span>{metaAmount}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:shrink-0">
                        {item.action_url ? (
                          <Link
                            href={item.action_url}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            Open module
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        ) : (
                          <Button disabled>No action link</Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
