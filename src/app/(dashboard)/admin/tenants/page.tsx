"use client";

import { useState, useEffect } from "react";
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
import { Plus, Loader2, Building2, ShieldOff, ShieldCheck, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";


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
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Create new tenant + admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
              onSubmit={handleSubmit(async d => {
                await createTenant.mutateAsync({
                  name: d.name,
                  slug: d.slug,
                  email: d.email,
                  phone: d.phone,
                  pan_number: d.pan_number,
                  vat_number: d.vat_number,
                  admin_full_name: d.admin_full_name,
                  admin_email: d.admin_email,
                  admin_phone: d.admin_phone,
                });
                reset();
                setShowCreate(false);
              })}
            >
              {/* Tenant fields */}
              <div className="col-span-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Organisation details
                </p>
              </div>
              <Input label="Organisation name" placeholder="Acme Construction Pvt. Ltd." {...register("name", { required: true })} />
              <Input label="Slug" placeholder="acme-construction" {...register("slug", { required: true })} />
              <Input label="Organisation email" type="email" placeholder="info@acme.com" {...register("email", { required: true })} />
              <Input label="Phone" {...register("phone")} />
              <Input label="PAN number" {...register("pan_number")} />
              <Input label="VAT number" {...register("vat_number")} />

              {/* Divider */}
              <div className="col-span-full border-t border-gray-200 dark:border-gray-800 pt-4 mt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Admin user (will receive credentials by email)
                </p>
              </div>
              <Input label="Admin full name" placeholder="Ramesh Sharma" {...register("admin_full_name", { required: true })} />
              <Input label="Admin email" type="email" placeholder="admin@acme.com" {...register("admin_email", { required: true })} />
              <Input label="Admin phone" {...register("admin_phone")} />

              <div className="col-span-full rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  A temporary password will be generated and emailed to the admin. They will be prompted to change it on first login.
                </p>
              </div>

              <div className="col-span-full flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={createTenant.isPending}>
                  Create tenant & send credentials
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tenants list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Building2 className="h-8 w-8 mb-2" />
              <p className="text-sm">No tenants yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {tenants.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.slug} · {formatDate(t.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[t.plan] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {t.plan}
                    </span>
                    <Badge
                      variant={
                        t.status === "active"
                          ? "success"
                          : t.status === "suspended"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {t.status}
                    </Badge>
                    {t.status === "suspended" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={activateTenant.isPending}
                        onClick={() => activateTenant.mutate(t.id)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={suspendTenant.isPending}
                        onClick={() => suspendTenant.mutate(t.id)}
                      >
                        <ShieldOff className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}