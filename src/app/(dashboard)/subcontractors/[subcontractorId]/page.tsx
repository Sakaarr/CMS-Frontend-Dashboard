"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useSubcontractor, useSubcontractorProjects,
  useSubcontractorWorkload, useUpdateSubcontractor,
} from "@/hooks/useSubcontractors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, Loader2, Building2, Star,
  Phone, Mail, MapPin, FileText, Package, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { extractApiError } from "@/lib/api";

const STATUS_OPTIONS = ["active", "inactive", "blacklisted"];

export default function SubcontractorDetailPage() {
  const { subcontractorId } = useParams<{ subcontractorId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "projects" | "workload">("overview");
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: sub, isLoading, isError } = useSubcontractor(subcontractorId);
  const { data: projectsData } = useSubcontractorProjects(subcontractorId);
  const { data: workload } = useSubcontractorWorkload(subcontractorId);
  const updateSub = useUpdateSubcontractor();

  const editForm = useForm();

  useEffect(() => {
    if (sub) {
      editForm.reset({
        name: sub.name,
        code: sub.code,
        specialty: sub.specialty,
        status: sub.status ?? "active",
        contact_person: sub.contact_person ?? "",
        email: sub.email ?? "",
        phone: sub.phone ?? "",
        city: sub.city ?? "",
        gst_number: sub.gst_number ?? "",
        pan_number: sub.pan_number ?? "",
        license_number: sub.license_number ?? "",
        rating: sub.rating,
        notes: sub.notes ?? "",
        is_approved: sub.is_approved,
      });
    }
  }, [sub, editForm]);

  const onSave = async (formData: any) => {
    try {
      setSaveError(null);
      await updateSub.mutateAsync({ id: subcontractorId, data: formData });
    } catch (err) {
      setSaveError(extractApiError(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !sub) {
    return (
      <div className="text-center py-16 text-gray-400">
        Subcontractor not found.{" "}
        <Link href="/subcontractors" className="text-blue-600">Back to subcontractors</Link>
      </div>
    );
  }

  const projects = projectsData?.data ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/subcontractors"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" /> All subcontractors
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{sub.name}</h1>
              <Badge status={sub.status} />
              {sub.is_approved && <Badge status="approved" label="Approved" />}
            </div>
            <p className="text-sm text-gray-500">{sub.code} · {sub.specialty}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-lg">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          {sub.rating.toFixed(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sub.contact_person && (
              <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /> {sub.contact_person}</p>
            )}
            {sub.phone && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {sub.phone}</p>
            )}
            {sub.email && (
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {sub.email}</p>
            )}
            {sub.city && (
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {sub.city}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sub.gst_number && <p>GST: {sub.gst_number}</p>}
            {sub.pan_number && <p>PAN: {sub.pan_number}</p>}
            {sub.license_number && <p>License: {sub.license_number}</p>}
            {sub.insurance_provider && (
              <p>Insurance: {sub.insurance_provider} {sub.insurance_valid_until ? `(until ${formatDate(sub.insurance_valid_until)})` : ""}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Workload</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {workload && (
              <>
                <div className="flex justify-between"><span className="text-gray-500">Total contracts</span><span className="font-medium">{workload.total_contracts}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Active contracts</span><span className="font-medium">{workload.active_contracts}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total value</span><span className="font-medium">{formatCurrency(workload.total_contract_value)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">BOQ items</span><span className="font-medium">{workload.total_boq_items_assigned}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Assigned amount</span><span className="font-medium">{formatCurrency(workload.total_assigned_amount)}</span></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(["overview", "projects", "workload"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Card>
          <CardHeader><CardTitle>Edit Subcontractor</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={editForm.handleSubmit(onSave)} className="grid grid-cols-2 gap-4">
              <Input label="Name" {...editForm.register("name")} />
              <Input label="Code" {...editForm.register("code")} />
              <Input label="Contact Person" {...editForm.register("contact_person")} />
              <Input label="Email" type="email" {...editForm.register("email")} />
              <Input label="Phone" {...editForm.register("phone")} />
              <Input label="City" {...editForm.register("city")} />
              <Input label="GST" {...editForm.register("gst_number")} />
              <Input label="PAN" {...editForm.register("pan_number")} />
              <Input label="License" {...editForm.register("license_number")} />
              <Input label="Rating" type="number" step="0.1" {...editForm.register("rating")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Status
                </label>
                <select
                  {...editForm.register("status")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Input label="Notes" {...editForm.register("notes")} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_approved" {...editForm.register("is_approved")} />
                <label htmlFor="is_approved" className="text-sm">Approved</label>
              </div>
              <div className="col-span-2">
                {saveError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {saveError}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="submit" loading={updateSub.isPending}>Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "projects" && (
        <div className="space-y-3">
          {projects.length === 0 && (
            <Card><CardContent className="py-10 text-center text-gray-400">No projects assigned</CardContent></Card>
          )}
          {projects.map((p: any) => (
            <Card key={p.id}>
              <CardHeader>
                <Link href={`/projects/${p.project_id}`} className="hover:text-blue-600">
                  <CardTitle>{p.title}</CardTitle>
                </Link>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{p.contract_number}</span>
                  <Badge status={p.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Value</p>
                    <p className="font-medium">{formatCurrency(p.contract_value, p.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Retention</p>
                    <p className="font-medium">{p.retention_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="font-medium">{formatDate(p.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End</p>
                    <p className="font-medium">{formatDate(p.end_date)}</p>
                  </div>
                </div>
                {p.scope_of_work && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{p.scope_of_work}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "workload" && workload && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{workload.total_contracts}</p>
                <p className="text-xs text-gray-500">Total contracts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{workload.active_contracts}</p>
                <p className="text-xs text-gray-500">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{formatCurrency(workload.total_contract_value)}</p>
                <p className="text-xs text-gray-500">Contract value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{formatCurrency(workload.total_assigned_amount)}</p>
                <p className="text-xs text-gray-500">BOQ amount</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Contract details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left px-4 py-3">Contract</th>
                    <th className="text-left px-4 py-3">Value</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.contracts?.map((c: any) => (
                    <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-gray-400">{c.contract_number}</p>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(c.contract_value, c.currency)}</td>
                      <td className="px-4 py-3"><Badge status={c.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
