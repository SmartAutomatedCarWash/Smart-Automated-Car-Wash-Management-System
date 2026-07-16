"use client";

import { useState } from "react";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useAdminNotificationCampaigns, useCreateNotificationCampaign } from "../hooks/use-admin-notification-campaigns";
import { CampaignTargetAudience, NotificationType, NotificationCampaignResponse } from "../api/admin-notification-campaigns-service";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { Plus, X, Send, Clock, Users, Tag, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";

export function AdminNotificationCampaignsPage() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { data: campaignPage, isLoading } = useAdminNotificationCampaigns(page, limit);
  const createMutation = useCreateNotificationCampaign();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("PROMOTION");
  const [targetAudience, setTargetAudience] = useState<CampaignTargetAudience>("ALL_CUSTOMERS");
  const [targetDetails, setTargetDetails] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaignResponse | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate(
      {
        title,
        message,
        type,
        targetAudience,
        targetDetails: targetAudience === "INDIVIDUALS" ? targetDetails : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setTitle("");
          setMessage("");
          setType("PROMOTION");
          setTargetAudience("ALL_CUSTOMERS");
          setTargetDetails("");
          setScheduledAt("");
        },
        onError: (err) => {
          setError(getDisplayErrorMessage(err));
        },
      }
    );
  };

  const campaigns = campaignPage?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">{t("Chiến dịch thông báo", "Notification Campaigns")}</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {t("Gửi thông báo hàng loạt hoặc theo nhóm khách hàng", "Send bulk notifications or target specific customer groups")}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-9 px-3">
          <Plus className="h-3.5 w-3.5" />
          {t("Soạn thông báo mới", "Compose Notification")}
        </Button>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-700 text-xs">{t("Tiêu đề", "Title")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">{t("Loại", "Type")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">{t("Đối tượng", "Audience")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">{t("Trạng thái", "Status")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right">{t("Kết quả", "Results")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right">{t("Thời gian tạo", "Created At")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs font-semibold text-slate-400">
                    {t("Chưa có chiến dịch nào", "No campaigns found")}
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((camp) => (
                  <TableRow 
                    key={camp.id} 
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                    onClick={() => setSelectedCampaign(camp)}
                  >
                    <TableCell>
                      <p className="text-xs font-bold text-slate-800">{camp.title}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs">{camp.message}</p>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-purple-50 text-purple-700">
                        {camp.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-blue-50 text-blue-700">
                        {camp.targetAudience}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                        camp.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                        camp.status === "FAILED" ? "bg-rose-50 text-rose-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {camp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-[10px] font-bold text-slate-600">
                        <span className="text-emerald-600">{camp.successCount}</span> / <span className="text-rose-600">{camp.failedCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[10px] font-semibold text-slate-500">
                      {new Date(camp.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Compose Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Send className="h-5 w-5 text-teal-600" />
              {t("Soạn thông báo mới", "Compose Notification")}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs font-bold text-slate-600">
              {error && (
                <div className="rounded-xl bg-rose-50 text-rose-600 p-3 text-xs font-semibold">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label>{t("Tiêu đề", "Title")}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl p-3 text-xs" />
              </div>

              <div className="space-y-1">
                <label>{t("Nội dung", "Message")}</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} required className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[80px]" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{t("Loại thông báo", "Type")}</label>
                  <Select value={type} onValueChange={(v) => setType(v as NotificationType)}>
                    <SelectTrigger className="w-full rounded-xl text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROMOTION">PROMOTION</SelectItem>
                      <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                      <SelectItem value="LOYALTY">LOYALTY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{t("Đối tượng", "Audience")}</label>
                  <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as CampaignTargetAudience)}>
                    <SelectTrigger className="w-full rounded-xl text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_CUSTOMERS">{t("Tất cả khách hàng", "All Customers")}</SelectItem>
                      <SelectItem value="TIER_BRONZE">Tier: BRONZE</SelectItem>
                      <SelectItem value="TIER_SILVER">Tier: SILVER</SelectItem>
                      <SelectItem value="TIER_GOLD">Tier: GOLD</SelectItem>
                      <SelectItem value="TIER_PLATINUM">Tier: PLATINUM</SelectItem>
                      <SelectItem value="TIER_DIAMOND">Tier: DIAMOND</SelectItem>
                      <SelectItem value="INDIVIDUALS">{t("Cá nhân (Nhập ID)", "Individuals")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {targetAudience === "INDIVIDUALS" && (
                <div className="space-y-1">
                  <label>{t("ID Khách hàng (Cách nhau dấu phẩy)", "Customer IDs (Comma separated)")}</label>
                  <textarea value={targetDetails} onChange={(e) => setTargetDetails(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none min-h-[60px]" />
                </div>
              )}

              <div className="space-y-1">
                <label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{t("Hẹn giờ gửi (Không bắt buộc)", "Schedule Send (Optional)")}</label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="rounded-xl p-3 text-xs" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="rounded-xl font-bold">
                  {t("Hủy", "Cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {createMutation.isPending ? t("Đang gửi...", "Sending...") : t("Gửi thông báo", "Send Notification")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-6">
            <button onClick={() => setSelectedCampaign(null)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
              <X className="h-4 w-4" />
            </button>
            
            <div className="space-y-1 pr-8">
              <h2 className="text-lg font-black text-slate-800">{selectedCampaign.title}</h2>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                  selectedCampaign.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                  selectedCampaign.status === "FAILED" ? "bg-rose-50 text-rose-700" :
                  "bg-amber-50 text-amber-700"
                }`}>
                  {selectedCampaign.status}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-purple-50 text-purple-700">
                  {selectedCampaign.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-blue-50 text-blue-700">
                  {selectedCampaign.targetAudience}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedCampaign.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCampaign.targetAudience === "INDIVIDUALS" && selectedCampaign.targetDetails && (
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Chi tiết đối tượng", "Target Details")}</label>
                    <p className="text-xs font-semibold text-slate-800 break-all bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedCampaign.targetDetails}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Thành công / Thất bại", "Success / Failed")}</label>
                  <p className="text-xs font-black text-slate-800">
                    <span className="text-emerald-600">{selectedCampaign.successCount}</span>
                    <span className="text-slate-300 mx-2">|</span>
                    <span className="text-rose-600">{selectedCampaign.failedCount}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Thời gian tạo", "Created At")}</label>
                  <p className="text-xs font-semibold text-slate-800">{new Date(selectedCampaign.createdAt).toLocaleString()}</p>
                </div>

                {selectedCampaign.scheduledAt && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Lịch gửi", "Scheduled For")}</label>
                    <p className="text-xs font-semibold text-amber-600">{new Date(selectedCampaign.scheduledAt).toLocaleString()}</p>
                  </div>
                )}

                {selectedCampaign.sentAt && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Thời gian gửi", "Sent At")}</label>
                    <p className="text-xs font-semibold text-emerald-600">{new Date(selectedCampaign.sentAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setSelectedCampaign(null)} variant="outline" className="rounded-xl font-bold">
                {t("Đóng", "Close")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
