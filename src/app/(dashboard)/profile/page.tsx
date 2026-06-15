"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/store/auth.store";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera, Eye, EyeOff, Check,
  User, Lock, Loader2,
} from "lucide-react";

export default function ProfilePage() {
  const { user, setAuth, tenantSlug } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors } } = useForm({
    defaultValues: {
      full_name: user?.full_name ?? "",
      phone: user?.phone ?? "",
    },
  });

  const { register: regPw, handleSubmit: handlePw, reset: resetPw, watch } = useForm<{
    current_password: string;
    new_password: string;
    confirm_password: string;
  }>();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAvatarLoading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await apiClient.post("/auth/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = res.data.data;
      setAuth({ ...user!, ...updated }, tenantSlug!);
    } catch (e: any) {
      console.error("Avatar upload failed:", e);
    } finally {
      setAvatarLoading(false);
    }
  };

  const onSaveProfile = async (data: any) => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const res = await apiClient.patch("/auth/me", {
        full_name: data.full_name,
        phone: data.phone || null,
      });
      const updated = res.data.data;
      setAuth({ ...user!, ...updated }, tenantSlug!);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (e: any) {
      setProfileError(e?.response?.data?.message ?? "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (data: any) => {
    if (data.new_password !== data.confirm_password) {
      setPwError("Passwords do not match");
      return;
    }
    if (data.new_password.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(data.new_password)) {
      setPwError("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(data.new_password)) {
      setPwError("Password must contain at least one digit");
      return;
    }

    setPwLoading(true);
    setPwError("");
    try {
      await apiClient.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setPwSuccess(true);
      resetPw();
      setTimeout(() => setPwSuccess(false), 3000);
      // Update must_change_password flag in store
      setAuth({ ...user!, must_change_password: false }, tenantSlug!);
    } catch (e: any) {
      setPwError(e?.response?.data?.message ?? "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const avatarSrc = avatarPreview ?? user?.avatar_url;
  const initials = user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Profile Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal account settings
        </p>
      </div>

      {/* Avatar */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100 flex items-center gap-2">
            <User className="h-5 w-5" /> Profile photo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user?.full_name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-2xl font-bold">
                  {initials}
                </div>
              )}
              {avatarLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.full_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change photo
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                JPG, PNG, WebP — max 5MB
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfile(onSaveProfile)} className="space-y-4">
            <Input
              label="Full name"
              error={profileErrors.full_name?.message as string}
              {...regProfile("full_name", { required: "Name is required" })}
            />
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Email address
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Email address cannot be changed
              </p>
            </div>
            <Input
              label="Phone number"
              placeholder="+977 98XXXXXXXX"
              {...regProfile("phone")}
            />

            {profileError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {profileError}
              </p>
            )}

            <Button
              type="submit"
              loading={profileLoading}
              className="flex items-center gap-2"
            >
              {profileSaved ? (
                <><Check className="h-4 w-4" /> Saved!</>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100 flex items-center gap-2">
            <Lock className="h-5 w-5" /> Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePw(onChangePassword)} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...regPw("current_password", { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...regPw("new_password", { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...regPw("confirm_password", { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {pwError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Password changed successfully
                </p>
              </div>
            )}

            <Button
              type="submit"
              loading={pwLoading}
            >
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}