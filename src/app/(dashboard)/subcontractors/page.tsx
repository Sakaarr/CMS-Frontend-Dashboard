"use client";

import { useEffect, useState } from "react";
import {
  useSubcontractors, useSubcontractor, useCreateSubcontractor,
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
  Pencil, Trash2, X, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { extractApiError } from "@/lib/api";

const STATUS_OPTIONS = ["active", "inactive", "blacklisted"];

const SPECIALTIES = [
  "structural", "electrical", "plumbing", "hvac",
  "finishing", "roofing", "painting", "landscaping", "general", "other",
];

export default function SubcontractorsPage() {
  return (
    <PermissionGuard module="can_subcontractors">
      <SubcontractorsContent />
    </PermissionGuard>
  );
}

function SubcontractorsContent() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useSubcontractors({
    search: search || undefined,
    specialty: specialty || undefined,
  });
  const { data: editData } = useSubcontractor(editingId ?? "");
  const createSub = useCreateSubcontractor();
  const updateSub = useUpdateSubcontractor();
  const deleteSub = useDeleteSubcontractor();

  const createForm = useForm();
  const editForm = useForm();

  const onCreateSubmit = async (formData: any) => {
    try {
      setCreateError(null);
      await createSub.mutateAsync(formData);
      createForm.reset();
      setShowCreate(false);
    } catch (err) {
      setCreateError(extractApiError(err));
    }
  };

  const onEditSubmit = async (formData: any) => {
    if (!editingId) return;
    try {
      setEditError(null);
      await updateSub.mutateAsync({ id: editingId, data: formData });
      editForm.reset();
      setEditingId(null);
    } catch (err) {
      setEditError(extractApiError(err));
    }
  };

  const openEdit = (sub: any) => {
    setEditingId(sub.id);
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
  };

  const closeEdit = () => {
    setEditingId(null);
    editForm.reset();
    setEditError(null);
  };

  useEffect(() => {
    if (editData && editingId) {
      editForm.reset({
        name: editData.name,
        code: editData.code,
        specialty: editData.specialty,
        status: editData.status ?? "active",
        contact_person: editData.contact_person ?? "",
        email: editData.email ?? "",
        phone: editData.phone ?? "",
        city: editData.city ?? "",
        gst_number: editData.gst_number ?? "",
        pan_number: editData.pan_number ?? "",
        license_number: editData.license_number ?? "",
        rating: editData.rating,
        notes: editData.notes ?? "",
        is_approved: editData.is_approved,
      });
    }
  }, [editData, editingId, editForm]);

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
            {createError && (
              <div className="col-span-2 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {createError}
              </div>
            )}
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="grid grid-cols-2 gap-4">
              <Input label="Name *" {...createForm.register("name", { required: true })} />
              <Input label="Code *" {...createForm.register("code", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Specialty *
                </label>
                <select
                  {...createForm.register("specialty", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <Input label="Contact Person" {...createForm.register("contact_person")} />
              <Input label="Email" type="email" {...createForm.register("email")} />
              <Input label="Phone" {...createForm.register("phone")} />
              <Input label="City" {...createForm.register("city")} />
              <Input label="GST Number" {...createForm.register("gst_number")} />
              <Input label="PAN Number" {...createForm.register("pan_number")} />
              <Input label="License Number" {...createForm.register("license_number")} />
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Phone/Email</th>
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
                      <Link href={`/subcontractors/${sub.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600">
                        {sub.name}
                      </Link>
                      <p className="text-xs text-gray-400">{sub.code}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{sub.specialty}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-gray-100">{sub.phone || sub.email || "-"}</p>
                      <p className="text-xs text-gray-400">{sub.contact_person || sub.email || ""}</p>
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
                        <button
                          className="rounded p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          onClick={() => openEdit(sub)}
                        >
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

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Edit Subcontractor</CardTitle>
              <button onClick={closeEdit} className="rounded p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid grid-cols-2 gap-4">
                <Input label="Name *" {...editForm.register("name", { required: true })} />
                <Input label="Code *" {...editForm.register("code", { required: true })} />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Specialty *
                  </label>
                  <select
                    {...editForm.register("specialty", { required: true })}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <Input label="Contact Person" {...editForm.register("contact_person")} />
                <Input label="Email" type="email" {...editForm.register("email")} />
                <Input label="Phone" {...editForm.register("phone")} />
                <Input label="City" {...editForm.register("city")} />
                <Input label="GST Number" {...editForm.register("gst_number")} />
                <Input label="PAN Number" {...editForm.register("pan_number")} />
                <Input label="License Number" {...editForm.register("license_number")} />
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
                  <label htmlFor="is_approved" className="text-sm text-gray-700 dark:text-gray-300">Approved</label>
                </div>
                <div className="col-span-2">
                  {editError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {editError}
                    </div>
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
                  <Button type="submit" loading={updateSub.isPending}>Update</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
