"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  ClipboardList,
  Gift,
  Sparkles,
  UserRound,
  MessageSquare,
  ThumbsUp,
  Share2,
  TrendingUp,
  Calendar,
  Flame,
  Star,
  Zap,
  Info,
  ChevronRight,
  Droplets,
  Shield,
  Check,
  CircleDot,
  X,
  ShieldCheck,
  HelpCircle,
  Clock,
  Clock3,
} from "lucide-react";
import { Card } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";
import { TierBadge } from "@/shared/ui/customer/customer-experience";
import { useCustomerProfile } from "@/features/profile/hooks/use-customer-profile";
import { useBlogArticles, useBlogCategories } from "@/features/blog/hooks/use-blog";
import { useCustomerBookings, useActiveWashTracking } from "@/features/bookings/hooks/use-bookings";
import { useBookingPackages, useBookingCombos } from "@/features/bookings/hooks/use-bookings";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import {
  CustomerExperienceStyles,
  FeatureSection,
  FloatingBookingButton,
  FloatingWashSessionBubble,
  MembershipFloatingCard,
} from "@/shared/ui/customer/customer-experience";

const heroSlides = [
  "/images/featured-detailing.jpg",
  "/images/gallery1.jpg",
  "/images/gallery2.jpg",
];

const mockWhyItems = [
  {
    title: { vi: "Phục hồi độ sáng bóng", en: "Restore Showroom Shine" },
    description: {
      vi: "Đạt độ sáng bóng chuẩn showroom với quy trình tối ưu và kỹ lưỡng.",
      en: "Restore showroom shine with an optimized and rigorous process.",
    },
    image: "/images/gallery0.jpg",
    icon: "sparkles" as const,
  },
  {
    title: { vi: "Kỹ thuật viên chuyên nghiệp", en: "Certified Professionals" },
    description: {
      vi: "Đội ngũ giàu kinh nghiệm được đào tạo bài bản và có chứng chỉ quốc tế.",
      en: "Experienced team trained rigorously with international certification.",
    },
    image: "/images/gallery3.jpg",
    icon: "shield" as const,
  },
  {
    title: { vi: "Bảo vệ lâu dài", en: "Long-Lasting Protection" },
    description: {
      vi: "Sử dụng hóa chất cao cấp giúp lớp bảo vệ sơn xe bền bỉ theo năm tháng.",
      en: "Premium chemicals ensuring the paint protection layer lasts for years.",
    },
    image: "/images/gallery1.jpg",
    icon: "check" as const,
  },
];

const mockBrands = [
  "Mercedes-Benz",
  "BMW",
  "Porsche",
  "Audi",
  "Lexus",
  "Toyota",
  "Honda",
  "Mazda",
];

const mockStory = {
  title: {
    vi: "Hành trình phục hồi màu sơn xe Mercedes của anh Trần",
    en: "Mr. Tran's Mercedes Paint Restoration Journey",
  },
  quote: {
    vi: '"Quy trình phục hồi tuyệt vời. Chiếc xe của tôi trông như vừa được mang ra khỏi showroom mới cứng. Đội ngũ chuyên nghiệp tận tâm!"',
    en: '"Amazing restoration process. My car looks like it was just driven out of a brand new showroom. Dedication at its finest!"',
  },
  rating: 5,
  note: { vi: "Không có phí ẩn", en: "No Hidden Fees" },
};

const mockPromo = {
  text: {
    vi: "Ưu đãi giới hạn: Giảm ngay 15% cho dịch vụ phủ Ceramic trong tuần này!",
    en: "Limited time: Save 15% on Ceramic Coating services this week!",
  },
  hh: 12,
  mm: 45,
  ss: 52,
};

function formatRating(value: number | string | null | undefined) {
  const rating = Number(value ?? 5);
  if (!Number.isFinite(rating)) return "5";
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1).replace(/\.0$/, "");
}

function toLiveSessionStatus(status: string): "PENDING" | "SCHEDULED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" {
  if (status === "CHECKED_IN" || status === "IN_PROGRESS" || status === "COMPLETED" || status === "PENDING") {
    return status;
  }
  return "SCHEDULED";
}

function toBookingDateTime(bookingDate?: string | null, bookingTime?: string | null) {
  if (!bookingDate || !bookingTime) return null;
  const normalizedTime = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
  return `${bookingDate}T${normalizedTime}`;
}

export default function CustomerHomePage() {
  const user = useAuthStore((state) => state.user);
  const { language } = useLanguageStore();

  const profileQuery = useCustomerProfile();
  const bookingsQuery = useCustomerBookings();
  const packagesQuery = useBookingPackages();
  const combosQuery = useBookingCombos();

  const activeWashQuery = useActiveWashTracking();
  const activeWash = activeWashQuery.data;

  const activeBooking = bookingsQuery.data?.items?.find((booking) =>
    ["PENDING", "SCHEDULED", "CHECKED_IN", "IN_PROGRESS", "CONFIRMED"].includes(booking.status),
  );

  const displayBooking = activeWash || activeBooking;

  const washTimestamps = useMemo(() => {
    if (!activeWash) return undefined;
    return {
      SCHEDULED: activeWash.createdAt,
      CHECKED_IN: activeWash.checkedInAt,
      IN_PROGRESS: activeWash.startedAt,
      COMPLETED: activeWash.completedAt,
    };
  }, [activeWash]);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: articles = [] } = useBlogArticles();
  const { data: categories = [] } = useBlogCategories();
  
  const [likes, setLikes] = useState<Record<string, number>>({ post1: 24, post2: 12 });
  const [hasLiked, setHasLiked] = useState<Record<string, boolean>>({});

  const t = (vi: string, en: string) => translate(language, vi, en);

  const handleLike = (id: string) => {
    if (hasLiked[id]) {
      setLikes((prev) => ({ ...prev, [id]: prev[id] - 1 }));
      setHasLiked((prev) => ({ ...prev, [id]: false }));
    } else {
      setLikes((prev) => ({ ...prev, [id]: prev[id] + 1 }));
      setHasLiked((prev) => ({ ...prev, [id]: true }));
    }
  };

  // Carousel slider state
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    hh: mockPromo.hh,
    mm: mockPromo.mm,
    ss: mockPromo.ss,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.ss > 0) {
          return { ...prev, ss: prev.ss - 1 };
        } else if (prev.mm > 0) {
          return { ...prev, mm: prev.mm - 1, ss: 59 };
        } else if (prev.hh > 0) {
          return { hh: prev.hh - 1, mm: 59, ss: 59 };
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const blogTags = useMemo(() => {
    const allTag = { id: "all", label: t("Tất cả", "All") };
    const apiTags = categories.map((cat: any) => ({
      id: cat.id,
      label: cat.name,
    }));
    return [allTag, ...apiTags];
  }, [categories, language]);

  const blogPosts = useMemo(() => {
    return articles.map((article: any) => ({
      id: article.slug,
      category: article.category.id,
      categoryLabel: article.category.name,
      title: article.title,
      excerpt: article.excerpt,
      author: article.authorName,
      readTime: "5 min read", // API doesn't provide read time yet
      image: article.thumbnailUrl || "/images/placeholder.jpg",
      comments: article.commentCount || 0,
      likes: article.likeCount || 0,
      views: article.viewCount || 0,
    }));
  }, [articles]);

  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => activeTab === "all" || post.category === activeTab);
  }, [blogPosts, activeTab]);

  const itemsPerPage = 2;
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = useMemo(() => {
    return filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPosts, currentPage, itemsPerPage]);

// Map backend packages dynamically from real booking data
  const servicesList = useMemo(() => {
    if (packagesQuery.data && packagesQuery.data.length > 0) {
      return [...packagesQuery.data]
        .sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0))
        .slice(0, 3)
        .map((p, idx) => ({
          id: p.packageId,
          title: p.name,
          description: p.description,
          price: formatBookingCurrency(p.basePrice),
          duration: `${p.duration} ${t("phút", "mins")}`,
          rating: formatRating(p.averageRating),
          reviews: `${p.reviewCount || 0} ${t("đánh giá", "reviews")}`,
          bookingCount: p.bookingCount ?? 0,
          badge:
            p.popularity === "BEST_SELLER" || idx === 0
              ? { label: t("Bán chạy", "Best Seller"), tone: "amber" }
              : undefined,
          icon:
            p.category?.toUpperCase().includes("CERAMIC")
              ? "ceramic"
              : p.duration >= 90
                ? "detail"
                : "wash",
        }));
    }

    return [];
  }, [packagesQuery.data, language]);

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8 bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-[#00B8D9]/10 blur-[100px]" />
        <div className="absolute bottom-10 -left-10 h-[28rem] w-[28rem] rounded-full bg-[#2F80ED]/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        
        <CustomerExperienceStyles />

        {/* Promo Timer Banner */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 rounded-xl border border-[#BDEEFF] bg-[#F5FBFF] px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-[13px] font-bold text-foreground">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#00B8D9] text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            {t(mockPromo.text.vi, mockPromo.text.en)}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-foreground">
            <span className="font-bold">{t("Còn lại", "Time remaining")}</span>
            {[timeLeft.hh, timeLeft.mm, timeLeft.ss].map((num, i) => (
              <span
                key={i}
                className="grid h-7 min-w-[28px] place-items-center rounded-md bg-[#0566D9] px-1.5 font-mono text-[13px] font-black text-white"
              >
                {String(num).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>

        {/* Luminous Welcome Section */}
        <section className="overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF6FD] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#0566D9]">
                <Sparkles className="h-3.5 w-3.5 text-[#00B8D9]" />
                Aura Community Feed
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("Chào mừng đến với Aura Club", "Welcome to Aura Club")}{user?.fullName ? `, ${user.fullName}` : ""}.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("Theo dõi xu hướng chăm sóc xe hơi, chia sẻ câu chuyện của bạn và cập nhật những ưu đãi dịch vụ độc quyền từ các chuyên viên của chúng tôi.", "Track car care trends, share your stories, and stay up to date with exclusive offers from our technicians.")}
              </p>
            </div>

            {/* Loyalty Perks Card */}
            <div className="flex min-w-[240px] items-center gap-4 rounded-2xl border border-[#BDEEFF] bg-[#F5FBFF] p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0566D9] text-white shadow-md shadow-[#0566D9]/20">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {t("Hạng của bạn", "Your Tier")}
                </div>
                <div className="text-lg font-black text-foreground flex items-center gap-1.5 mt-0.5">
                  <Star className="h-4 w-4 fill-[#00B8D9] text-[#00B8D9]" />
                  {user?.tier || "BRONZE"}
                </div>
                <div className="text-xs font-bold mt-0.5 text-[#0566D9]">
                  {profileQuery.isLoading ? "..." : `${profileQuery.data?.loyaltyBalance ?? 0} Points`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Slider & Info */}
        <section className="relative mt-2 overflow-hidden rounded-3xl border border-[#BDEEFF] bg-[#F5FBFF] shadow-[0_18px_48px_rgba(47,128,237,0.12)]">
          {heroSlides.map((src, i) => (
            <img
              key={src}
              src={src}
              alt="Luxury car wash & detailing"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
                i === heroIndex ? "opacity-28" : "opacity-0"
              }`}
            />
          ))}
          <div className="relative min-h-[360px] w-full flex flex-col justify-center px-8 py-10 sm:px-12">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7FCFF]/95 via-[#DFF7FF]/84 to-[#EAF6FD]/40" />
            
            <div className="relative z-10 max-w-xl space-y-4">
              <span className="inline-block rounded-full border border-[#BDEEFF] bg-white/85 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0566D9] shadow-sm">
                Aura Detailing Elite
              </span>
              <h2 className="font-bold text-3xl sm:text-4xl text-[#102A43] leading-tight tracking-tight">
                {t("Chuyên Nghiệp – Đẳng Cấp Spa Cho Xế Yêu", "Professional – Luxury Car Care & Detailing")}
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-[#52677A]">
                {t("Trải nghiệm dịch vụ chăm sóc xe hơi đẳng cấp với quy trình chuyên nghiệp, hệ thống không chạm hiện đại và đội ngũ kỹ thuật viên tận tâm – mang lại vẻ đẹp hoàn hảo cho chiếc xe của bạn.", "Experience luxury car care with a professional process, modern touchless technology, and a dedicated technician team – restoring perfect shine to your car.")}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-xl bg-[#00A3B8] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#00B8D9]/20 hover:bg-[#008FA3]">
                  <Link href="/customer/booking">{t("Đặt lịch ngay", "Book Detailing Now")}</Link>
                </Button>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#BDEEFF] bg-white/75 px-4 py-2 text-xs font-semibold text-[#102A43] backdrop-blur">
                  <ShieldCheck className="h-4 w-4 text-[#00B8D9]" />
                  {t("Cam kết hài lòng 100%", "Satisfaction Guaranteed")}
                </div>
              </div>
            </div>
            
            {/* Slide dots */}
            <div className="absolute bottom-4 right-6 flex gap-1.5">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === heroIndex ? "w-6 bg-[#00B8D9]" : "w-1.5 bg-[#BFD7EA]"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mt-4">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-foreground">{t("Tại sao chọn Aura Car Care", "Why Choose Us")}</h3>
            <p className="text-xs text-muted-foreground font-medium">
              {t("Dịch vụ chất lượng cao được thiết kế tỉ mỉ cho từng dòng xe.", "Premium services custom-tailored for your driving satisfaction.")}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {mockWhyItems.map((item, idx) => {
              const Icon = idx === 0 ? Sparkles : idx === 1 ? ShieldCheck : Check;
              return (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-2xl group shadow-sm border border-border/50"
                >
                  <img
                    src={item.image}
                    alt={t(item.title.vi, item.title.en)}
                    loading="lazy"
                    className="h-[210px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                    <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-white/15 backdrop-blur text-amber-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="text-base font-black tracking-tight leading-tight">
                      {t(item.title.vi, item.title.en)}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                      {t(item.description.vi, item.description.en)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic Most Booked Services Section */}
        <section className="mt-6">
          <div className="flex flex-col items-center text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Shield className="h-3 w-3 text-amber-500" /> Price Match & Satisfaction Guarantee
            </span>
            <h3 className="text-2xl font-black text-foreground">{t("Dịch vụ được đặt nhiều nhất", "Most Booked Services")}</h3>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {servicesList.map((s) => {
              const Icon = s.icon === "wash" ? Droplets : s.icon === "ceramic" ? Shield : Sparkles;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "relative rounded-3xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between",
                    s.badge ? "border-primary ring-1 ring-primary/10" : "border-border/60"
                  )}
                >
                  {s.badge && (
                    <span className="absolute -top-3 left-6 whitespace-nowrap rounded-full bg-primary text-primary-foreground px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {s.badge.label}
                    </span>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      {s.badge && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[9px] font-black text-foreground">
                          <HelpCircle className="h-3 w-3 text-amber-500" /> {t("Tư vấn miễn phí", "Help Me Choose")}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-foreground tracking-tight leading-tight">{s.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground font-semibold">{s.duration} • {s.reviews}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {s.bookingCount} {t("lượt đặt", "bookings")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3 w-3"
                            fill={i < Math.round(Number(s.rating)) ? "currentColor" : "none"}
                            strokeWidth={2}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-foreground/80">{s.rating}/5</span>
                    </div>

                    <div className="text-xl font-black text-foreground">{s.price}</div>

                    <p className="text-[11px] leading-relaxed text-muted-foreground bg-secondary/50 p-3 rounded-2xl border border-border/50">
                      {s.description}
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    <Button asChild className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2.5">
                      <Link href={`/customer/booking?type=package&id=${s.id}`}>{t("Chọn gói này", "Book Now")}</Link>
                    </Button>
                    <div className="text-center text-[10px] text-muted-foreground font-semibold">
                      {t("Không có phí ẩn", "No Hidden Fees")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <FeatureSection language={language} />

        {/* Marquee Brands */}
        <section className="mt-6 text-center border-t border-border/50 pt-8">
          <div className="flex items-center justify-center gap-2 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
            <span>TRUSTED BY 10,000+ VEHICLES</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
              <ShieldCheck className="h-3 w-3 text-amber-500" /> {t("Đã kiểm duyệt", "Verified")}
            </span>
          </div>
          <div className="group relative mt-4 overflow-hidden py-1 w-full" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
            <div className="flex w-max gap-12 text-muted-foreground font-black tracking-widest text-xs uppercase animate-pulse">
              {[...mockBrands, ...mockBrands].map((b, i) => (
                <span key={i} className="hover:text-primary transition-colors duration-200">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Content Layout Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] mt-4">
          
          {/* Left Column: Social/Blog Post Grid & Customer Story */}
          <div className="space-y-6">
            
            {/* Customer Stories Section */}
            <Card className="overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                      Customer Stories
                    </span>
                    <h3 className="text-xl font-black text-foreground">
                      {t(mockStory.title.vi, mockStory.title.en)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground font-semibold italic">
                  {t(mockStory.quote.vi, mockStory.quote.en)}
                </p>

                {/* Grid of Before/After Photos */}
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div className="relative rounded-2xl overflow-hidden border border-border/50">
                    <img
                      src="https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&q=80&w=600"
                      alt="Before"
                      className="h-48 w-full object-cover"
                    />
                    <span className="absolute bottom-3 left-3 bg-red-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white">
                      Before Detailing
                    </span>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-border/50">
                    <img
                      src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600"
                      alt="After"
                      className="h-48 w-full object-cover"
                    />
                    <span className="absolute bottom-3 left-3 bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white">
                      After Detailing
                    </span>
                  </div>
                </div>
                
                <div className="pt-2 flex items-center justify-between border-t border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {t(mockStory.note.vi, mockStory.note.en)}
                  </span>
                  <Button asChild className="rounded-xl bg-amber-500 hover:bg-amber-500/90 text-amber-950 font-bold text-xs px-4">
                    <Link href="/customer/booking?type=package&id=featured-detailing">{t("Đặt dịch vụ như này", "Book Like This")}</Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Guides Section header & navigation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-foreground">{t("Cẩm nang Chăm sóc Xe", "Expert Car Care Guides")}</h3>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {blogTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setActiveTab(tag.id);
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                        activeTab === tag.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social/Blog Post List */}
              <div className="space-y-5">
                {paginatedPosts.map((post) => (
                    <Card key={post.id} className="overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col gap-5 sm:flex-row">
                        <Link href={`/customer/guides/${post.id}`} className="relative h-36 w-full sm:w-48 rounded-2xl overflow-hidden shrink-0 block">
                          <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
                          <span className="absolute top-2.5 left-2.5 bg-black/75 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white">
                            {post.categoryLabel}
                          </span>
                        </Link>

                        <div className="flex flex-col justify-between flex-1 py-1">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span>{post.author}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-amber-500" /> {post.readTime}</span>
                            </div>
                            <Link href={`/customer/guides/${post.id}`} className="hover:underline block">
                              <h4 className="text-base font-black text-foreground leading-tight">
                                {post.title}
                              </h4>
                            </Link>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleLike(post.id)}
                                className={cn(
                                  "flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition",
                                  hasLiked[post.id] ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-accent"
                                )}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                                {likes[post.id] || 0}
                              </button>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-2 py-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {post.comments}
                              </span>
                            </div>

                            <Link href={`/customer/guides/${post.id}`} className="text-xs font-black text-primary flex items-center gap-1 hover:underline">
                              {t("Xem chi tiết", "Read Detail")}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </Button>
                      <span className="text-xs font-bold text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Right Column: Trending, Stats & Lounge events */}
          <div className="space-y-6">
            

            {/* Detailing Workshops */}
            <Card className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-wider border-b border-border/50 pb-2">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Workshops
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3 items-start rounded-xl p-2 hover:bg-accent transition duration-200">
                  <div className="bg-primary/10 text-primary h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-[10px] uppercase">
                    Jul 05
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground leading-tight">
                      DIY Car Care: Ceramic Maintenance
                    </h5>
                    <p className="text-[9px] text-muted-foreground mt-1 font-bold">
                      Live Q&A with Senior detailer • 8:00 PM
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start rounded-xl p-2 hover:bg-accent transition duration-200">
                  <div className="bg-amber-500/15 text-amber-500 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-[10px] uppercase">
                    Jul 12
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground leading-tight">
                      VIP Lounge Special: Coffee Tasting
                    </h5>
                    <p className="text-[9px] text-muted-foreground mt-1 font-bold">
                      Exclusive for Diamond & Gold Tiers
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Member Lounge Tiers Overview */}
            <Card className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5 p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-wider border-b border-border/50 pb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Aura Loyalty Perks
              </h4>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/50 shadow-sm">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Silver Tier
                  </span>
                  <span className="text-[10px] font-black text-muted-foreground">10% Off Combos</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/50 shadow-sm">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Gold Tier
                  </span>
                  <span className="text-[10px] font-black text-amber-600">15% Off + Lounge Pass</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-primary/20 shadow-[0_4px_12px_rgba(21,83,69,0.06)]">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Diamond Tier
                  </span>
                  <span className="text-[10px] font-black text-primary">20% Off + Free Graphene</span>
                </div>
              </div>

              <div className="rounded-2xl bg-primary/5 p-3.5 border border-primary/10 text-[10px] leading-relaxed text-muted-foreground flex gap-2 font-semibold">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span>
                  {t("Hạng thành viên của bạn sẽ tự động nâng cấp sau mỗi phiên hoàn thành và tích lũy điểm đủ điều kiện.", "Your membership tier updates automatically as you complete wash sessions and accumulate qualified points.")}
                </span>
              </div>
            </Card>

            <MembershipFloatingCard
              name={user?.fullName}
              tier={user?.tier}
              currentPoints={profileQuery.data?.loyaltyBalance ?? 0}
              requiredPoints={1000}
              language={language}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking Floating Action Button */}
      <div className="fixed bottom-20 right-6 z-50 lg:hidden">
        <Button asChild className="rounded-full h-12 w-12 p-0 bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition">
          <Link href="/customer/booking" aria-label="Book detailing">
            <ClipboardList className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      <div className="hidden lg:block">
        <FloatingBookingButton language={language} />
      </div>
      {displayBooking ? (
        <FloatingWashSessionBubble
          language={language}
          bookingCode={displayBooking.bookingId}
          serviceName={("serviceName" in displayBooking ? displayBooking.serviceName : null) || ("primaryItemName" in displayBooking ? displayBooking.primaryItemName : null) || t("Dịch vụ rửa xe", "Car wash service")}
          status={toLiveSessionStatus(displayBooking.status)}
          imageUrl="/images/gallery1.jpg"
          scheduledAt={toBookingDateTime(displayBooking.bookingDate, displayBooking.bookingTime)}
          timestamps={washTimestamps}
        />
      ) : null}
    </div>
  );
}
