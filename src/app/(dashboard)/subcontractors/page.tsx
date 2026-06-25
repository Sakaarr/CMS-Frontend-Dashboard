"use client";

import { useState } from "react";
import {
  useSubcontractors, useCreateSubcontractor,
  useUpdateSubcontractor, useDeleteSubcontractor,
} from "@/hooks/useSubcontractors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";
import { useForm } from "react-hook-form";
import {
  Plus, Loader2, Search, Building2, Star,
  ChevronDown, Pencil, Trash2,
} from "lucide-react";

const SPECIALTIES = [
  "structural", "electrical", "plumbing", "hvac",
  "finishing", "roofing", "painting", "landscaping", "general", "other",
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  blacklisted: "bg-red-100 text-red-700",
};

export default function SubcontractorsPage() {
  return (
    <PermissionGuard module="can_subcontractors">
      <SubcontractorsContent />
    </PermissionGuard>
  );
}

function SubcontractorsContent() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");

  const { data, isLoading, isError, error } = useSubcontractors({
    search: search || undefined,
    specialty: specialty || undefined,
  });
  const createSub = useCreateSubcontractor();
  const updateSub = useUpdateSubcontractor();
  const deleteSub = useDeleteSubcontractor();

  const { register, handleSubmit, reset } = useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const onSubmit = async (formData: any) => {
    await createSub.mutateAsync(formData);
    reset();
    setShowCreate(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
        {error instanceof Error ? error.message : "Failed to load subcontractors"}
      </div>
    );
  }

  const subs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Subcontractors</h1>
          <p className="text-sm text-gray-500">Manage subcontractor vendors and contracts</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} loading={createSub.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {showCreate ? "Cancel" : "Add Subcontractor"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Subcontractor</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <Input label="Name *" {...register("name", { required: true })} />
              <Input label="Code *" {...register("code", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Specialty *
                </label>
                <select
                  {...register("specialty", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <Input label="Contact Person" {...register("contact_person")} />
              <Input label="Email" type="email" {...register("email")} />
              <Input label="Phone" {...register("phone")} />
              <Input label="City" {...register("city")} />
              <Input label="GST Number" {...register("gst_number")} />
              <Input label="PAN Number" {...register("pan_number")} />
              <Input label="License Number" {...register("license_number")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="submit" loading={createSub.isPending}>Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search subcontractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="">All Specialties</option>
          {SPECIALTIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {subs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No subcontractors yet</p>
          <p className="text-sm">Add your first subcontractor to get started</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name/Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Specialty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Rating</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub: any) => (
                  <tr key={sub.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{sub.name}</p>
                      <p className="text-xs text-gray-400">{sub.code}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{sub.specialty}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-gray-100">{sub.contact_person || "-"}</p>
                      <p className="text-xs text-gray-400">{sub.email || sub.phone || ""}</p>
                    </td>
                    <td className="px-4 py-3">{sub.city || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge status={sub.status} label={sub.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400" />
                        {sub.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          onClick={() => deleteSub.mutate(sub.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
