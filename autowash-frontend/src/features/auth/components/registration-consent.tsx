"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FileText, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/shared/ui/ui/checkbox";

type ConsentLanguage = "vi" | "en";
type LegalDocument = "terms" | "privacy";

type RegistrationConsentProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  language?: ConsentLanguage;
};

const LEGAL_COPY = {
  vi: {
    checkboxStart: "Tôi đã đọc và đồng ý với",
    termsLink: "Điều khoản sử dụng",
    conjunction: "và",
    privacyLink: "Chính sách bảo mật",
    required: "Bạn cần đồng ý với điều khoản để đăng ký.",
    close: "Đóng",
    terms: {
      title: "Điều khoản sử dụng",
      description: "Các điều kiện áp dụng khi sử dụng dịch vụ của AURA Car Wash.",
      sections: [
        {
          heading: "1. Tài khoản khách hàng",
          body: "Bạn có trách nhiệm cung cấp thông tin chính xác, bảo mật thông tin đăng nhập và thông báo cho AURA khi phát hiện tài khoản bị sử dụng trái phép.",
        },
        {
          heading: "2. Đặt lịch và sử dụng dịch vụ",
          body: "Lịch hẹn phụ thuộc vào tình trạng phục vụ tại từng thời điểm. Bạn nên kiểm tra thông tin xe, dịch vụ, thời gian và địa điểm trước khi xác nhận.",
        },
        {
          heading: "3. Thanh toán, hủy và hoàn tiền",
          body: "Mức giá, phương thức thanh toán, điều kiện hủy và hoàn tiền được hiển thị tại thời điểm đặt dịch vụ. Các ưu đãi có thể kèm điều kiện áp dụng riêng.",
        },
        {
          heading: "4. Sử dụng hợp lệ",
          body: "Bạn không được sử dụng website để gian lận, gây gián đoạn hệ thống, xâm phạm quyền của người khác hoặc thực hiện hành vi trái pháp luật.",
        },
        {
          heading: "5. Thay đổi điều khoản",
          body: "AURA có thể cập nhật điều khoản để phù hợp với dịch vụ và quy định hiện hành. Phiên bản mới sẽ được công bố trên website.",
        },
      ],
    },
    privacy: {
      title: "Chính sách bảo mật",
      description: "Cách AURA Car Wash thu thập, sử dụng và bảo vệ dữ liệu cá nhân.",
      sections: [
        {
          heading: "1. Dữ liệu được thu thập",
          body: "Chúng tôi có thể thu thập họ tên, email, số điện thoại, thông tin xe, lịch đặt dịch vụ, giao dịch và dữ liệu kỹ thuật cần thiết để vận hành hệ thống.",
        },
        {
          heading: "2. Mục đích sử dụng",
          body: "Dữ liệu được dùng để tạo và bảo vệ tài khoản, cung cấp dịch vụ, gửi thông báo giao dịch, hỗ trợ khách hàng và cải thiện trải nghiệm.",
        },
        {
          heading: "3. Chia sẻ dữ liệu",
          body: "Dữ liệu chỉ được chia sẻ với đơn vị hỗ trợ vận hành, thanh toán hoặc cơ quan có thẩm quyền khi cần thiết và phù hợp với quy định áp dụng.",
        },
        {
          heading: "4. Lưu trữ và bảo mật",
          body: "Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp để hạn chế truy cập, mất mát hoặc sử dụng dữ liệu trái phép.",
        },
        {
          heading: "5. Quyền của bạn",
          body: "Bạn có thể yêu cầu xem, chỉnh sửa hoặc xử lý dữ liệu cá nhân của mình bằng cách liên hệ với bộ phận hỗ trợ của AURA.",
        },
      ],
    },
  },
  en: {
    checkboxStart: "I have read and agree to the",
    termsLink: "Terms of Use",
    conjunction: "and",
    privacyLink: "Privacy Policy",
    required: "You must accept the terms to register.",
    close: "Close",
    terms: {
      title: "Terms of Use",
      description: "The conditions that apply when using AURA Car Wash services.",
      sections: [
        {
          heading: "1. Customer account",
          body: "You are responsible for providing accurate information, protecting your login credentials, and notifying AURA if you detect unauthorized account use.",
        },
        {
          heading: "2. Booking and services",
          body: "Appointments depend on service availability. Please review the vehicle, service, time, and location details before confirming a booking.",
        },
        {
          heading: "3. Payment, cancellation, and refunds",
          body: "Prices, payment methods, cancellation terms, and refund conditions are shown when you book. Promotions may have additional conditions.",
        },
        {
          heading: "4. Acceptable use",
          body: "You may not use the website for fraud, system disruption, infringement of another person's rights, or any unlawful activity.",
        },
        {
          heading: "5. Changes to these terms",
          body: "AURA may update these terms to reflect service or regulatory changes. The updated version will be published on the website.",
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      description: "How AURA Car Wash collects, uses, and protects personal data.",
      sections: [
        {
          heading: "1. Data we collect",
          body: "We may collect your name, email, phone number, vehicle details, service history, transaction information, and technical data required to operate the platform.",
        },
        {
          heading: "2. How data is used",
          body: "Data is used to create and protect your account, provide services, send transaction notices, support customers, and improve the experience.",
        },
        {
          heading: "3. Data sharing",
          body: "Data is shared only with service, payment, or operational providers when necessary, or with competent authorities where required by applicable rules.",
        },
        {
          heading: "4. Retention and security",
          body: "We use appropriate technical and organizational measures to reduce unauthorized access, loss, or misuse of personal data.",
        },
        {
          heading: "5. Your rights",
          body: "You may request access to, correction of, or other handling of your personal data by contacting AURA customer support.",
        },
      ],
    },
  },
} as const;

export function RegistrationConsent({
  checked,
  onCheckedChange,
  language = "vi",
}: RegistrationConsentProps) {
  const [activeDocument, setActiveDocument] = useState<LegalDocument | null>(null);
  const copy = LEGAL_COPY[language];
  const document = activeDocument ? copy[activeDocument] : copy.terms;
  const checkboxId = `registration-consent-${language}`;

  return (
    <>
      <div className="rounded-2xl border border-sky-100 bg-white/70 px-3.5 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <Checkbox
            id={checkboxId}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            aria-describedby={`${checkboxId}-hint`}
            className="mt-0.5 h-5 w-5 rounded-md border-sky-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
          />
          <label htmlFor={checkboxId} className="text-xs font-medium leading-5 text-slate-600">
            {copy.checkboxStart}{" "}
            <button
              type="button"
              onClick={() => setActiveDocument("terms")}
              className="font-bold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
            >
              {copy.termsLink}
            </button>{" "}
            {copy.conjunction}{" "}
            <button
              type="button"
              onClick={() => setActiveDocument("privacy")}
              className="font-bold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
            >
              {copy.privacyLink}
            </button>
            .
          </label>
        </div>
        {!checked ? (
          <p id={`${checkboxId}-hint`} className="mt-1.5 pl-8 text-[10px] font-semibold text-amber-700">
            {copy.required}
          </p>
        ) : null}
      </div>

      <DialogPrimitive.Root
        open={activeDocument !== null}
        onOpenChange={(open) => {
          if (!open) setActiveDocument(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10020] bg-slate-950/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-1/2 z-[10021] flex max-h-[min(82vh,720px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.35)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-sky-50 px-6 py-5 pr-14">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                {activeDocument === "privacy" ? <ShieldCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <DialogPrimitive.Title className="text-xl font-black text-slate-900">
                {document.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-slate-600">
                {document.description}
              </DialogPrimitive.Description>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              {document.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-sm font-extrabold text-slate-800">{section.heading}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{section.body}</p>
                </section>
              ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-right">
              <DialogPrimitive.Close className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20">
                {copy.close}
              </DialogPrimitive.Close>
            </div>

            <DialogPrimitive.Close
              aria-label={copy.close}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
