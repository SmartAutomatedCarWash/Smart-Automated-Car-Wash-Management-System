"use client";

import { useRouter } from "next/navigation";
import { Clock3, Mail, MapPin, MessageCircleHeart, Phone, ArrowLeft } from "lucide-react";
import { translate, useLanguageStore } from "@/shared/store/language.store";

const CONTACT_CHANNELS = [
  {
    icon: Phone,
    titleVi: "Hotline",
    titleEn: "Hotline",
    value: "1900 1234",
    detailVi: "Hoạt động mỗi ngày từ 8:00 AM đến 8:00 PM",
    detailEn: "Available daily from 8:00 AM to 8:00 PM",
  },
  {
    icon: Mail,
    titleVi: "Email hỗ trợ",
    titleEn: "Support email",
    value: "support@auracarcare.vn",
    detailVi: "Phù hợp cho yêu cầu cần gửi kèm hình ảnh hoặc thông tin booking",
    detailEn: "Best for requests that include images or booking details",
  },
  {
    icon: MapPin,
    titleVi: "Địa chỉ trung tâm",
    titleEn: "Service center",
    value: "12 Nguyen Van Linh, District 7, Ho Chi Minh City",
    detailVi: "Liên hệ trước khi đến để được hỗ trợ nhanh hơn",
    detailEn: "Contact us before visiting for faster assistance",
  },
] as const;

export function CustomerSupportPageContent() {
  const router = useRouter();
  const { language } = useLanguageStore();

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        {translate(language, "Quay lại", "Go back")}
      </button>

      <section className="rounded-[28px] border border-cyan-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] p-6 shadow-[0_24px_60px_rgba(6,17,26,0.08)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-900">
              <MessageCircleHeart className="h-4 w-4" />
              {translate(language, "Chăm sóc khách hàng", "Customer support")}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">
                {translate(language, "Liên hệ đội ngũ hỗ trợ AURA CAR CARE", "Contact the AURA CAR CARE support team")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">
                {translate(
                  language,
                  "Nếu bạn cần hỗ trợ về đặt lịch, thành viên, voucher, tài khoản hoặc dịch vụ, hãy liên hệ qua các kênh bên dưới để được chăm sóc nhanh nhất.",
                  "If you need help with bookings, membership, vouchers, account issues, or services, contact us through the channels below for fast support.",
                )}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 px-5 py-4 shadow-[0_12px_30px_rgba(245,158,11,0.12)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#06111a] text-cyan-100">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Hotline</div>
                <div className="text-2xl font-black tracking-tight text-slate-950">1900 1234</div>
                <div className="text-xs text-slate-500">
                  {translate(language, "8:00 AM - 8:00 PM hằng ngày", "8:00 AM - 8:00 PM daily")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {CONTACT_CHANNELS.map((channel) => {
          const Icon = channel.icon;

          return (
            <article
              key={channel.value}
              className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(6,17,26,0.06)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {translate(language, channel.titleVi, channel.titleEn)}
              </div>
              <div className="mt-2 text-lg font-black tracking-tight text-slate-950">{channel.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {translate(language, channel.detailVi, channel.detailEn)}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_16px_40px_rgba(6,17,26,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-950">
              {translate(language, "Giờ hỗ trợ", "Support hours")}
            </h3>
            <p className="text-sm text-slate-600">
              {translate(
                language,
                "Tổng đài và các kênh hỗ trợ đều hoạt động từ 8:00 AM đến 8:00 PM mỗi ngày.",
                "Our hotline and support channels are available daily from 8:00 AM to 8:00 PM.",
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
