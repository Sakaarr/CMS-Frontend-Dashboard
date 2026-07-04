"use client";

import { useState } from "react";
import { useCostCodes, useCreateCostCode } from "@/hooks/useBoq";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

const CATEGORIES = ["civil", "structural", "architectural", "mep", "finishing", "external", "preliminary", "other"] as const;
const UNITS = ["sqm", "cum", "rmt", "nos", "kg", "mt", "lit", "bag", "ls", "day", "hour", "percent"] as const;

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [color-scheme:light] dark:[color-scheme:dark]"
        {...props}
      />
    </div>
  );
}

const selectClass = "h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";

export default function CostCodesPage() {
  return (
    <PermissionGuard module="can_boq">
      <CostCodesContent />
    </PermissionGuard>
  );
}

function CostCodesContent() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data: codes, isLoading } = useCostCodes(search || undefined);
  const createCostCode = useCreateCostCode();
  const { register, handleSubmit, reset } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cost Codes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Master list of cost codes for BOQ estimation</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? "Cancel" : "New Cost Code"}
        </Button>
      </div>

      {showForm && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="pt-6">
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-4"
              onSubmit={handleSubmit(async (d) => {
                await createCostCode.mutateAsync({
                  code: d.code,
                  name: d.name,
                  description: d.description,
                  category: d.category || "other",
                  unit: d.unit || "nos",
                  standard_rate: parseFloat(d.standard_rate) || undefined,
                });
                reset();
                setShowForm(false);
              })}
            >
              <Field label="Code" placeholder="CIVIL-001" {...register("code", { required: true })} />
              <Field label="Name" placeholder="Earthwork Excavation" {...register("name", { required: true })} />
              <Field label="Description" placeholder="Optional description" {...register("description")} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select className={selectClass} {...register("category")}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit</label>
                <select className={selectClass} {...register("unit")}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <Field label="Standard Rate (NPR)" type="number" placeholder="0" {...register("standard_rate")} />
              <div className="flex items-end gap-2">
                <Button type="submit" loading={createCostCode.isPending} size="sm">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search cost codes..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">{codes?.length ?? 0} cost codes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Unit</th>
                  <th className="px-4 py-3 text-right">Standard Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
                    </td>
                  </tr>
                ) : codes?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 dark:text-gray-500">
                      No cost codes yet — create your first one
                    </td>
                  </tr>
                ) : codes?.map(cc => (
                  <tr key={cc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{cc.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{cc.name}</td>
                    <td className="px-4 py-3"><Badge status={cc.category} /></td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{cc.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{cc.standard_rate?.toLocaleString() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
