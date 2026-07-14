"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Star,
  Flame,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Loader2,
  Bookmark,
  Zap,
  ChevronLeft,
} from "lucide-react";
import { Card } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { useBookingPackages, useBookingCombos } from "@/features/bookings/hooks/use-bookings";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { cn } from "@/shared/lib/utils";


export default function ServiceCatalogPage() {
  const { language } = useLanguageStore();
  const router = useRouter();
  const t = (vi: string, en: string) => translate(language, vi, en);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const packagesQuery = useBookingPackages();
  const combosQuery = useBookingCombos();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<typeof catalogItems[number] | null>(null);
  const dynamicCategories = useMemo(() => {
    const pkgCats = (packagesQuery.data ?? []).map(p => p.category).filter(Boolean);
    const uniqueCats = Array.from(new Set(pkgCats));
    return uniqueCats as string[];
  }, [packagesQuery.data]);

  const filterTabs = useMemo(() => {
    const tabs = [
      { id: "all", label: t("Tất cả", "All") },
      { id: "services", label: t("Dịch Vụ", "Services") },
    ];
    dynamicCategories.forEach(cat => {
      tabs.push({ id: cat, label: cat });
    });
    tabs.push({ id: "combos", label: t("Gói Combos", "Combos") });
    return tabs;
  }, [dynamicCategories, t]);

  const isLoading = packagesQuery.isLoading || combosQuery.isLoading;

  const catalogItems = useMemo(() => {
    if (isLoading) return [];
    
    const pkgs = (packagesQuery.data ?? []).map((pkg) => {
      const imageUrls = pkg.imageUrls && pkg.imageUrls.length > 0
        ? pkg.imageUrls
        : pkg.image
          ? [pkg.image]
          : [];
      return {
        id: pkg.packageId,
        type: "package" as const,
        category: pkg.category || "uncategorized",
        name: pkg.name,
        description: pkg.description || t("Quy trình rửa tiêu chuẩn chất lượng cao.", "High quality standard wash flow."),
        price: pkg.basePrice,
        originalPrice: pkg.basePrice,
        benefits: pkg.features || [t("Rửa bọt không chạm", "Touchless foam spray"), t("Lau khô sấy gương", "Hand dry & glass wipe")],
        duration: pkg.duration ? `${pkg.duration} mins` : "30 mins",
        images: imageUrls,
      };
    });

    const cmbs = (combosQuery.data ?? []).map((combo) => ({
      id: combo.comboId,
      type: "combo" as const,
      category: "combos",
      name: combo.name,
      description: combo.description || t("Gói combo tiết kiệm cho nhiều lần sử dụng.", "Cost-saving combo for multiple usages."),
      price: combo.basePrice,
      originalPrice: combo.basePrice,
      benefits: (combo.benefits && combo.benefits.length > 0)
        ? combo.benefits
        : ((combo as any).services?.map((s: any) => s.name) ?? [t("Tiết kiệm lên tới 30%", "Save up to 30%"), t("Ưu tiên đặt chỗ trước", "Priority slot reservation")]),
      duration: `${combo.maxServices} ${t("Lượt dùng", "Usages")}`,
      images: combo.imageUrls && combo.imageUrls.length > 0
        ? combo.imageUrls
        : combo.image
          ? [combo.image]
          : [],
    }));


    return [...pkgs, ...cmbs];
  }, [packagesQuery.data, combosQuery.data, isLoading, t]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return catalogItems;
    if (activeFilter === "services") return catalogItems.filter((item) => item.type === "package");
    return catalogItems.filter((item) => item.category === activeFilter);
  }, [catalogItems, activeFilter]);

  // Find a showroom detailing package or a combo to feature as "Showroom Combo"
  const featuredItem = useMemo(() => {
    return catalogItems.find(
      (item) => item.name.toLowerCase().includes("showroom") || item.name.toLowerCase().includes("vip") || item.category === "combos"
    ) || catalogItems[0] || null;
  }, [catalogItems]);

  const handleQuickBook = (item: typeof catalogItems[number]) => {
    if (item.type === "combo") {
      router.push(`/customer/combos/${item.id}/checkout`);
    } else {
      router.push(`/customer/bookings/new?packageId=${item.id}`);
    }
  };

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8 bg-[#fdf7ff]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-[#0566D9]/5 blur-[100px]" />
        <div className="absolute bottom-10 -left-10 h-[28rem] w-[28rem] rounded-full bg-[#6750A4]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        
        {/* Filter Navigation */}
        <section className="flex flex-wrap gap-2 items-center overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                activeFilter === tab.id
                  ? "bg-[#0566D9] text-white border-[#0566D9] shadow-sm shadow-[#0566D9]/10"
                  : "bg-white text-slate-600 border-black/[0.04] hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {/* Grid List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0566D9]" />
            <p className="text-sm font-semibold text-slate-500">{t("Đang tải danh mục...", "Loading catalog...")}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-semibold text-sm">
            {t("Không tìm thấy dịch vụ nào phù hợp.", "No matching services found.")}
          </div>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} onClick={() => setSelectedItem(item)} className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group cursor-pointer">
                {/* Ảnh thumbnail */}
                {item.images && item.images.length > 0 && (
                  <div className="w-full aspect-video overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white",
                      item.type === "combo" ? "bg-[#6750A4]" : "bg-[#0566D9]"
                    )}>
                      {item.type === "combo" ? t("Gói Combo", "Combo Pack") : t("Dịch Vụ", "Single Wash")}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {item.duration}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-950 leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {item.benefits.slice(0, 3).map((benefit: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-[11px] font-semibold text-slate-650">
                        <CheckCircle className="h-3.5 w-3.5 text-[#0566D9] shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        {t("Giá bán", "Price")}
                      </span>
                      <span className="text-xl font-black text-slate-950">
                        {formatBookingCurrency(item.price)}
                      </span>
                    </div>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBook(item);
                      }}
                      className="rounded-xl bg-[#0566D9]/10 text-[#0566D9] hover:bg-[#0566D9] hover:text-white px-5 py-2 text-xs font-black shadow-none transition-all duration-200"
                    >
                      {t("Quick Book", "Quick Book")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        )}
      </div>

      {/* Detail Popup */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => {
        if (!open) {
          setSelectedItem(null);
          setActiveImageIndex(0);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">{selectedItem?.name}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2">
              {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6 pt-4">
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm group">
                  <div className="w-full h-full relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedItem.images[activeImageIndex]} 
                      alt={`${selectedItem.name} - ${activeImageIndex + 1}`} 
                      className="absolute inset-0 object-cover w-full h-full transition-opacity duration-300" 
                    />
                  </div>
                  {selectedItem.images.length > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                        onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : selectedItem.images.length - 1))}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                        onClick={() => setActiveImageIndex((prev) => (prev < selectedItem.images.length - 1 ? prev + 1 : 0))}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
                        {selectedItem.images.map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "h-1.5 rounded-full shadow-sm transition-all duration-300",
                              i === activeImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                            )} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0566D9]">
                  {t("Bao gồm các dịch vụ", "Includes")}
                </h4>
                <div className="grid gap-3">
                  {selectedItem.benefits.map((benefit: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-sm font-semibold text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <CheckCircle className="h-5 w-5 text-[#0566D9] shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                    {t("Giá bán", "Price")}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#0566D9]">
                      {formatBookingCurrency(selectedItem.price)}
                    </span>
                    {selectedItem.originalPrice > selectedItem.price && (
                      <span className="text-sm font-bold text-slate-400 line-through">
                        {formatBookingCurrency(selectedItem.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                    {t("Thời gian", "Duration")}
                  </span>
                  <span className="text-sm font-black text-slate-700 bg-white px-2 py-1 rounded-md shadow-sm">
                    {selectedItem.duration}
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (selectedItem) handleQuickBook(selectedItem);
                  setSelectedItem(null);
                }}
                className="w-full rounded-2xl bg-[#0566D9] text-white hover:bg-[#0455B6] h-14 text-base font-black shadow-lg shadow-[#0566D9]/20 transition-all active:scale-[0.98]"
              >
                <Zap className="mr-2 h-5 w-5" />
                {t("Đặt Lịch Ngay", "Book Now")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
