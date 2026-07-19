"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Bell, Globe, Loader2, Moon, RefreshCcw, Save, Settings2, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  useCustomerPreferences,
  useUpdateCustomerPreferences,
} from "@/features/preferences/hooks/use-customer-preferences";
import { useLanguageStore } from "@/shared/store/language.store";
import type { CustomerPreferences } from "@/entities/preferences";

export default function CustomerSettingsPage() {
  const getErrorMessage = useErrorMessage();
  const preferencesQuery = useCustomerPreferences();
  const updatePreferencesMutation = useUpdateCustomerPreferences();
  const [form, setForm] = useState<CustomerPreferences | null>(null);

  const { setTheme } = useTheme();
  const { setLanguage } = useLanguageStore();

  useEffect(() => {
    if (preferencesQuery.data) {
      setForm(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  const hasChanges = Boolean(
    form &&
      preferencesQuery.data &&
      JSON.stringify(form) !== JSON.stringify(preferencesQuery.data),
  );

  function handleLanguageChange(value: string) {
    setForm((current) => current ? { ...current, language: value as "VI" | "EN" } : current);
    setLanguage(value.toLowerCase() as "vi" | "en");
  }

  function handleThemeChange(value: string) {
    setForm((current) => current ? { ...current, theme: value as "LIGHT" | "DARK" } : current);
    setTheme(value.toLowerCase());
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Account settings</CardTitle>
            <CardDescription className="mt-1">Manage your display and notification preferences.</CardDescription>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-teal-700">
            <Settings2 className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => preferencesQuery.refetch()} className="rounded-xl gap-2">
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {preferencesQuery.isPending || !form ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : preferencesQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getErrorMessage(preferencesQuery.error)}
            </div>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2">

                {/* Display preferences */}
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-bold">Display preferences</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* Language */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "VI", label: "Tiếng Việt", flag: "🇻🇳" },
                          { value: "EN", label: "English", flag: "🇬🇧" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleLanguageChange(opt.value)}
                            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                              form.language === opt.value
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-border bg-card text-foreground hover:border-primary/40"
                            }`}
                          >
                            <span className="text-base">{opt.flag}</span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theme */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "LIGHT", label: "Light", icon: Sun },
                          { value: "DARK", label: "Dark", icon: Moon },
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleThemeChange(value)}
                            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                              form.theme === value
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-border bg-card text-foreground hover:border-primary/40"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* Notification preferences */}
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-bold">Notification preferences</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { key: "notificationsEnabled" as const, label: "Enable all notifications", description: "Master toggle for all in-app alerts" },
                      { key: "emailNotifications" as const, label: "Email notifications", description: "Receive booking updates via email" },
                    ].map(({ key, label, description }) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 transition-colors hover:bg-slate-100/60"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <div className="relative mt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={form[key]}
                            onChange={(e) => setForm((current) => current ? { ...current, [key]: e.target.checked } : current)}
                            className="peer sr-only"
                          />
                          <div className={`h-5 w-9 rounded-full transition-colors ${form[key] ? "bg-primary" : "bg-slate-300"}`} />
                          <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form[key] ? "translate-x-4" : ""}`} />
                        </div>
                      </label>
                    ))}
                  </CardContent>
                </Card>

              </div>

              {updatePreferencesMutation.isError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getErrorMessage(updatePreferencesMutation.error)}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={!hasChanges || updatePreferencesMutation.isPending}
                  onClick={async () => {
                    if (!form) return;
                    try {
                      await updatePreferencesMutation.mutateAsync(form);
                      toast.success("Settings saved.");
                    } catch (error) {
                      toast.error(getErrorMessage(error));
                    }
                  }}
                  className="rounded-xl gap-2"
                >
                  {updatePreferencesMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />}
                  Save settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
