"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  useBrandingStore, useUploadLogo, useUpdateColors,
} from "@/hooks/useBranding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload, Palette, Building2, Check, Loader2,
} from "lucide-react";

const PRESET_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#ea580c", "#d97706", "#16a34a", "#0891b2",
  "#0f172a", "#374151",
];

export default function CompanySettingsPage() {
  const { user } = useAuthStore();
  const { branding } = useBrandingStore();
  const uploadLogo = useUploadLogo();
  const updateColors = useUpdateColors();

  const fileRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimaryColor] = useState(
    branding?.primary_color ?? "#2563eb"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    branding?.secondary_color ?? "#1e40af"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [colorSaved, setColorSaved] = useState(false);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    await uploadLogo.mutateAsync(file);
  };

  const handleSaveColors = async () => {
    await updateColors.mutateAsync({
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });
    setColorSaved(true);
    setTimeout(() => setColorSaved(false), 2000);

    // Apply immediately
    document.documentElement.style.setProperty("--brand-primary", primaryColor);
    document.documentElement.style.setProperty("--brand-secondary", secondaryColor);
  };

  const logoSrc = previewUrl ?? branding?.logo_url;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Company Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your organisation's branding. Changes apply to all team members.
        </p>
      </div>

      {/* Logo */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100 flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Organisation Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            {/* Preview */}
            <div className="relative flex-shrink-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt="Company logo"
                  className="h-24 w-24 rounded-xl object-contain border border-gray-200 dark:border-gray-700 bg-white p-2"
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 className="h-10 w-10 text-white" />
                </div>
              )}
              {uploadLogo.isPending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Upload area */}
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoSelect}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadLogo.isPending}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full justify-center"
              >
                <Upload className="h-4 w-4" />
                {uploadLogo.isPending ? "Uploading..." : "Click to upload logo"}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                PNG, JPG, WebP, SVG — max 5MB. Recommended: square, min 256×256px
              </p>
              {uploadLogo.isSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center flex items-center justify-center gap-1">
                  <Check className="h-3 w-3" /> Logo updated for all team members
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100 flex items-center gap-2">
            <Palette className="h-5 w-5" /> Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary color */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3">
              Primary color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700 p-0.5 bg-transparent"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setPrimaryColor(v);
                }}
                className="h-10 w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#2563eb"
              />
              {/* Preview swatch */}
              <div
                className="h-10 w-10 rounded-lg shadow-sm"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
            {/* Presets */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPrimaryColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    primaryColor === c ? "ring-2 ring-offset-2 ring-gray-400" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Secondary color */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3">
              Secondary color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700 p-0.5 bg-transparent"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setSecondaryColor(v);
                }}
                className="h-10 w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#1e40af"
              />
              <div
                className="h-10 w-10 rounded-lg shadow-sm"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>

          {/* Preview banner */}
          <div
            className="rounded-lg p-4 text-white text-sm font-medium flex items-center gap-3"
            style={{ backgroundColor: primaryColor }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: secondaryColor }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold">{branding?.name ?? "Your Company"}</p>
              <p style={{ opacity: 0.8, fontSize: 12 }}>
                Brand color preview — visible in sidebar and buttons
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveColors}
            loading={updateColors.isPending}
            className="flex items-center gap-2"
          >
            {colorSaved ? (
              <><Check className="h-4 w-4" /> Saved!</>
            ) : (
              <>Save brand colors</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Org info (read-only summary) */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Organisation info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Name", branding?.name],
              ["Slug", branding?.slug],
              ["Plan", branding?.plan],
              ["Currency", branding?.currency],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100 capitalize mt-0.5">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}