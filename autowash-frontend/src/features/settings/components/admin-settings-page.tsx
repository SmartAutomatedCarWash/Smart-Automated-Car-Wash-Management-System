"use client";

import { useState, useEffect } from "react";
import { Settings2, Loader2, Save, Clock, Calendar, Coins, Trophy, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Button } from "@/shared/ui/ui/button";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useSystemSettings, useUpdateSystemSettings } from "@/features/settings/hooks/use-admin-settings";
import { useCreateTierConfig, useTierConfigs, useUpdateTierConfig } from "@/features/settings/hooks/use-admin-tiers";
import type { SystemSettings } from "@/features/settings/lib/admin-settings-service";
import type { TierConfig } from "@/features/settings/lib/admin-tiers-service";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { useLanguageStore } from "@/shared/store/language.store";

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
      earnPerVnd: "Tích điểm mỗi (VNĐ)",
      vndPerPoint: "VNĐ mỗi điểm",
      minRedemption: "Điểm đổi tối thiểu",
      maxRedemption: "Điểm đổi tối đa",
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
      name: "Tên hạng",
      code: "Mã hạng",
      rank: "Cấp bậc",
      active: "Hoạt động",
      create: "Tạo hạng",
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
      earnPerVnd: "Earn points per (VND)",
      vndPerPoint: "VND per point",
      minRedemption: "Min redemption points",
      maxRedemption: "Max redemption points",
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
      name: "Tier name",
      code: "Tier code",
      rank: "Rank",
      active: "Active",
      create: "Create tier",
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
    maxBookingsPerSlot: data.maxBookingsPerSlot ?? 3,
    currency: data.currency,
    earnPointsUnitAmount: data.earnPointsUnitAmount,
    vndPerPoint: data.vndPerPoint,
    minRedemptionPoints: data.minRedemptionPoints,
    maxRedemptionPoints: data.maxRedemptionPoints,
  };
}

export function AdminSettingsPage() {
  const { language } = useLanguageStore();
  const copy = ADMIN_SETTINGS_COPY[language as keyof typeof ADMIN_SETTINGS_COPY] || ADMIN_SETTINGS_COPY.vi;
  const settingsQuery = useSystemSettings();
  const updateMutation = useUpdateSystemSettings();
  const [form, setForm] = useState<SettingsForm | null>(null);

  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm(toForm(settingsQuery.data));
    }
  }, [settingsQuery.data, form]);

  function updateField<K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave() {
    if (!form) return;
    try {
      await updateMutation.mutateAsync(form);
      toast.success(copy.successMsg);
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
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
              {getDisplayErrorMessage(settingsQuery.error)}
            </div>
          ) : form ? (
            <div className="space-y-4">
              {/* Operating Hours */}
              <SettingsSection icon={Clock} title={copy.operatingHours.title} description={copy.operatingHours.desc}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput label={copy.operatingHours.open} value={form.operatingStartTime} onChange={(v) => updateField("operatingStartTime", v)} />
                  <FieldInput label={copy.operatingHours.close} value={form.operatingEndTime} onChange={(v) => updateField("operatingEndTime", v)} />
                </div>
              </SettingsSection>

              {/* Booking Rules */}
              <SettingsSection icon={Calendar} title={copy.bookingRules.title} description={copy.bookingRules.desc}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FieldNumber label={copy.bookingRules.maxAdvance} value={form.maxAdvanceBookingDays} onChange={(v) => updateField("maxAdvanceBookingDays", v)} />
                  <FieldNumber label={copy.bookingRules.noShowGrace} value={form.noShowGraceMinutes} onChange={(v) => updateField("noShowGraceMinutes", v)} />
                  <FieldNumber label={copy.bookingRules.maxPerSlot} value={form.maxBookingsPerSlot} onChange={(v) => updateField("maxBookingsPerSlot", v)} />
                </div>
              </SettingsSection>

              {/* Currency */}
              <SettingsSection icon={Coins} title={copy.currencyPoints.title} description={copy.currencyPoints.desc}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FieldInput label={copy.currencyPoints.currency} value={form.currency} onChange={(v) => updateField("currency", v)} />
                  <FieldNumber label={copy.currencyPoints.earnPerVnd} value={form.earnPointsUnitAmount} onChange={(v) => updateField("earnPointsUnitAmount", v)} />
                  <FieldNumber label={copy.currencyPoints.vndPerPoint} value={form.vndPerPoint} onChange={(v) => updateField("vndPerPoint", v)} />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FieldNumber label={copy.currencyPoints.minRedemption} value={form.minRedemptionPoints} onChange={(v) => updateField("minRedemptionPoints", v)} />
                  <FieldNumber label={copy.currencyPoints.maxRedemption} value={form.maxRedemptionPoints} onChange={(v) => updateField("maxRedemptionPoints", v)} />
                </div>
              </SettingsSection>

              {/* Loyalty Tiers */}
              <LoyaltyTiersSection copy={copy} />

              {/* Save button */}
              {updateMutation.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getDisplayErrorMessage(updateMutation.error)}
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

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function FieldNumber({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </label>
  );
}

function FieldSelect({ label, value, options, onChange, disabled }: { label: string; value: number; options: { label: string, value: number }[]; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
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
    </label>
  );
}

function LoyaltyTiersSection({ copy }: { copy: any }) {
  const tiersQuery = useTierConfigs();
  const createMutation = useCreateTierConfig();
  const [newTier, setNewTier] = useState({
    code: "",
    name: "",
    minPoints: 0,
    pointMultiplier: 1,
    priorityScore: 0,
    rankOrder: 5,
    active: true,
  });

  async function handleCreateTier() {
    try {
      await createMutation.mutateAsync(newTier);
      setNewTier({ code: "", name: "", minPoints: 0, pointMultiplier: 1, priorityScore: 0, rankOrder: 5, active: true });
      toast.success(copy.successMsg);
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  }

  return (
    <SettingsSection icon={Trophy} title={copy.loyaltyTiers.title} description={copy.loyaltyTiers.desc}>
      {tiersQuery.isPending ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tiersQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getDisplayErrorMessage(tiersQuery.error)}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <FieldInput label={copy.loyaltyTiers.code} value={newTier.code} onChange={(v) => setNewTier((current) => ({ ...current, code: v }))} />
              <FieldInput label={copy.loyaltyTiers.name} value={newTier.name} onChange={(v) => setNewTier((current) => ({ ...current, name: v }))} />
              <FieldNumber label={copy.loyaltyTiers.threshold} value={newTier.minPoints} onChange={(v) => setNewTier((current) => ({ ...current, minPoints: v }))} />
              <FieldNumber label={copy.loyaltyTiers.multiplier} value={newTier.pointMultiplier} onChange={(v) => setNewTier((current) => ({ ...current, pointMultiplier: v }))} />
              <FieldNumber label={copy.loyaltyTiers.rank} value={newTier.rankOrder} onChange={(v) => setNewTier((current) => ({ ...current, rankOrder: v }))} />
              <FieldSelect
                label={copy.loyaltyTiers.priorityScore}
                value={newTier.priorityScore}
                options={[
                  { label: copy.loyaltyTiers.priorityLevels[30], value: 30 },
                  { label: copy.loyaltyTiers.priorityLevels[20], value: 20 },
                  { label: copy.loyaltyTiers.priorityLevels[10], value: 10 },
                  { label: copy.loyaltyTiers.priorityLevels[0], value: 0 },
                ]}
                onChange={(v) => setNewTier((current) => ({ ...current, priorityScore: v }))}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" size="sm" disabled={createMutation.isPending} onClick={handleCreateTier}>
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {copy.loyaltyTiers.create}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tiersQuery.data?.map((tier) => (
              <TierCard key={tier.tier} copy={copy} initialConfig={tier} />
            ))}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}

function TierCard({ copy, initialConfig }: { copy: any; initialConfig: TierConfig }) {
  const updateMutation = useUpdateTierConfig();
  const [name, setName] = useState(initialConfig.name || initialConfig.tier);
  const [threshold, setThreshold] = useState(initialConfig.minPoints);
  const [multiplier, setMultiplier] = useState(initialConfig.pointMultiplier);
  const [priorityScore, setPriorityScore] = useState(initialConfig.priorityScore);
  const [rankOrder, setRankOrder] = useState(initialConfig.rankOrder);
  const [active, setActive] = useState(initialConfig.active);

  const isChanged =
    name !== (initialConfig.name || initialConfig.tier) ||
    threshold !== initialConfig.minPoints ||
    multiplier !== initialConfig.pointMultiplier ||
    priorityScore !== initialConfig.priorityScore ||
    rankOrder !== initialConfig.rankOrder ||
    active !== initialConfig.active;

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        tier: initialConfig.tier,
        request: { name, minPoints: threshold, pointMultiplier: multiplier, priorityScore, rankOrder, active },
      });
      toast.success(copy.successMsg);
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  }

  const nameMap: Record<string, string> = {
    BRONZE: copy.loyaltyTiers.bronze,
    SILVER: copy.loyaltyTiers.silver,
    GOLD: copy.loyaltyTiers.gold,
    PLATINUM: copy.loyaltyTiers.platinum,
    DIAMOND: copy.loyaltyTiers.diamond,
  };

  const colorMap: Record<string, string> = {
    BRONZE: "bg-orange-50 text-orange-700 border-orange-200",
    SILVER: "bg-slate-100 text-slate-700 border-slate-300",
    GOLD: "bg-amber-50 text-amber-700 border-amber-200",
    PLATINUM: "bg-violet-50 text-violet-700 border-violet-200",
    DIAMOND: "bg-sky-50 text-sky-700 border-sky-200",
  };

  const isBronze = initialConfig.tier === "BRONZE";

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4 relative group hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${colorMap[initialConfig.tier] || "bg-teal-50 text-teal-700 border-teal-200"}`}>
          {nameMap[initialConfig.tier] || name || initialConfig.tier}
        </span>
      </div>
      <FieldInput label={copy.loyaltyTiers.name} value={name} onChange={setName} />
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
      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        {copy.loyaltyTiers.active}
      </label>
      {updateMutation.isError && (
        <div className="text-[10px] text-rose-600 font-medium">
          {getDisplayErrorMessage(updateMutation.error)}
        </div>
      )}
      <Button 
        type="button" 
        size="sm" 
        className="w-full h-8 text-xs font-semibold"
        variant={isChanged ? "default" : "outline"}
        disabled={!isChanged || updateMutation.isPending} 
        onClick={handleSave}
      >
        {updateMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
        {copy.loyaltyTiers.save}
      </Button>
    </div>
  );
}
