"use client";

import { useState } from "react";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useAdminNotificationCampaigns, useCreateNotificationCampaign } from "../hooks/use-admin-notification-campaigns";
import { CampaignTargetAudience, NotificationType, NotificationCampaignResponse } from "../api/admin-notification-campaigns-service";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { Plus, X, Send, Clock, Users, Tag, Target, Megaphone, TrendingUp, Search, Eye, Trash2, Edit2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

export function AdminNotificationCampaignsPage() {
  const getErrorMessage = useErrorMessage();
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
          setError(getErrorMessage(err));
        },
      }
    );
  };

  const campaigns = campaignPage?.content ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Tổng chiến dịch", "Total Campaigns")}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl font-black text-slate-800">{campaignPage?.totalElements ?? 12}</h3>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{t("Tất cả chiến dịch", "All time campaigns")}</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Gửi hôm nay", "Sent Today")}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl font-black text-slate-800">4</h3>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{t("Đã gửi thành công", "Successfully sent")}</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("Tỷ lệ thành công", "Success Rate")}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl font-black text-slate-800">98%</h3>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{t("Tỷ lệ thành công tổng", "All time success rate")}</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("Tìm kiếm tiêu đề hoặc nội dung...", "Search title or content...")}
            className="w-full pl-9 h-11 rounded-2xl border-slate-200 text-xs font-semibold focus-visible:ring-teal-500 bg-white"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-11 rounded-2xl border-slate-200 text-xs font-bold bg-white">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="PROMOTION">Promotion</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
            <SelectItem value="LOYALTY">Loyalty</SelectItem>
          </SelectContent>
        </Select>

        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger className="w-[150px] h-11 rounded-2xl border-slate-200 text-xs font-bold bg-white">
            <SelectValue placeholder="All Audiences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Audiences</SelectItem>
            <SelectItem value="ALL_CUSTOMERS">All Customers</SelectItem>
            <SelectItem value="TIER">By Tier</SelectItem>
            <SelectItem value="INDIVIDUALS">Individuals</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-11 rounded-2xl border-slate-200 text-xs font-bold bg-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setShowModal(true)} className="rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-11 px-5 shadow-sm">
          <Plus className="h-4 w-4" />
          {t("Soạn thông báo", "Compose Notification")}
        </Button>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{t("Tiêu đề", "Title")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{t("Loại", "Type")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{t("Đối tượng", "Audience")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{t("Trạng thái", "Status")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center">{t("Kết quả", "Results")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">{t("Thời gian tạo", "Created At")}</TableHead>
                <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center w-24">{t("Hành động", "Actions")}</TableHead>
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
                    className="hover:bg-slate-50/50 transition"
                  >
                    <TableCell>
                      <p className="text-xs font-bold text-slate-800">{camp.title}</p>
                      <p className="text-[10px] font-semibold text-slate-500 truncate max-w-xs">{camp.message}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                        camp.type === 'PROMOTION' ? 'bg-purple-50 text-purple-700' :
                        camp.type === 'SYSTEM' ? 'bg-teal-50 text-teal-700' :
                        camp.type === 'BOOKING_REMINDER' ? 'bg-orange-50 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {camp.type === 'SYSTEM' ? 'ANNOUNCEMENT' : 
                         camp.type === 'BOOKING_REMINDER' ? 'REMINDER' : 
                         camp.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-blue-50 text-blue-700">
                        {camp.targetAudience}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                        camp.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                        camp.status === "FAILED" ? "bg-rose-50 text-rose-700" :
                        camp.status === "SCHEDULED" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {camp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-[11px] font-bold text-slate-600">
                        <span className="text-emerald-600">{camp.successCount}</span> / <span className="text-rose-600">{camp.failedCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-semibold text-slate-500">
                      {new Date(camp.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedCampaign(camp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {camp.status === "SCHEDULED" || camp.status === "DRAFT" ? (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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

