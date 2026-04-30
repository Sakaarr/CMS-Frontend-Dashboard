"use client";

import { useState } from "react";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Planning", value: "planning" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

export default function ProjectsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useProjects({ status: status || undefined, search });
  const createProject = useCreateProject();
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (formData: any) => {
    await createProject.mutateAsync(formData);
    reset();
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} projects total
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> New project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                status === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              New project
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <Input label="Project name" placeholder="Kathmandu Office Block" {...register("name", { required: true })} />
              <Input label="Project code" placeholder="PRJ-001" {...register("code", { required: true })} />
              <Input label="Client name" placeholder="Client Ltd" {...register("client_name")} />
              <Input label="City" placeholder="Kathmandu" {...register("city")} />
              <Input label="Estimated budget (NPR)" type="number" placeholder="5000000" {...register("estimated_budget", { valueAsNumber: true })} />
              <Input label="Planned start date" type="date" {...register("planned_start_date")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={createProject.isPending}>Create project</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Start date</th>
                <th className="px-6 py-3">End date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No projects found
                  </td>
                </tr>
              ) : (
                data?.data.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${project.id}`} className="hover:text-blue-600">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.code} · {project.city ?? "—"}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4"><Badge status={project.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-gray-200">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${project.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{project.progress_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {project.estimated_budget
                        ? formatCurrency(project.estimated_budget, project.currency)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(project.planned_start_date)}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(project.planned_end_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}