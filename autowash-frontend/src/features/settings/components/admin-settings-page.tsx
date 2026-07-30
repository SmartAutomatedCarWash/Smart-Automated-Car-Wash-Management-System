"use client";

import { useState, useEffect } from "react";
import { Settings2, Loader2, Save, Clock, Calendar, Coins, Trophy, ChevronDown, ChevronRight, Trash2, Medal, Crown, Diamond, Star, Plus } from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Button } from "@/shared/ui/ui/button";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useSystemSettings, useUpdateSystemSettings } from "@/features/settings/hooks/use-admin-settings";
import { useCreateTierConfig, useDeleteTierConfig, useTierConfigs, useUpdateTierConfig } from "@/features/settings/hooks/use-admin-tiers";
import { getManagerSettings, updateWeeklyStaffKpiTarget } from "@/features/operations/lib/manager-settings-service";
import type { SystemSettings } from "@/features/settings/lib/admin-settings-service";
import { uploadTierImage, type TierConfig } from "@/features/settings/lib/admin-tiers-service";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useLanguageStore } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";

const ADMIN_SETTINGS_COPY = {
  vi: {
    title: "Cài đặt Hệ thống",
    lastUpdated: "Cập nhật lần cuối",
    successMsg: "Lưu cài đặt thành công.",
    saveBtn: "Lưu cài đặt",
    operatingHours: {
      title: "Giờ hoạt động",
      desc: "Giờ mở cửa để nhận đặt lịch.",
      open: "Giờ mở cửa (HH:mm)",
      close: "Giờ đóng cửa (HH:mm)",
    },
    bookingRules: {
      title: "Quy tắc Đặt lịch",
      desc: "Quy định về thời gian đặt trước tối đa và chính sách vắng mặt.",
      maxAdvance: "Đặt trước tối đa (ngày)",
      noShowGrace: "Thời gian chờ vắng mặt (phút)",
      maxPerSlot: "Số booking tối đa mỗi khung 1 giờ",
    },
    currencyPoints: {
      title: "Tiền tệ & Điểm",
      desc: "Cấu hình tiền tệ và quy tắc tích lũy/đổi điểm thưởng.",
      currency: "Tiền tệ",
      earnPerVnd: "VNĐ để được 1 điểm",
    },
    loyaltyTiers: {
      title: "Hạng Thành viên",
      desc: "Mốc điểm (tổng điểm tích lũy) và hệ số nhân điểm cho từng hạng.",
      bronze: "Đồng",
      silver: "Bạc",
      gold: "Vàng",
      platinum: "Bạch kim",
      diamond: "Kim cương",
      threshold: "Mốc điểm (điểm)",
      multiplier: "Hệ số nhân điểm",
      priorityScore: "Mức độ ưu tiên",
      advanceDays: "Đặt trước tối đa (ngày)",
      name: "Tên hạng",
      code: "Mã hạng",
      rank: "Cấp bậc",
      image: "Ảnh hạng",
      active: "Hoạt động",
      create: "Tạo hạng",
      createNew: "Thêm hạng mới",
      delete: "Xoá hạng",
      priorityLevels: {
        30: "Cao",
        20: "Trung bình",
        10: "Bình thường",
        0: "Không"
      },
      save: "Lưu hạng",
    },
  },
  en: {
    title: "System Settings",
    lastUpdated: "Last updated",
    successMsg: "Settings saved successfully.",
    saveBtn: "Save settings",
    operatingHours: {
      title: "Operating Hours",
      desc: "Business hours for accepting bookings.",
      open: "Open time (HH:mm)",
      close: "Close time (HH:mm)",
    },
    bookingRules: {
      title: "Booking Rules",
      desc: "Rules governing how far in advance customers can book and no-show policies.",
      maxAdvance: "Max advance booking (days)",
      noShowGrace: "No-show grace (minutes)",
      maxPerSlot: "Max bookings per 1-hour slot",
    },
    currencyPoints: {
      title: "Currency & Points",
      desc: "Configure currency and the loyalty points earning/redemption rules.",
      currency: "Currency",
      earnPerVnd: "VND per earned point",
    },
    staffKpi: {
      title: "Staff KPI",
      desc: "Adjust the weekly KPI target used across manager and staff reporting.",
      target: "Weekly completed sessions target",
      save: "Save KPI target",
    },
    loyaltyTiers: {
      title: "Loyalty Tiers",
      desc: "Tier thresholds (total earned points) and point multipliers for each tier.",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
      diamond: "Diamond",
      threshold: "Threshold (points)",
      multiplier: "Point multiplier",
      priorityScore: "Priority level",
      advanceDays: "Max advance booking (days)",
      name: "Tier name",
      code: "Tier code",
      rank: "Rank",
      image: "Tier image",
      active: "Active",
      create: "Create tier",
      createNew: "Add new tier",
      delete: "Delete tier",
      priorityLevels: {
        30: "High",
        20: "Medium",
        10: "Normal",
        0: "None"
      },
      save: "Save",
    },
  },
};

type SettingsForm = Omit<SystemSettings, "updatedAt">;

function toForm(data: SystemSettings): SettingsForm {
  return {
    operatingStartTime: data.operatingStartTime,
    operatingEndTime: data.operatingEndTime,
    maxAdvanceBookingDays: data.maxAdvanceBookingDays,
    noShowGraceMinutes: data.noShowGraceMinutes,
    maxBookingsPerTimeSlot: data.maxBookingsPerTimeSlot ?? 3,
    currency: data.currency,
    earnPointsUnitAmount: data.earnPointsUnitAmount,
    redemptionVoucherExpirationDays: data.redemptionVoucherExpirationDays,
  };
}

export function AdminSettingsPage() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const copy = (ADMIN_SETTINGS_COPY[language as keyof typeof ADMIN_SETTINGS_COPY] || ADMIN_SETTINGS_COPY.vi) as any;
  const staffKpiCopy = copy.staffKpi ?? {
    title: "Staff KPI",
    desc: "Adjust the weekly KPI target used across manager and staff reporting.",
    target: "Weekly completed sessions target",
    save: "Save KPI target",
  };
  const settingsQuery = useSystemSettings();
  const updateMutation = useUpdateSystemSettings();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const managerSettingsQuery = useQuery({
    queryKey: ["admin-settings", "manager-settings"],
    queryFn: getManagerSettings,
    refetchInterval: 30_000,
  });
  const [weeklyStaffKpiTarget, setWeeklyStaffKpiTarget] = useState(40);
  const updateWeeklyKpiMutation = useMutation({
    mutationFn: updateWeeklyStaffKpiTarget,
    onSuccess: (data) => {
      setWeeklyStaffKpiTarget(data.settings.weeklyStaffKpiTarget);
      notify.success(copy.successMsg);
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm(toForm(settingsQuery.data));
    }
  }, [settingsQuery.data, form]);

  useEffect(() => {
    if (managerSettingsQuery.data?.settings) {
      setWeeklyStaffKpiTarget(managerSettingsQuery.data.settings.weeklyStaffKpiTarget);
    }
  }, [managerSettingsQuery.data]);

  function updateField<K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave() {
    if (!form) return;
    try {
      await updateMutation.mutateAsync(form);
      notify.success(copy.successMsg);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  }

  return (
    <WorkspacePage>
      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{copy.title}</CardTitle>
              {settingsQuery.data?.updatedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.lastUpdated}: {new Date(settingsQuery.data.updatedAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {settingsQuery.isPending ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : settingsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getErrorMessage(settingsQuery.error)}
            </div>
          ) : form ? (
            <div className="space-y-4">
              {/* Operating Hours */}
              <SettingsSection icon={Clock} title={copy.operatingHours.title} description={copy.operatingHours.desc}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldTimeSelect label={copy.operatingHours.open} value={form.operatingStartTime} onChange={(v) => updateField("operatingStartTime", v)} />
                  <FieldTimeSelect label={copy.operatingHours.close} value={form.operatingEndTime} onChange={(v) => updateField("operatingEndTime", v)} />
                </div>
              </SettingsSection>

              {/* Booking Rules */}
              <SettingsSection icon={Calendar} title={copy.bookingRules.title} description={copy.bookingRules.desc}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FieldSelect
                    label={copy.bookingRules.maxAdvance}
                    value={form.maxAdvanceBookingDays}
                    options={[1, 3, 5, 7, 14, 30, 60, 90].map((d) => ({ label: String(d), value: d }))}
                    onChange={(v) => updateField("maxAdvanceBookingDays", v)}
                  />
                  <FieldSelect
                    label={copy.bookingRules.noShowGrace}
                    value={form.noShowGraceMinutes}
                    options={[5, 10, 15, 20, 30, 45, 60].map((m) => ({ label: String(m), value: m }))}
                    onChange={(v) => updateField("noShowGraceMinutes", v)}
                  />
                  <FieldSelect
                    label={copy.bookingRules.maxPerSlot}
                    value={form.maxBookingsPerTimeSlot}
                    options={[1, 2, 3, 4, 5, 6, 8, 10].map((s) => ({ label: String(s), value: s }))}
                    onChange={(v) => updateField("maxBookingsPerTimeSlot", v)}
                  />
                </div>
              </SettingsSection>

              {/* Currency */}
              <SettingsSection icon={Coins} title={copy.currencyPoints.title} description={copy.currencyPoints.desc}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldFormattedCurrency label={copy.currencyPoints.earnPerVnd} value={form.earnPointsUnitAmount} onChange={(v) => updateField("earnPointsUnitAmount", v)} />
                </div>
              </SettingsSection>

              <SettingsSection icon={Trophy} title={staffKpiCopy.title} description={staffKpiCopy.desc}>
                {managerSettingsQuery.isPending ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : managerSettingsQuery.isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {getErrorMessage(managerSettingsQuery.error)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-w-md">
                      <FieldNumber
                        label={staffKpiCopy.target}
                        value={weeklyStaffKpiTarget}
                        onChange={setWeeklyStaffKpiTarget}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" disabled={updateWeeklyKpiMutation.isPending} onClick={() => updateWeeklyKpiMutation.mutate({ weeklyStaffKpiTarget })}>
                        {updateWeeklyKpiMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {staffKpiCopy.save}
                      </Button>
                    </div>
                  </div>
                )}
              </SettingsSection>

              {/* Loyalty Tiers */}
              <LoyaltyTiersSection copy={copy} />

              {/* Save button */}
              {updateMutation.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getErrorMessage(updateMutation.error)}
                </div>
              ) : null}
              <div className="flex justify-end border-t border-border/60 pt-6">
                <Button type="button" disabled={updateMutation.isPending} onClick={handleSave}>
                  {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {copy.saveBtn}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </WorkspacePage>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="rounded-xl border border-border/40 bg-card shadow-sm transition-all">
      <div 
        className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-border/40 p-4 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}

// Generate hourly options from 06:00 to 23:00
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6; // 06 → 23
  const label = `${String(h).padStart(2, "0")}:00`;
  return { value: label, label };
});

function FieldTimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">{label}</label>
      <select
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
        style={{
          backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.7rem top 50%",
          backgroundSize: "0.65rem auto",
        }}
      >
        {HOUR_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FieldFormattedCurrency({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [displayValue, setDisplayValue] = useState(() => value ? value.toLocaleString("vi-VN") : "");

  useEffect(() => {
    setDisplayValue(value ? value.toLocaleString("vi-VN") : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setDisplayValue("");
      onChange(0);
      return;
    }
    const num = parseInt(rawValue, 10);
    setDisplayValue(num.toLocaleString("vi-VN"));
    onChange(num);
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          id={fieldId}
          name={fieldId}
          type="text"
          value={displayValue}
          disabled={disabled}
          onChange={handleChange}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 pr-28 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground whitespace-nowrap">
          VND = 1 Point
        </span>
      </div>
    </div>
  );
}

function FieldNumber({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        id={fieldId}
        name={fieldId}
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function FieldSelect({ label, value, options, onChange, disabled }: { label: string; value: number; options: { label: string, value: number }[]; onChange: (v: number) => void; disabled?: boolean }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-muted-foreground">{label}</label>
      <select
        id={fieldId}
        name={fieldId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LoyaltyTiersSection({ copy }: { copy: any }) {
  const getErrorMessage = useErrorMessage();
  const tiersQuery = useTierConfigs();

  return (
    <SettingsSection icon={Trophy} title={copy.loyaltyTiers.title} description={copy.loyaltyTiers.desc}>
      {tiersQuery.isPending ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tiersQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getErrorMessage(tiersQuery.error)}
        </div>
      ) : (
        <div className="space-y-4">
          <CreateTierPanel copy={copy} nextRank={(tiersQuery.data?.length ?? 0) + 1} />
          <div className="grid grid-cols-1 gap-3">
            {tiersQuery.data?.map((tier) => (
              <TierCard key={tier.tier} copy={copy} initialConfig={tier} />
            ))}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}

function CreateTierPanel({ copy, nextRank }: { copy: any; nextRank: number }) {
  const getErrorMessage = useErrorMessage();
  const createMutation = useCreateTierConfig();
  const [isExpanded, setIsExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [priorityScore, setPriorityScore] = useState(10);
  const [rankOrder, setRankOrder] = useState(nextRank);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [imageUrl, setImageUrl] = useState("#0f766e");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!isExpanded) {
      setRankOrder(nextRank);
    }
  }, [isExpanded, nextRank]);

  async function handleCreate() {
    try {
      await createMutation.mutateAsync({
        code,
        name,
        minPoints: threshold,
        pointMultiplier: multiplier,
        priorityScore,
        rankOrder,
        advanceBookingDays,
        imageUrl: imageUrl || null,
        active,
      });
      setCode("");
      setName("");
      setThreshold(0);
      setMultiplier(1);
      setPriorityScore(10);
      setRankOrder(nextRank + 1);
      setAdvanceBookingDays(30);
      setImageUrl("#0f766e");
      setActive(true);
      setIsExpanded(false);
      notify.success(copy.successMsg);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Plus className="h-4 w-4" />
          {copy.loyaltyTiers.createNew}
        </span>
        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isExpanded ? (
        <div className="grid gap-4 border-t border-primary/10 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FieldInput label={copy.loyaltyTiers.code} value={code} onChange={setCode} />
            <div className="md:col-span-2">
              <FieldInput label={copy.loyaltyTiers.name} value={name} onChange={setName} />
            </div>
            <FieldNumber label={copy.loyaltyTiers.threshold} value={threshold} onChange={setThreshold} />
            <FieldNumber label={copy.loyaltyTiers.multiplier} value={multiplier} onChange={setMultiplier} />
            <FieldNumber label={copy.loyaltyTiers.rank} value={rankOrder} onChange={setRankOrder} />
            <FieldNumber label={copy.loyaltyTiers.advanceDays} value={advanceBookingDays} onChange={setAdvanceBookingDays} />
            <FieldSelect
              label={copy.loyaltyTiers.priorityScore}
              value={priorityScore}
              options={[
                { label: copy.loyaltyTiers.priorityLevels[30], value: 30 },
                { label: copy.loyaltyTiers.priorityLevels[20], value: 20 },
                { label: copy.loyaltyTiers.priorityLevels[10], value: 10 },
                { label: copy.loyaltyTiers.priorityLevels[0], value: 0 },
              ]}
              onChange={setPriorityScore}
            />
            <FieldColorPicker label="Tier Color Hex" value={imageUrl} onChange={setImageUrl} />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={active} onChange={(event) => setActive(event.target.checked)} />
            {copy.loyaltyTiers.active}
          </label>
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-9 text-xs font-bold"
              disabled={createMutation.isPending || !code.trim() || !name.trim()}
              onClick={handleCreate}
            >
              {createMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
              {copy.loyaltyTiers.create}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TierCard({ copy, initialConfig }: { copy: any; initialConfig: TierConfig }) {
  const getErrorMessage = useErrorMessage();
  const updateMutation = useUpdateTierConfig();
  const deleteMutation = useDeleteTierConfig();
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState(initialConfig.name || initialConfig.tier);
  const [threshold, setThreshold] = useState(initialConfig.minPoints);
  const [multiplier, setMultiplier] = useState(initialConfig.pointMultiplier);
  const [priorityScore, setPriorityScore] = useState(initialConfig.priorityScore);
  const [rankOrder, setRankOrder] = useState(initialConfig.rankOrder);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(initialConfig.advanceBookingDays);
  const defaultHex = {
    BRONZE: "#B07D4B",
    SILVER: "#94A3B8",
    GOLD: "#EAB308",
    PLATINUM: "#64748B",
    DIAMOND: "#A855F7",
  }[initialConfig.tier] || "#cbd5e1";

  const [imageUrl, setImageUrl] = useState(initialConfig.imageUrl || defaultHex);
  const [active, setActive] = useState(initialConfig.active);

  const isChanged =
    name !== (initialConfig.name || initialConfig.tier) ||
    threshold !== initialConfig.minPoints ||
    multiplier !== initialConfig.pointMultiplier ||
    priorityScore !== initialConfig.priorityScore ||
    rankOrder !== initialConfig.rankOrder ||
    advanceBookingDays !== initialConfig.advanceBookingDays ||
    imageUrl !== (initialConfig.imageUrl || "") ||
    active !== initialConfig.active;

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        tier: initialConfig.tier,
        request: { name, minPoints: threshold, pointMultiplier: multiplier, priorityScore, rankOrder, advanceBookingDays, imageUrl: imageUrl || null, active },
      });
      notify.success(copy.successMsg);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(initialConfig.tier);
      notify.success(copy.successMsg);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  }

  const nameMap: Record<string, string> = {
    BRONZE: copy.loyaltyTiers.bronze,
    SILVER: copy.loyaltyTiers.silver,
    GOLD: copy.loyaltyTiers.gold,
    PLATINUM: copy.loyaltyTiers.platinum,
    DIAMOND: copy.loyaltyTiers.diamond,
  };

  const iconMap: Record<string, React.ReactNode> = {
    BRONZE: <Medal className="h-4 w-4" />,
    SILVER: <Medal className="h-4 w-4" />,
    GOLD: <Trophy className="h-4 w-4" />,
    PLATINUM: <Crown className="h-4 w-4" />,
    DIAMOND: <Diamond className="h-4 w-4" />,
  };

  const isBronze = initialConfig.tier === "BRONZE";
  
  const dynamicStyle = imageUrl ? {
    backgroundColor: `${imageUrl}10`,
    borderColor: `${imageUrl}40`,
    color: imageUrl,
  } : {};

  return (
    <div 
      className={cn("overflow-hidden rounded-2xl border transition-all", isExpanded ? "shadow-md" : "", !imageUrl && "bg-card border-border/60")}
      style={dynamicStyle}
    >
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span 
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border"
            style={
              imageUrl && imageUrl.startsWith("#")
                ? { color: imageUrl, borderColor: imageUrl, backgroundColor: `${imageUrl}1A` }
                : { color: "#0f766e", borderColor: "#ccfbf1", backgroundColor: "#f0fdfa" }
            }
          >
            {iconMap[initialConfig.tier] || <Star className="h-4 w-4" />}
            {nameMap[initialConfig.tier] || name || initialConfig.tier}
          </span>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <span>{threshold.toLocaleString("vi-VN")} pts</span>
            <span>x{multiplier} multiplier</span>
            <span>{advanceBookingDays} days</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label 
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="checkbox" className="accent-primary w-4 h-4" checked={active} onChange={(event) => setActive(event.target.checked)} />
            <span className="hidden sm:inline">{copy.loyaltyTiers.active}</span>
          </label>
          <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-5 pt-0 border-t border-border/40 mt-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            <div className="col-span-2 md:col-span-3">
              <FieldInput label={copy.loyaltyTiers.name} value={name} onChange={setName} />
            </div>
            <FieldNumber 
              label={copy.loyaltyTiers.threshold} 
              value={threshold} 
              onChange={setThreshold} 
              disabled={isBronze}
            />
            <FieldNumber 
              label={copy.loyaltyTiers.multiplier} 
              value={multiplier} 
              onChange={setMultiplier} 
            />
            <FieldNumber
              label={copy.loyaltyTiers.rank}
              value={rankOrder}
              onChange={setRankOrder}
            />
            <FieldNumber
              label={copy.loyaltyTiers.advanceDays}
              value={advanceBookingDays}
              onChange={setAdvanceBookingDays}
            />
            <FieldSelect 
              label={copy.loyaltyTiers.priorityScore} 
              value={priorityScore} 
              options={[
                { label: copy.loyaltyTiers.priorityLevels[30], value: 30 },
                { label: copy.loyaltyTiers.priorityLevels[20], value: 20 },
                { label: copy.loyaltyTiers.priorityLevels[10], value: 10 },
                { label: copy.loyaltyTiers.priorityLevels[0], value: 0 },
              ]}
              onChange={setPriorityScore} 
            />
            <FieldColorPicker label="Tier Color Hex" value={imageUrl} onChange={setImageUrl} />
          </div>

          {updateMutation.isError && (
            <div className="mt-3 text-[10px] text-rose-600 font-medium">
              {getErrorMessage(updateMutation.error)}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4">
            {!initialConfig.systemTier ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                {copy.loyaltyTiers.delete}
              </Button>
            ) : null}
            <Button 
              type="button" 
              size="sm" 
              className="h-9 text-xs font-bold w-full sm:w-32"
              variant={isChanged ? "default" : "outline"}
              disabled={!isChanged || updateMutation.isPending} 
              onClick={handleSave}
            >
              {updateMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              {copy.loyaltyTiers.save}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [localValue, setLocalValue] = useState(value || "#000000");

  useEffect(() => {
    if (value && value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 150);
    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="h-10 w-14 rounded cursor-pointer border border-border p-1 bg-background"
        />
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="#000000"
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
        />
      </div>
    </label>
  );
}
