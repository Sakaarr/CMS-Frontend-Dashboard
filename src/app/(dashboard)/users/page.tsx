"use client";

import { useState } from "react";
import {
  useUsers, useCreateUser, useUpdateUser,
  useUpdatePermissions, useDeactivateUser,
  useResetUserPassword,
} from "@/hooks/useUsers";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ModulePermissions } from "@/store/permissions.store";
import type { TenantUser } from "@/hooks/useUsers";
import {
  Plus, Mail, KeyRound, UserX,
  Settings, ChevronDown, ChevronUp,
  Loader2, Shield, CheckCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";

const ROLES = [
  { value: "company_admin", label: "Company Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "site_engineer", label: "Site Engineer / Supervisor" },
  { value: "finance", label: "Finance / Accounts" },
  { value: "procurement", label: "Procurement Officer" },
  { value: "qa_officer", label: "QA / Safety Officer" },
  { value: "viewer", label: "Viewer (read-only)" },
];

const MODULES: { key: keyof ModulePermissions; label: string; emoji: string }[] = [
  { key: "can_projects", label: "Projects", emoji: "📁" },
  { key: "can_boq", label: "BOQ & Estimation", emoji: "📊" },
  { key: "can_procurement", label: "Procurement", emoji: "🛒" },
  { key: "can_inventory", label: "Inventory", emoji: "📦" },
  { key: "can_site_ops", label: "Site Operations", emoji: "🏗️" },
  { key: "can_finance", label: "Finance", emoji: "💰" },
  { key: "can_quality", label: "Quality & Safety", emoji: "🛡️" },
  { key: "can_documents", label: "Documents", emoji: "📂" },
];

const ROLE_COLORS: Record<string, string> = {
  company_admin: "bg-purple-100 text-purple-700",
  project_manager: "bg-blue-100 text-blue-700",
  site_engineer: "bg-green-100 text-green-700",
  finance: "bg-indigo-100 text-indigo-700",
  procurement: "bg-orange-100 text-orange-700",
  qa_officer: "bg-teal-100 text-teal-700",
  viewer: "bg-gray-100 text-gray-600",
};

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updatePerms = useUpdatePermissions();
  const deactivateUser = useDeactivateUser();
  const resetPassword = useResetUserPassword();

  const [showCreate, setShowCreate] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<string | null>(null);
  const [localPerms, setLocalPerms] = useState<ModulePermissions | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleCreateUser = async (data: any) => {
    await createUser.mutateAsync({
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || undefined,
      role: data.role,
    });
    reset();
    setShowCreate(false);
  };

  const handleStartEditPerms = (user: TenantUser) => {
    setEditingPerms(user.id);
    setLocalPerms(user.permissions ?? {
      can_projects: true, can_boq: false, can_procurement: false,
      can_inventory: false, can_site_ops: false, can_finance: false,
      can_quality: false, can_documents: false,
    });
  };

  const handleSavePerms = async (userId: string) => {
    if (!localPerms) return;
    await updatePerms.mutateAsync({ userId, permissions: localPerms });
    setEditingPerms(null);
    setLocalPerms(null);
  };

  const togglePerm = (key: keyof ModulePermissions) => {
    if (!localPerms) return;
    // can_projects is always required — can't remove
    if (key === "can_projects") return;
    setLocalPerms(prev => prev ? { ...prev, [key]: !prev[key] } : prev);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {users?.length ?? 0} users in your organisation
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add user
        </Button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Create new user</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(handleCreateUser)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Input
                label="Full name"
                placeholder="Ramesh Sharma"
                error={errors.full_name?.message as string}
                {...register("full_name", { required: "Required" })}
              />
              <Input
                label="Email address"
                type="email"
                placeholder="ramesh@company.com"
                error={errors.email?.message as string}
                {...register("email", { required: "Required" })}
              />
              <Input
                label="Phone (optional)"
                placeholder="+977 98XXXXXXXX"
                {...register("phone")}
              />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Role
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("role", { required: "Required" })}
                >
                  <option value="">Select role...</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Credentials will be emailed to the user automatically. You can customise their module permissions after creation.
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => { setShowCreate(false); reset(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={createUser.isPending}>
                  Create user & send credentials
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {users?.map(user => (
            <Card key={user.id} className="dark:bg-gray-900 dark:border-gray-800">
              {/* User row */}
              <div className="flex items-center justify-between p-5 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold flex-shrink-0">
                    {user.full_name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.full_name}
                      </p>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">(you)</span>
                      )}
                      {user.must_change_password && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          <KeyRound className="h-3 w-3" /> Must change password
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Role badge */}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {user.role?.replace(/_/g, " ")}
                  </span>

                  {/* Active status */}
                  {user.is_active ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-red-500">Inactive</span>
                  )}

                  {/* Actions */}
                  {user.id !== currentUser?.id && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEditPerms(user)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        title="Edit permissions"
                      >
                        <Shield className="h-3.5 w-3.5" /> Permissions
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Reset password for ${user.full_name}? New credentials will be emailed.`)) {
                            resetPassword.mutate(user.id);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        title="Reset password"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate ${user.full_name}? They will lose all access.`)) {
                              deactivateUser.mutate(user.id);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Deactivate user"
                        >
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {expandedUser === user.id
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Expanded: permissions panel */}
              {expandedUser === user.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
                  {editingPerms === user.id ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Module access — {user.full_name}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
                        {MODULES.map(({ key, label, emoji }) => {
                          const isOn = localPerms?.[key] ?? false;
                          const isForced = key === "can_projects";
                          return (
                            <button
                              key={key}
                              onClick={() => !isForced && togglePerm(key)}
                              disabled={isForced}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                                isOn
                                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                              } ${isForced ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:opacity-80"}`}
                            >
                              <span>{emoji}</span>
                              <span className="truncate">{label}</span>
                              {isOn && <CheckCircle className="h-3.5 w-3.5 ml-auto flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={updatePerms.isPending}
                          onClick={() => handleSavePerms(user.id)}
                        >
                          Save permissions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingPerms(null); setLocalPerms(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Module access
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MODULES.map(({ key, label, emoji }) => {
                          const hasAccess = user.permissions?.[key] ?? false;
                          return (
                            <span
                              key={key}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                hasAccess
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 line-through"
                              }`}
                            >
                              {emoji} {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}

          {users?.length === 0 && (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                No users yet — add your first team member
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}