"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, useCallback, useMemo, type FormEvent, type ChangeEvent, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { listBookingPackages } from "@/features/bookings/lib/booking-service";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  type LucideIcon,
  Menu,
  Quote,
  Shield,
  Sparkles,
  Star,
  X,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Phone,
  UserRound,
  LockKeyhole,
  ShieldCheck,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { cn } from "@/shared/lib/utils";
import { useCustomerLogin, useCustomerRegister, useSendCustomerOtp, useVerifyCustomerOtp } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useLanguageStore } from "@/shared/store/language.store";
import { emailPattern, otpPattern, passwordPattern, phonePattern } from "@/shared/lib/validators";
import { getDisplayErrorMessage, getFieldErrorMessage } from "@/shared/lib/api-errors";
import { getAuthRedirectPath } from "@/features/auth/lib/auth-session";
import { getPasswordVisibilityState } from "@/features/auth/lib/password-visibility";
import { getLoginIdentifierValidationMessage, normalizeLoginIdentifier } from "@/features/auth/lib/login-identifier";
import {
  homeCombos,
  homeGallery,
  homeServices,
  homeTestimonials,
  type HomeCombo,
  type HomeService,
} from "./homepage-data";
const ModernAuthPopupModal = dynamic(
  () => import("./modern-auth-popup-modal").then((mod) => mod.ModernAuthPopupModal),
  { ssr: false },
);

const HOME_COPY = {
  vi: {
    navServices: "Dịch vụ",
    navCombos: "Gói Combo",
    navReviews: "Đánh giá",
    navContact: "Liên hệ",
    login: "Đăng nhập",
    register: "Đăng ký",
    tagline: "Carwash",
    heroTitle: "The Best Car Wash",
    heroSubtitle: "Đặt lịch trong 30 giây. Không chờ xếp hàng. Hoàn thiện cao cấp, minh bạch từng bước.",
    bookNow: "Đặt lịch ngay",
    viewServices: "Xem dịch vụ",
    featureBookingTitle: "Đặt trong 30 giây",
    featureBookingDesc: "Chọn khung giờ và xác nhận tức thì.",
    featurePromiseTitle: "Hoàn tiền 100%",
    featurePromiseDesc: "Cam kết chất lượng dịch vụ hàng đầu.",
    featureLoungeTitle: "Phòng chờ 5 sao",
    featureLoungeDesc: "Wi-Fi, nước uống và không gian mát mẻ.",
    facilityTitle: "Trải nghiệm dịch vụ đẳng cấp.",
    facilityDesc: "Nghỉ tại khu chờ tiện nghi trong lúc đội ngũ kỹ thuật hoàn thiện quy trình rửa không chạm và chăm sóc bóng sơn.",
    beforeLabel: "Công nghệ chuẩn premium",
    afterLabel: "Sáng bóng chuẩn showroom",
    beforeDesc: "Lấm bẩn, bám bụi và xỉn màu.",
    afterDesc: "Hoàn thiện với độ bóng vượt trội và sạch sẽ từng chi tiết.",
    loungeDesc: "Thưởng thức cà phê đặc sản, Wi-Fi tốc độ cao và máy điều hòa mát mẻ trong phòng chờ hiện đại của chúng tôi.",
    loungeTag: "Áp dụng cho mọi lịch đặt",
    servicesTitle: "Dịch vụ chăm sóc xe toàn diện.",
    servicesDesc: "Chọn gói dịch vụ phù hợp với nhu cầu chăm sóc xe của bạn. Tất cả các gói đều sử dụng bọt cao cấp và nước lọc tinh khiết RO.",
    promiseEyebrow: "Cam kết của chúng tôi",
    promiseTitle: "Quy trình kiểm chuẩn chất lượng Đức.",
    promiseDesc: "Mỗi xe được quét tự động trước khi rửa để đảm bảo an toàn. Hệ thống phun không chạm giúp hạn chế trầy xước tối đa.",
    promiseTouchless: "Không chạm",
    promiseScratches: "Hạn chế xước sơn",
    combosTitle: "Gói chăm sóc xe toàn diện.",
    combosDesc: "Tiết kiệm đến 30% khi chọn combo. Quy trình chăm sóc hoàn tất dưới 45 phút với dung dịch bảo vệ bóng sơn cao cấp.",
    reviewsTitle: "Hơn 10,000 khách hàng hài lòng.",
    reviewsDesc: "Đọc phản hồi từ những khách hàng thực tế đã tin tưởng giao xe cho Aura Car Care.",
    ctaEyebrow: "Đặt lịch chỉ trong vài giây",
    ctaTitle: "Trải nghiệm dịch vụ chăm sóc xe cao cấp ngay hôm nay.",
    ctaDesc: "Chọn khung giờ trực tuyến và bỏ qua hàng chờ. Quy trình rửa xe được theo dõi minh bạch.",
    ctaButton: "Đặt lịch rửa xe ngay",
    footerDesc: "Hệ thống rửa xe tự động không chạm theo tiêu chuẩn kiểm tra hiện đại.",
    footerHours: "T2 - CN: 7:00 AM - 8:00 PM",
    footerRights: "Bản quyền thuộc về Aura Car Care. Bảo lưu mọi quyền.",
    resultsEyebrow: "Cam kết của chúng tôi",
    resultsTitle: "Vì sao Aura nổi bật?",
    resultsDesc: "Mỗi xe được quét tự động trước khi rửa để đảm bảo an toàn. Hệ thống phun không chạm giúp hạn chế trầy xước tối đa.",
    resultsTouchless: "Không chạm",
    resultsScratches: "Trầy xước sơn",
    combosEyebrow: "Gói Combo AURA",
    reviewsEyebrow: "Đánh giá từ khách hàng",
    footerQuickLinks: "Liên kết nhanh",
    footerContact: "Liên hệ",
    footerAddress: "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
    footerPhone: "0901 234 567",
    footerEmail: "contact@auracarcare.vn",
    getThisPack: "Nhận gói này",
    savingsLabel: "Tiết kiệm",
  },
  en: {
    navServices: "Services",
    navCombos: "Combos",
    navReviews: "Reviews",
    navContact: "Contact",
    login: "Login",
    register: "Sign Up",
    tagline: "Carwash",
    heroTitle: "The Best Car Wash",
    heroSubtitle: "Book in 30 seconds. Skip the line. Premium finish, fully transparent.",
    bookNow: "Book Now",
    viewServices: "View Services",
    featureBookingTitle: "Book in 30s",
    featureBookingDesc: "Select your time slot and get instant confirmation.",
    featurePromiseTitle: "100% Satisfaction",
    featurePromiseDesc: "Satisfaction-first premium service promise.",
    featureLoungeTitle: "5-Star Lounge",
    featureLoungeDesc: "Wi-Fi, drinks, and a comfortable waiting space.",
    facilityTitle: "Unmatched service experience.",
    facilityDesc: "Relax in our comfortable waiting lounge while our technical team completes the touchless wash and paint gloss care.",
    beforeLabel: "Premium wash technology",
    afterLabel: "Showroom deep gloss",
    beforeDesc: "Dirty, dusty, and lost gloss.",
    afterDesc: "Finished with premium gloss and clean details.",
    loungeDesc: "Enjoy specialty coffee, free high-speed Wi-Fi, and air conditioning inside our modern viewing lounge.",
    loungeTag: "Available for all bookings",
    servicesTitle: "Our comprehensive services.",
    servicesDesc: "Choose a service package that fits your vehicle care needs. All washes utilize premium foam and RO purified water.",
    promiseEyebrow: "Our Promise",
    promiseTitle: "German standard diagnostics & safety.",
    promiseDesc: "Each vehicle is scanned automatically before washing to ensure safety. The touchless spray system minimizes paint scratches.",
    promiseTouchless: "Touchless Wash",
    promiseScratches: "Paint Protection",
    combosTitle: "Complete vehicle care packages.",
    combosDesc: "Save up to 30% with combo packages. Care completed in under 45 minutes with premium paint sealant protection.",
    reviewsTitle: "Over 10,000 satisfied reviews.",
    reviewsDesc: "Read verified feedback from our daily customers who trust Aura Car Care with their vehicles.",
    ctaEyebrow: "Book in seconds",
    ctaTitle: "Experience premium car care today.",
    ctaDesc: "Choose your time slot online and skip the line. The touchless wash process is transparently monitored.",
    ctaButton: "Book Your Wash Now",
    footerDesc: "Automated touchless car wash system adhering to modern quality standards.",
    footerHours: "Mon - Sun: 7:00 AM - 8:00 PM",
    footerRights: "Aura Car Care. All rights reserved.",
    resultsEyebrow: "Our Promise",
    resultsTitle: "Why we stand out.",
    resultsDesc: "Each vehicle is scanned automatically before washing to ensure safety. The touchless spray system minimizes paint scratches.",
    resultsTouchless: "Touchless Wash",
    resultsScratches: "Paint Protection",
    combosEyebrow: "Aura Combos",
    reviewsEyebrow: "Aura Reviews",
    footerQuickLinks: "Quick links",
    footerContact: "Contact",
    footerAddress: "123 Nguyen Van Linh, District 7, HCMC",
    footerPhone: "0901 234 567",
    footerEmail: "contact@auracarcare.vn",
    getThisPack: "Get this pack",
    savingsLabel: "Save",
  }
};

const navigationItems = [
  { href: "#services", label: "Services" },
  { href: "#combos", label: "Packages" },
  { href: "#reviews", label: "Reviews" },
  { href: "#contact", label: "Contact" },
];

export function HomePageView() {
  const [authMode, setAuthMode] = useState<"login" | "register" | "otp" | "forgot-password" | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const { language, setLanguage, hydrateLanguage } = useLanguageStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const copy = HOME_COPY[language];

  // Fetch actual packages from backend API
  const {
    data: publicPackages = [],
    isError: packagesError,
    isLoading: packagesLoading,
  } = useQuery({
    queryKey: ["public-packages"],
    queryFn: () => listBookingPackages(1, 10),
  });

  const packagesData = useMemo(() => {
    const icons = ["💧", "✨", "🏆", "⚙️", "🧼"];
    return publicPackages.map((p, idx) => ({
      id: p.packageId,
      name: p.name,
      description: p.description,
      price: p.basePrice,
      duration: `${p.duration} phút`,
      icon: icons[idx % icons.length],
    }));
  }, [publicPackages]);

  // Hydrate language on mount
  useEffect(() => {
    hydrateLanguage();
  }, [hydrateLanguage]);

  // BR-19: Redirect logged-in users to their respective workspaces or customer booking page if preselected
  useEffect(() => {
    if (accessToken && user) {
      const preselected = localStorage.getItem("preselected_booking");
      if (preselected && user.role === "CUSTOMER") {
        const { type, id } = JSON.parse(preselected);
        localStorage.removeItem("preselected_booking");
        router.replace(`/customer/booking?type=${type}&id=${id}`);
      } else {
        router.replace(getAuthRedirectPath(user.role));
      }
    }
  }, [accessToken, user, router]);

  const handleBookClick = useCallback((id: string, type: "package" | "combo" = "package") => {
    if (accessToken && user) {
      router.push(`/customer/booking?type=${type}&id=${id}`);
    } else {
      localStorage.setItem("preselected_booking", JSON.stringify({ type, id }));
      setAuthMode("login");
    }
  }, [accessToken, user, router]);


  const handleOpenAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
  };

  const handleCloseAuth = () => {
    setAuthMode(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const auth = params.get("auth");
      if (auth === "login" || auth === "register") {
        setAuthMode(auth);
      } else if (auth === "forgot-password") {
        setAuthMode("forgot-password");
      }
      if (auth === "login" || auth === "register" || auth === "forgot-password") {
        // Clear query parameter from the URL bar without reloading
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const translatedServices = useMemo(() => {
    return packagesData.map((s) => {
      if (language === "en") {
        const normalizedName = s.name.toLowerCase();
        if (normalizedName.includes("rửa nhanh")) return { ...s, name: "Quick Wash", description: "Quick exterior wash in 15 mins", duration: "15 mins" };
        if (normalizedName.includes("rửa cao cấp")) return { ...s, name: "Premium Wash", description: "Exterior wash and interior vacuuming", duration: "30 mins" };
        if (normalizedName.includes("chăm sóc chuyên sâu")) return { ...s, name: "Deep Detailing", description: "Detailed cleaning inside and out", duration: "90 mins" };
        if (normalizedName.includes("khoang máy")) return { ...s, name: "Engine Cleaning", description: "Safe engine cleaning", duration: "45 mins" };
      }
      return s;
    });
  }, [packagesData, language]);

  const translatedCombos = useMemo(() => {
    return homeCombos.map((c) => {
      if (language === "en") {
        if (c.id === "c1") return { ...c, name: "Monthly Silver", description: "8 quick washes per month", badge: "Most Popular", services: ["Quick Wash x8"] };
        if (c.id === "c2") return { ...c, name: "Monthly Gold", description: "4 premium washes & 2 deep detailings", badge: "Best Value", services: ["Premium Wash x4", "Deep Detail x2"] };
        if (c.id === "c3") return { ...c, name: "Corporate Fleet", description: "20 washes for company vehicles", badge: "For Business", services: ["Quick Wash x20"] };
      }
      return c;
    });
  }, [language]);

  const translatedTestimonials = useMemo(() => {
    return homeTestimonials.map((t) => {
      if (language === "en") {
        if (t.id === "t1") return { ...t, name: "Mr. Hung", content: "Very thorough washing, comfortable lounge, I will return." };
        if (t.id === "t2") return { ...t, name: "Mrs. Lan", content: "Booked in 30 seconds, no more waiting in line." };
        if (t.id === "t3") return { ...t, name: "Mr. Tuan", content: "Modern car wash technology, paint layer protected visibly." };
      }
      return t;
    });
  }, [language]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05080d] text-white">

      <PublicHeader onOpenAuth={handleOpenAuth} language={language} onChangeLanguage={setLanguage} copy={copy} />
      <HeroSection onOpenAuth={handleOpenAuth} copy={copy} />
      <FacilitySection copy={copy} />
      <ServicesSection onBookClick={handleBookClick} copy={copy} services={translatedServices} isLoading={packagesLoading} isError={packagesError} />
      <ResultsSection copy={copy} />
      <CombosSection onBookClick={handleBookClick} onOpenAuth={handleOpenAuth} copy={copy} combos={translatedCombos} />
      <ReviewsSection copy={copy} testimonials={translatedTestimonials} />
      <CallToActionSection onOpenAuth={handleOpenAuth} copy={copy} />
      <PublicFooter copy={copy} />

      {/* Side-by-side Auth Modal Popup */}
      {authMode && (
        <ModernAuthPopupModal
          mode={authMode}
          otpEmail={otpEmail}
          setOtpEmail={setOtpEmail}
          setMode={setAuthMode}
          onClose={handleCloseAuth}
          language={language}
          setLanguage={setLanguage}
        />
      )}
    </main>
  );
}

function PublicHeader({
  onOpenAuth,
  language,
  onChangeLanguage,
  copy,
}: {
  onOpenAuth: (mode: "login" | "register") => void;
  language: "vi" | "en";
  onChangeLanguage: (lang: "vi" | "en") => void;
  copy: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "#services", label: copy.navServices },
    { href: "#combos", label: copy.navCombos },
    { href: "#reviews", label: copy.navReviews },
    { href: "#contact", label: copy.navContact },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        isScrolled
          ? "border-cyan-300/15 bg-[#05080d]/88 shadow-[0_18px_50px_rgba(0,240,220,0.08)] backdrop-blur-xl"
          : "border-transparent bg-[#05080d]/72 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 shadow-[0_0_28px_rgba(45,255,238,0.16)] ring-1 ring-cyan-300/25 transition-transform duration-300 hover:scale-105">
            <Image src="/logo.png" alt="AutoWash Pro" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-cyan-300 sm:text-[0.7rem] sm:tracking-[0.28em]">
              AutoWash Pro
            </p>
            <p className="truncate text-sm font-semibold text-white/90">Aura Car Care</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/66 transition duration-300 hover:-translate-y-0.5 hover:text-cyan-200"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {/* Aesthetic Language Switcher Capsule */}
          <div className="mr-2 flex rounded-full border border-cyan-300/20 bg-white/6 p-1 shadow-inner backdrop-blur-sm transition-all duration-300">
            {(["vi", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onChangeLanguage(item)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-black uppercase transition-all duration-300",
                  language === item
                    ? "scale-105 bg-cyan-300 text-slate-950 shadow-md shadow-cyan-300/25"
                    : "text-white/55 hover:text-white"
                )}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            className="rounded-full px-5 text-sm font-semibold text-white/80 transition-transform duration-300 hover:scale-[1.02] hover:bg-white/8 hover:text-white"
            onClick={() => onOpenAuth("login")}
          >
            {copy.login}
          </Button>
          <Button
            className="rounded-full bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_12px_32px_rgba(45,255,238,0.24)] transition-transform duration-300 hover:scale-[1.02] hover:bg-cyan-200"
            onClick={() => onOpenAuth("register")}
          >
            {copy.register}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/20 bg-white/8 text-white shadow-sm transition-transform duration-300 hover:scale-105 lg:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="animate-in fade-in slide-in-from-top-2 border-t border-cyan-300/15 bg-[#071016]/96 px-4 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.28)] duration-300 lg:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-cyan-200"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          
          <div className="mt-4 flex justify-center">
            <div className="flex w-fit rounded-full border border-cyan-300/20 bg-white/6 p-1 shadow-sm">
              {(["vi", "en"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChangeLanguage(item);
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-black uppercase transition",
                    language === item ? "bg-cyan-300 text-slate-950 shadow-sm" : "text-white/55 hover:text-white",
                  )}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-full" onClick={() => { setIsOpen(false); onOpenAuth("login"); }}>
              {copy.login}
            </Button>
            <Button className="rounded-full" onClick={() => { setIsOpen(false); onOpenAuth("register"); }}>
              {copy.register}
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HeroSection({ onOpenAuth, copy }: { onOpenAuth: (mode: "login" | "register") => void; copy: Record<string, string> }) {
  return (
    <section className="relative overflow-hidden bg-[#05080d] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="absolute inset-0">
        <Image src="/images/detailer-side-wash.png" alt="" fill sizes="100vw" className="object-cover opacity-18" priority />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,13,0.92),rgba(5,8,13,0.74)_46%,rgba(5,8,13,0.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(45,255,238,0.15),transparent_28rem),radial-gradient(circle_at_82%_32%,rgba(10,116,120,0.24),transparent_32rem)]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0d6c6b]/35 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-cyan-300/12 bg-[#071016] px-5 py-8 shadow-[0_30px_110px_rgba(0,0,0,0.50)] sm:px-8 lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:42px_42px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(45,255,238,0.18),transparent_22rem)]" />
          <div className="absolute left-12 top-1/2 h-7 w-7 rotate-45 rounded-[0.35rem] bg-cyan-300 shadow-[0_0_30px_rgba(45,255,238,0.56)]" />
          <div className="absolute bottom-24 right-16 h-4 w-4 rounded-full border border-cyan-300/70 shadow-[0_0_18px_rgba(45,255,238,0.45)]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.92fr_0.72fr] lg:items-start">
            <div>
          <FadeIn delay={0}>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/6 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-[0_0_28px_rgba(45,255,238,0.12)] backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {copy.tagline}
            </div>
          </FadeIn>

          <FadeIn delay={100}>
                <h1 className="mt-6 max-w-3xl break-words text-[clamp(3rem,12vw,7.6rem)] font-black leading-[0.86] tracking-[-0.06em] text-white sm:text-[clamp(4.5rem,8vw,7.6rem)] [text-shadow:0_18px_50px_rgba(0,0,0,0.38)]">
              {copy.heroTitle}
            </h1>
          </FadeIn>
            </div>

            <div className="lg:pt-12">
          <FadeIn delay={180}>
                <p className="max-w-sm break-words text-base leading-7 text-white/66">
              {copy.heroSubtitle}
            </p>
          </FadeIn>

          <FadeIn delay={260}>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-full bg-cyan-300 px-7 text-sm font-black text-slate-950 shadow-[0_14px_34px_rgba(45,255,238,0.28)] transition-transform duration-300 hover:scale-[1.02] hover:bg-cyan-200"
                onClick={() => onOpenAuth("login")}
              >
                {copy.bookNow}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-cyan-300/25 bg-white/6 px-7 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] hover:bg-white/10"
                asChild
              >
                <a href="#services">{copy.viewServices}</a>
              </Button>
            </div>
          </FadeIn>
            </div>
          </div>

          <FadeIn delay={320} className="relative z-10 mt-8">
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-x-[8%] bottom-2 h-12 rounded-[999px] border-4 border-cyan-300 shadow-[0_0_34px_rgba(45,255,238,0.62),inset_0_0_24px_rgba(45,255,238,0.28)]" />
              <div className="absolute inset-x-[12%] bottom-8 h-20 rounded-full bg-cyan-300/18 blur-3xl" />
              <Image
                src={homeGallery[3].src}
                alt={homeGallery[3].alt}
                width={1200}
                height={720}
                sizes="(min-width: 1024px) 56rem, 92vw"
                priority
                className="relative z-10 mx-auto h-[18rem] w-full max-w-4xl rounded-[2rem] object-cover object-center shadow-[0_32px_90px_rgba(0,0,0,0.46)] [clip-path:polygon(4%_10%,96%_0,100%_88%,0_100%)] sm:h-[24rem] lg:h-[28rem]"
              />
              <div className="absolute left-4 top-1/4 z-20 hidden rounded-[1.4rem] border border-cyan-300/18 bg-[#071016]/82 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.36)] backdrop-blur md:block">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Aura Care</p>
                <p className="mt-1 text-sm font-semibold text-white/80">{copy.featurePromiseTitle}</p>
              </div>
              <div className="absolute right-3 top-8 z-20 hidden overflow-hidden rounded-[1.3rem] border border-cyan-300/18 bg-white/8 shadow-[0_18px_48px_rgba(0,0,0,0.36)] backdrop-blur md:block">
                <Image src="/images/soap-tail-detail.png" alt="Detailed foam wash" width={176} height={112} sizes="11rem" className="h-28 w-44 object-cover opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(45,255,238,0.44)]">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-3">
            <FadeIn delay={420}>
              <TrustItem icon={Clock3} title={copy.featureBookingTitle} description={copy.featureBookingDesc} />
            </FadeIn>
            <FadeIn delay={500}>
              <TrustItem icon={Shield} title={copy.featurePromiseTitle} description={copy.featurePromiseDesc} />
            </FadeIn>
            <FadeIn delay={580}>
              <TrustItem icon={Star} title={copy.featureLoungeTitle} description={copy.featureLoungeDesc} />
            </FadeIn>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div className="grid grid-cols-[1fr_0.62fr] gap-3">
            <Image src="/images/detailer-side-wash.png" alt="Professional hand detailing" width={520} height={384} sizes="(min-width: 1024px) 32rem, 60vw" className="h-64 rounded-[2rem] object-cover shadow-[0_24px_70px_rgba(0,0,0,0.35)]" />
            <div className="grid gap-3">
              <Image src="/images/soap-tail-detail.png" alt="Foam tail detail" width={320} height={180} sizes="14rem" className="h-28 rounded-[1.4rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.28)]" />
              <Image src="/images/wash-bay-foam-front.png" alt="Foam wash bay" width={320} height={200} sizes="14rem" className="h-32 rounded-[1.4rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.28)]" />
            </div>
          </div>
          <div className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-7 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              {copy.navServices === "Dịch vụ" ? "Về Aura" : "About us"}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-white">
              {copy.navServices === "Dịch vụ" ? "Hơn cả một lần rửa xe" : "More than just a car wash"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/62">{copy.facilityDesc}</p>
            <Button
              className="mt-6 rounded-full bg-cyan-300 text-sm font-black text-slate-950 hover:bg-cyan-200"
              onClick={() => onOpenAuth("login")}
            >
              {copy.bookNow}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FacilitySection({ copy }: { copy: Record<string, string> }) {
  return (
    <SectionShell
      id="facility"
      eyebrow={copy.navServices === "Dịch vụ" ? "Không gian AURA" : "Aura facility"}
      title={copy.facilityTitle}
      description={copy.facilityDesc}
      className="bg-[#05080d]"
      invert
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <BeforeAfterCard image="/images/soap-tail-detail.png" title={copy.beforeLabel} copy={copy} />
        <BeforeAfterCard image="/images/detailer-side-wash.png" title={copy.afterLabel} copy={copy} />
        <div className="overflow-hidden rounded-[2rem] border border-cyan-300/14 bg-white/7 shadow-[0_22px_60px_rgba(0,0,0,0.34)] transition-transform duration-500 hover:-translate-y-1">
          <div className="relative">
            <Image
              src="/images/5-star-lounge.png"
              alt="5-Star Lounge"
              width={900}
              height={620}
              sizes="(min-width: 1024px) 50vw, 92vw"
              className="h-[18rem] w-full object-cover transition-transform duration-700 hover:scale-[1.03] sm:h-[24rem]"
            />
            <div className="absolute left-5 top-5 rounded-full border border-white/55 bg-slate-950/30 px-5 py-2 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.28)] backdrop-blur-xl [text-shadow:0_1px_8px_rgba(15,23,42,0.42)]">
              {copy.navServices === "Dịch vụ" ? "Lounge chuẩn 5 sao" : "5-star lounge"}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function ServicesSection({
  onBookClick,
  copy,
  services,
  isLoading,
  isError,
}: {
  onBookClick: (id: string, type?: "package" | "combo") => void;
  copy: Record<string, string>;
  services: any[];
  isLoading: boolean;
  isError: boolean;
}) {
  const servicePlaceholders = homeServices.slice(0, 4);

  return (
    <SectionShell
      id="services"
      eyebrow={copy.navServices === "Dịch vụ" ? "Dịch vụ AURA" : "AURA Services"}
      title={copy.servicesTitle}
      description={copy.servicesDesc}
      className="relative bg-[#0d6c6b] py-24 before:absolute before:inset-x-0 before:-top-10 before:h-20 before:rounded-[0_0_50%_50%] before:bg-[#05080d] after:absolute after:left-8 after:top-16 after:h-9 after:w-9 after:rotate-45 after:bg-cyan-300"
      invert
    >
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicePlaceholders.map((service) => (
            <article key={service.id} className="rounded-[1.6rem] border border-cyan-200/25 bg-cyan-200/20 p-6 shadow-[0_20px_50px_rgba(45,255,238,0.10)]">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/30" />
                <div className="h-7 w-24 animate-pulse rounded-full bg-white/24" />
              </div>
              <div className="mt-7 h-6 w-3/4 animate-pulse rounded-full bg-white/28" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/22" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-white/22" />
              <div className="mt-8 flex items-center justify-between border-t border-white/18 pt-5">
                <div className="h-7 w-28 animate-pulse rounded-full bg-white/28" />
                <div className="h-10 w-28 animate-pulse rounded-full bg-slate-950/25" />
              </div>
            </article>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-[1.6rem] border border-cyan-200/30 bg-white/10 p-8 text-center shadow-[0_20px_50px_rgba(45,255,238,0.10)] backdrop-blur">
          <p className="text-lg font-black text-white">
            {copy.navServices === "Dịch vụ" ? "Chưa tải được gói dịch vụ" : "Unable to load service packages"}
          </p>
          <p className="mt-2 text-sm font-medium text-white/65">
            {copy.navServices === "Dịch vụ"
              ? "Vui lòng kiểm tra backend hoặc thử tải lại trang."
              : "Please check the backend service or refresh the page."}
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-[1.6rem] border border-cyan-200/30 bg-white/10 p-8 text-center shadow-[0_20px_50px_rgba(45,255,238,0.10)] backdrop-blur">
          <p className="text-lg font-black text-white">
            {copy.navServices === "Dịch vụ" ? "Chưa có gói dịch vụ khả dụng" : "No service packages available"}
          </p>
          <p className="mt-2 text-sm font-medium text-white/65">
            {copy.navServices === "Dịch vụ"
              ? "Dữ liệu sẽ hiển thị khi backend trả về danh sách package."
              : "Packages will appear here once the backend returns data."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onBookClick={onBookClick} copy={copy} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function ResultsSection({ copy }: { copy: Record<string, string> }) {
  return (
    <section className="relative overflow-hidden bg-[#05080d] py-24 text-white">
      <div className="absolute inset-0">
        <Image src="/images/detailer-side-wash.png" alt="" fill sizes="100vw" className="object-cover opacity-26" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,13,0.96)_0%,rgba(5,8,13,0.78)_50%,rgba(5,8,13,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(45,255,238,0.14),transparent_34%),linear-gradient(180deg,rgba(13,108,107,0.28),transparent_45%)]" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">{copy.resultsEyebrow}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {copy.resultsTitle}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              {copy.resultsDesc}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="border-l-2 border-cyan-300 pl-4">
                <p className="text-2xl font-black tracking-tight text-white">100%</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mt-1">{copy.resultsTouchless}</p>
              </div>
              <div className="border-l-2 border-cyan-300 pl-4">
                <p className="text-2xl font-black tracking-tight text-white">0%</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mt-1">{copy.resultsScratches}</p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-cyan-300/14 shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
            <Image
              src="/images/wash-bay-foam-front.png"
              alt="Premium foam wash diagnostics"
              width={920}
              height={620}
              sizes="(min-width: 1024px) 50vw, 92vw"
              className="h-80 w-full object-cover transition-transform duration-700 hover:scale-[1.03] sm:h-96"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CombosSection({
  onBookClick,
  onOpenAuth,
  copy,
  combos,
}: {
  onBookClick: (id: string, type?: "package" | "combo") => void;
  onOpenAuth: (mode: "login" | "register") => void;
  copy: Record<string, string>;
  combos: any[];
}) {
  const featuredCombo = combos.find((combo) => combo.highlight) ?? combos[0];
  const secondaryCombos = combos.filter((combo) => combo.id !== featuredCombo?.id);

  return (
    <section id="combos" className="relative overflow-hidden bg-[#05080d] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <Image src="/images/wash-bay-foam-front.png" alt="" fill sizes="100vw" className="object-cover opacity-34" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,13,0.96)_0%,rgba(5,8,13,0.78)_48%,rgba(5,8,13,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(45,255,238,0.16),transparent_24rem),radial-gradient(circle_at_24%_62%,rgba(13,108,107,0.26),transparent_28rem)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl">
        <Reveal className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">{copy.combosEyebrow}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{copy.combosTitle}</h2>
            <p className="mt-4 text-base leading-7 text-white/62">{copy.combosDesc}</p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full border border-cyan-300/18 bg-white/7 px-4 py-2 text-sm font-semibold text-white/75 shadow-[0_0_26px_rgba(45,255,238,0.12)] backdrop-blur">
            <Phone className="h-4 w-4 text-cyan-300" />
            {copy.footerPhone}
          </div>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          {featuredCombo ? (
            <ComboCard combo={featuredCombo} onBookClick={onBookClick} copy={copy} featured />
          ) : null}
          <div className="grid gap-5">
            {secondaryCombos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} onBookClick={onBookClick} copy={copy} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection({
  copy,
  testimonials,
}: {
  copy: Record<string, string>;
  testimonials: any[];
}) {
  return (
    <SectionShell
      id="reviews"
      eyebrow={copy.reviewsEyebrow}
      title={copy.reviewsTitle}
      description={copy.reviewsDesc}
      className="bg-[#05080d]"
      invert
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="flex flex-col justify-between rounded-[1.4rem] border border-cyan-300/12 bg-[#12242b] p-7 shadow-[0_18px_48px_rgba(0,0,0,0.26)]">
            <div>
              <Quote className="h-6 w-6 text-cyan-300" />
              <p className="mt-4 text-sm leading-7 text-white/70 italic">
                &ldquo;{testimonial.content}&rdquo;
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-cyan-300/20 bg-cyan-300/12">
                <div className="flex h-full w-full items-center justify-center bg-cyan-300/12 text-xs font-bold text-cyan-200">
                  {testimonial.name[0]}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{testimonial.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function CallToActionSection({
  onOpenAuth,
  copy,
}: {
  onOpenAuth: (mode: "login" | "register") => void;
  copy: Record<string, string>;
}) {
  return (
    <section className="relative overflow-hidden bg-[#05080d] px-4 py-28 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <Image src="/images/soap-tail-detail.png" alt="" fill sizes="100vw" className="object-cover opacity-34" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,13,0.96),rgba(5,8,13,0.72)_52%,rgba(5,8,13,0.92))]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[#0d6c6b]/45 blur-2xl" />
        <div className="absolute left-8 top-12 h-10 w-10 rotate-45 rounded-[0.35rem] bg-cyan-300 shadow-[0_0_34px_rgba(45,255,238,0.55)]" />
      </div>
      <div className="mx-auto max-w-4xl text-center relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{copy.ctaEyebrow}</p>
        <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
          {copy.ctaTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300">
          {copy.ctaDesc}
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="h-12 rounded-full bg-cyan-300 px-8 text-sm font-black text-slate-950 shadow-[0_12px_32px_rgba(45,255,238,0.28)] transition-all hover:scale-[1.02] hover:bg-cyan-200 active:scale-[0.98]"
            onClick={() => onOpenAuth("login")}
          >
            {copy.ctaButton}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function PublicFooter({ copy }: { copy: Record<string, string> }) {
  return (
    <footer className="border-t border-cyan-300/10 bg-[#030609]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 shadow ring-1 ring-cyan-300/20">
              <Image src="/logo.png" alt="AutoWash Pro" width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
            </div>
            <p className="text-sm font-bold text-white">Aura Car Care</p>
          </div>
          <p className="text-xs leading-6 text-white/52">
            {copy.footerDesc}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">{copy.footerQuickLinks}</p>
          <div className="mt-5 grid gap-3 text-sm text-white/58">
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-cyan-200">
                {item.label === "Services" ? copy.navServices : item.label === "Packages" ? copy.navCombos : item.label === "Reviews" ? copy.navReviews : copy.navContact}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">{copy.footerContact}</p>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-white/58">
            <p>{copy.footerAddress}</p>
            <p>{copy.footerPhone}</p>
            <p>{copy.footerEmail}</p>
            <p>{copy.footerHours}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-cyan-300/10 px-4 py-5 text-center text-xs text-white/45 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} {copy.footerRights}
      </div>
    </footer>
  );
}



function FadeIn({
  children,
  delay = 0,
  className,
  yClass = "translate-y-6",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  yClass?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in duration-700 ease-out fill-mode-both motion-reduce:animate-none",
        yClass,
        className,
      )}
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  className,
  invert = false,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  invert?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("relative px-4 py-20 sm:px-6 lg:px-8", className)}>
      <div className="relative z-10 mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.24em]",
              invert ? "text-cyan-300" : "text-cyan-300",
            )}
          >
            {eyebrow}
          </p>
          <h2
            className={cn(
              "mt-4 text-3xl font-black tracking-tight sm:text-4xl",
              invert ? "text-white" : "text-white",
            )}
          >
            {title}
          </h2>
          <p className={cn("mt-4 text-base leading-7", invert ? "text-white/60" : "text-white/60")}>
            {description}
          </p>
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function TrustItem({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-cyan-300/14 bg-white/7 p-4 shadow-[0_18px_46px_rgba(0,0,0,0.24)] backdrop-blur transition-transform duration-300 hover:-translate-y-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/58">{description}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
    </div>
  );
}

function MiniFeatureCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] border border-cyan-300/14 bg-white/7 p-6 shadow-[0_22px_56px_rgba(0,0,0,0.30)] backdrop-blur transition-transform duration-500 hover:-translate-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{title}</p>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/6 px-4 py-3 transition duration-300 hover:bg-cyan-300/10">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/14 text-cyan-200">
              <Check className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-medium leading-6 text-white/70">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  onBookClick,
  copy,
}: {
  service: HomeService;
  onBookClick: (id: string, type?: "package" | "combo") => void;
  copy: Record<string, string>;
}) {
  return (
    <article className="group rounded-[1.6rem] border border-cyan-200/40 bg-cyan-300 p-6 text-slate-950 shadow-[0_20px_50px_rgba(45,255,238,0.14)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(45,255,238,0.22)]">
      <div className="flex items-center justify-between">
        <span className="text-3xl transition-transform duration-300 group-hover:scale-110">{service.icon}</span>
        <span className="rounded-full bg-slate-950/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-950">
          {service.duration}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{service.name}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-800/78">{service.description}</p>
      <div className="mt-6 flex items-center justify-between border-t border-slate-950/10 pt-5">
        <div>
          <p className="text-2xl font-black tracking-tight text-slate-950">
            {formatBookingCurrency(service.price)}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-slate-950/15 bg-slate-950 px-4 text-sm font-black text-white transition-transform duration-300 hover:scale-[1.02] hover:bg-slate-800"
          onClick={() => onBookClick(service.id, "package")}
        >
          {copy.navServices === "Dịch vụ" ? "Đặt lịch" : "Book Now"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function BeforeAfterCard({
  title,
  image,
  copy,
}: {
  title: string;
  image: string;
  copy: Record<string, string>;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-transform duration-500 hover:-translate-y-1">
      <div className="relative">
        <Image
          src={image}
          alt={title}
          width={760}
          height={560}
          sizes="(min-width: 1024px) 33vw, 92vw"
          className="h-[18rem] w-full object-cover transition-transform duration-700 hover:scale-[1.03] sm:h-[24rem]"
        />
        <div className="absolute left-5 top-5 rounded-full border border-white/55 bg-slate-950/30 px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.28)] backdrop-blur-xl [text-shadow:0_1px_8px_rgba(15,23,42,0.42)]">
          {title}
        </div>
      </div>
    </div>
  );
}

function ComboCard({
  combo,
  onBookClick,
  copy,
  featured = false,
}: {
  combo: HomeCombo;
  onBookClick: (id: string, type: "combo") => void;
  copy: Record<string, string>;
  featured?: boolean;
}) {
  const savings = combo.originalPrice - combo.comboPrice;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[1.55rem] border transition duration-500 hover:-translate-y-1",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.22)_22%,transparent_42%)] before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100",
        featured
          ? "min-h-full border-cyan-200/55 bg-cyan-300 p-7 text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_26px_80px_rgba(45,255,238,0.18)]"
          : "border-cyan-300/18 bg-[#122b31]/82 p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl",
      )}
    >
      <div className="relative z-10 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            featured ? "bg-slate-950/10 text-3xl" : "bg-cyan-300 text-2xl text-slate-950 shadow-[0_0_24px_rgba(45,255,238,0.18)]",
          )}
        >
          {featured ? "🚘" : "🧼"}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {combo.badge ? (
            <span
              className={cn(
                "max-w-full rounded-full border px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] backdrop-blur",
                featured
                  ? "border-[#6ff7ff]/45 bg-[#06111a] text-[#a9fbff] shadow-[0_12px_28px_rgba(2,6,23,0.22),0_0_18px_rgba(45,255,238,0.16)]"
                  : "border-cyan-200/28 bg-slate-950/44 text-cyan-100 shadow-[0_0_22px_rgba(45,255,238,0.12)]",
              )}
            >
              {combo.badge}
            </span>
          ) : null}

          {!featured ? (
            <Button
              size="sm"
              className="h-10 shrink-0 rounded-full bg-cyan-300 px-5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(45,255,238,0.18)] hover:bg-cyan-200"
              onClick={() => onBookClick(combo.id, "combo")}
            >
              {copy.getThisPack}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative z-10">
        <div>
          <h3 className={cn("font-black tracking-tight", featured ? "text-2xl text-slate-950" : "text-2xl text-white")}>{combo.name}</h3>
          <p className={cn("mt-3 text-sm leading-7", featured ? "text-slate-800/78" : "max-w-xl text-white/64")}>{combo.description}</p>
        </div>
      </div>

      <div className={cn("relative z-10 mt-6 py-5", featured ? "border-y border-slate-950/12" : "border-y border-white/12")}>
        <p className={cn("text-3xl font-black tracking-tight", featured ? "text-slate-950" : "text-white")}>
          {formatBookingCurrency(combo.comboPrice)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className={cn("line-through", featured ? "text-slate-700/54" : "text-white/38")}>
            {formatBookingCurrency(combo.originalPrice)}
          </span>
          <span className={cn("rounded-full px-3 py-1 font-bold", featured ? "bg-slate-950/10 text-slate-950" : "bg-cyan-300/12 text-cyan-200")}>
            {copy.savingsLabel} {formatBookingCurrency(savings)}
          </span>
        </div>
      </div>

      <ul className={cn("relative z-10 mt-6 grid gap-3", featured ? "" : "sm:grid-cols-2")}>
        {combo.services.map((item) => (
          <li key={item} className={cn("flex items-start gap-3 text-sm leading-6", featured ? "font-semibold text-slate-900/82" : "text-white/72")}>
            <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full", featured ? "bg-slate-950/10 text-slate-950" : "bg-cyan-300/14 text-cyan-200")}>
              <Check className="h-3.5 w-3.5" />
            </span>
            {item}
          </li>
        ))}
      </ul>

      {featured ? (
        <Button
          size="lg"
          className="relative z-10 mt-8 h-12 w-full rounded-full bg-slate-950 text-sm font-black text-white transition-transform duration-300 hover:scale-[1.02] hover:bg-slate-800"
          onClick={() => onBookClick(combo.id, "combo")}
        >
          {copy.getThisPack}
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : null}
    </article>
  );
}

function MotionStyles() {
  return (
    <style jsx global>{`
      @keyframes floatSoft {
        0%,
        100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -15px, 0);
        }
      }
    `}</style>
  );
}
