"use client";

import { useState } from "react";
import {
  useTenants, useCreateTenant,
  useSuspendTenant, useActivateTenant,
} from "@/hooks/useTenants";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Building2, ShieldOff, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  starter: "bg-blue-100 text-blue-700",
  professional: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function TenantsAdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useTenants(page);
  const createTenant = useCreateTenant();
  const suspendTenant = useSuspendTenant();
  const activateTenant = useActivateTenant();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (!user?.is_superadmin) router.replace("/overview");
  }, [user]);

  if (!user?.is_superadmin) return null;

  const tenants = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500">{total} organisations on the platform</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New tenant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {["total", "active", "trial", "suspended"].map(s => {
          const count = s === "total"
            ? total
            : tenants.filter((t: any) => t.status === s).length;
          return (
            <Card key={s}>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 capitalize">{s}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create new tenant</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
              onSubmit={handleSubmit(async d => {
                await createTenant.mutateAsync(d);
                reset();
                setShowCreate(false);
              })}
            >
              <Input label="Organisation name" placeholder="Acme Construction" {...register("name", { required: true })} />
              <Input label="Slug" placeholder="acme-construction" {...register("slug", { required: true })} />
              <Input label="Email" type="email" placeholder="admin@acme.com" {...register("email", { required: true })} />
              <Input label="Phone" {...register("phone")} />
              <Input label="PAN number" {...register("pan_number")} />
              <Input label="VAT number" {...register("vat_number")} />
              <div className="col-span-2 lg:col-span-3 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={createTenant.isPending}>Create tenant</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tenant table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Organisation</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-right">Max Projects</th>
                <th className="px-4 py-3 text-right">Max Users</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : !tenants.length ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">
                    No tenants yet
                  </td>
                </tr>
              ) : tenants.map((tenant: any) => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-xs text-gray-500">{tenant.slug} · {tenant.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_COLORS[tenant.plan] ?? "bg-gray-100 text-gray-600"}`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Badge status={tenant.status} /></td>
                  <td className="px-4 py-3 text-gray-600 uppercase">{tenant.country}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{tenant.max_projects}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{tenant.max_users}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(tenant.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {tenant.status === "active" || tenant.status === "trial" ? (
                        <Button
                          size="sm" variant="outline"
                          loading={suspendTenant.isPending}
                          onClick={() => suspendTenant.mutate(tenant.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <ShieldOff className="h-3 w-3 mr-1" /> Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="outline"
                          loading={activateTenant.isPending}
                          onClick={() => activateTenant.mutate(tenant.id)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" /> Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >Previous</Button>
              <Button
                size="sm" variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}