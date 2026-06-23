"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useDocuments, useDocumentSummary,
  useUploadDocument, useSubmitDocument,
  useDeleteDocument,
} from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Plus, Search, FileText, Download,
  Trash2, CheckCircle, Loader2,
  File, Image, FileSpreadsheet,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

const CATEGORIES = [
  "drawing", "contract", "specification", "report",
  "photo", "certificate", "permit", "invoice",
  "rfi", "submittal", "meeting_minutes", "other",
];

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  png: <Image className="h-4 w-4 text-blue-500" />,
  jpg: <Image className="h-4 w-4 text-blue-500" />,
  xlsx: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  dwg: <File className="h-4 w-4 text-purple-500" />,
};

function FileIcon({ fileType }: { fileType?: string | null }) {
  const ext = fileType?.toLowerCase() ?? "other";
  return <>{FILE_ICONS[ext] ?? <File className="h-4 w-4 text-gray-400" />}</>;
}

function formatSize(kb: number | null | undefined): string {
  if (!kb) return "—";
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
export default function DocumentsPage() {
  return (
    <PermissionGuard module="can_documents">
      <DocumentsPageContent />
    </PermissionGuard>
  );
}
function DocumentsPageContent() {
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const { data: projects } = useProjects();
  const { data: summary } = useDocumentSummary(projectId);
  const { data: docsData, isLoading, isError, error } = useDocuments(projectId, {
    search: search || undefined,
    category: categoryFilter || undefined,
  });
  const uploadDoc = useUploadDocument(projectId);
  const submitDoc = useSubmitDocument(projectId);
  const deleteDoc = useDeleteDocument(projectId);

  const { register, handleSubmit, reset } = useForm();
  const documents = docsData?.data ?? [];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-destructive text-4xl">!</div>
        <h3 className="text-lg font-semibold">Failed to load data</h3>
        <p className="text-muted-foreground text-sm">{(error as Error)?.message || "An error occurred"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drawings, contracts, certificates and project files
          </p>
        </div>
        {projectId && (
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-1" /> Upload document
          </Button>
        )}
      </div>

      {/* Project selector */}
      <select
        className="h-10 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={projectId}
        onChange={e => setProjectId(e.target.value)}
      >
        <option value="">Select a project...</option>
        {projects?.data.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
        ))}
      </select>

      {/* Summary KPIs */}
      {summary && projectId && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total documents", value: summary.total_documents },
            { label: "Drawings", value: summary.by_category?.drawing ?? 0 },
            { label: "Contracts", value: summary.by_category?.contract ?? 0 },
            { label: "Pending approvals", value: summary.pending_approvals, alert: summary.pending_approvals > 0 },
          ].map(({ label, value, alert }) => (
            <div
              key={label}
              className={`rounded-xl p-4 ${
                alert
                  ? "bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300"
                  : "bg-gray-50 dark:bg-gray-800/50"
              }`}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`text-xl font-bold mt-1 ${alert ? "text-amber-600" : "text-gray-900 dark:text-gray-100"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Upload document</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleSubmit(async d => {
                await uploadDoc.mutateAsync({
                  title: d.title,
                  category: d.category,
                  file_name: d.file_name,
                  file_url: d.file_url,
                  file_type: d.file_name?.split(".").pop() ?? "other",
                  description: d.description,
                  discipline: d.discipline,
                  drawing_number: d.drawing_number,
                  version: d.version || "1.0",
                  tags: d.tags,
                });
                reset();
                setShowUpload(false);
              })}
            >
              <Input
                label="Title"
                placeholder="Foundation layout plan"
                {...register("title", { required: true })}
              />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Category
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                  {...register("category", { required: true })}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="File name"
                placeholder="foundation-plan-v1.pdf"
                {...register("file_name", { required: true })}
              />
              <Input
                label="File URL"
                placeholder="https://..."
                {...register("file_url", { required: true })}
              />
              <Input label="Drawing number" placeholder="DWG-CIVIL-001" {...register("drawing_number")} />
              <Input label="Discipline" placeholder="Civil, Structural, MEP..." {...register("discipline")} />
              <Input label="Version" placeholder="1.0" defaultValue="1.0" {...register("version")} />
              <Input label="Tags" placeholder="foundation, basement, civil" {...register("tags")} />
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100"
                  {...register("description")}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={uploadDoc.isPending}>
                  Upload
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search + filters */}
      {projectId && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["", ...CATEGORIES.slice(0, 6)].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                  categoryFilter === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {cat || "All"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document table */}
      {projectId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Document</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Version</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Discipline</th>
                  <th className="px-4 py-3 text-right">Size</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
                    </td>
                  </tr>
                ) : !documents.length ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">
                      No documents yet — upload your first document
                    </td>
                  </tr>
                ) : documents.map((doc: any) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileIcon fileType={doc.file_type} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                            {doc.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {doc.document_number}
                            {doc.drawing_number ? ` · ${doc.drawing_number}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">
                      {doc.category?.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        v{doc.version}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge status={doc.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {doc.discipline ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">
                      {formatSize(doc.file_size_kb)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Download"
                        >
                            <Download className="h-3.5 w-3.5" />
                        </a>
                        {doc.status === "draft" && (
                          <button
                            onClick={() => submitDoc.mutate(doc.id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Submit for review"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm("Delete this document?")) {
                              deleteDoc.mutate(doc.id);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Document detail panel */}
      {selectedDoc && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="dark:text-gray-100">{selectedDoc.title}</CardTitle>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["Number", selectedDoc.document_number],
                ["Category", selectedDoc.category?.replace(/_/g, " ")],
                ["Version", `v${selectedDoc.version}`],
                ["Status", selectedDoc.status],
                ["Discipline", selectedDoc.discipline ?? "—"],
                ["Drawing no.", selectedDoc.drawing_number ?? "—"],
                ["File", selectedDoc.file_name],
                ["Size", formatSize(selectedDoc.file_size_kb)],
                ["Uploaded", formatDate(selectedDoc.created_at)],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 capitalize">
                    {value as string}
                  </p>
                </div>
              ))}
            </div>

            {selectedDoc.description && (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                {selectedDoc.description}
              </p>
            )}

            <div className="mt-4 flex gap-2">
                <a
                    href={selectedDoc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Download className="h-4 w-4" />
                    Download
                </a>
                </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}