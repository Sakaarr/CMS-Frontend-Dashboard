"use client";

import { useProjectStats, useProjects } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FolderKanban, TrendingUp, DollarSign,
  CheckCircle2, Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  planning: "#60a5fa",
  active: "#34d399",
  on_hold: "#fbbf24",
  completed: "#10b981",
  cancelled: "#f87171",
};

export default function OverviewPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useProjectStats();
  const { data: projects, isLoading: projectsLoading } = useProjects({
    page: 1,
  });

  const chartData = stats
    ? Object.entries(stats.by_status).map(([status, count]) => ({
        status: status.replace("_", " "),
        count,
        fill: STATUS_COLORS[status] ?? "#94a3b8",
      }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening across your projects today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Projects"
          value={statsLoading ? "—" : String(stats?.total ?? 0)}
          icon={<FolderKanban className="h-5 w-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <KPICard
          title="Active Projects"
          value={statsLoading ? "—" : String(stats?.by_status?.active ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          bg="bg-green-50"
        />
        <KPICard
          title="Active Budget"
          value={
            statsLoading
              ? "—"
              : formatCurrency(stats?.active_budget_total ?? 0)
          }
          icon={<DollarSign className="h-5 w-5 text-purple-600" />}
          bg="bg-purple-50"
        />
        <KPICard
          title="Completed"
          value={
            statsLoading ? "—" : String(stats?.by_status?.completed ?? 0)
          }
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          bg="bg-emerald-50"
        />
      </div>

      {/* Chart + Recent Projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={36}>
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent projects</CardTitle>
              <Link
                href="/projects"
                className="text-xs text-blue-600 hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {projects?.data.slice(0, 5).map((project) => (
                  <li key={project.id} className="py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between hover:opacity-80"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {project.code} · {project.city ?? "—"}
                        </p>
                      </div>
                      <Badge status={project.status} />
                    </Link>
                  </li>
                ))}
                {!projects?.data.length && (
                  <li className="py-8 text-center text-sm text-gray-400">
                    No projects yet
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  title, value, icon, bg,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}