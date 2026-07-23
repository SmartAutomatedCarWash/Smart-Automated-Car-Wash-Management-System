"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Sparkles,
  Star,
  Zap,
  Layers3,
  Gift,
} from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/ui/dialog";
import { useActiveCustomerCombos, useBookingCombos } from "@/features/bookings/hooks/use-bookings";
import { setCartCheckoutSnapshot } from "@/features/cart/store/cart.store";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { cn } from "@/shared/lib/utils";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import type { BookingCombo, CustomerCombo } from "@/entities/bookings";

type ComboCardModel = BookingCombo & {
  imageUrls: string[];
};

function getComboImages(combo: BookingCombo | null | undefined) {
  if (!combo) return [];
  if (combo.imageUrls && combo.imageUrls.length > 0) return combo.imageUrls;
  if (combo.image) return [combo.image];
  return [];
}

function getIncludedItems(combo: ComboCardModel, t: (vi: string, en: string) => string) {
  const serviceItems = combo.services?.map((service) => service.name).filter(Boolean) ?? [];
  if (serviceItems.length > 0) return serviceItems;
  return combo.benefits.length > 0
    ? combo.benefits
    : [t("Exterior wash", "Exterior wash"), t("Interior vacuum", "Interior vacuum")];
}

export default function ServiceCatalogPage() {
  const { language } = useLanguageStore();
  const router = useRouter();
  const t = (vi: string, en: string) => translate(language, vi, en);

  const combosQuery = useBookingCombos();
  const ownedCombosQuery = useActiveCustomerCombos();

  const [selectedCombo, setSelectedCombo] = useState<ComboCardModel | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showOwnedCombos, setShowOwnedCombos] = useState(false);

  const combos = useMemo<ComboCardModel[]>(
    () =>
      (combosQuery.data ?? [])
        .filter((combo) => combo.isActive)
        .map((combo) => ({ ...combo, imageUrls: getComboImages(combo) })),
    [combosQuery.data],
  );

  const featuredCombos = useMemo(() => combos.slice(0, 4), [combos]);
  const selectedImages = selectedCombo?.imageUrls ?? [];
  const selectedIncluded = selectedCombo ? getIncludedItems(selectedCombo, t) : [];

  useEffect(() => {
    if (!selectedCombo || selectedImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % selectedImages.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [selectedCombo, selectedImages.length]);

  const handleOpen = (combo: ComboCardModel) => {
    setSelectedCombo(combo);
    setActiveImageIndex(0);
  };

  const handleQuickBook = (combo: ComboCardModel) => {
    router.push(`/customer/booking?type=combo&id=${combo.comboId}`);
  };

  const handleCheckoutCombo = (combo: ComboCardModel) => {
    setCartCheckoutSnapshot([
      {
        type: "COMBO",
        itemId: combo.comboId,
        name: combo.name,
        price: combo.basePrice,
        quantity: 1,
        description: combo.description,
      },
    ]);
    router.push("/customer/combos/checkout");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(5,102,217,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(103,80,164,0.08),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(239,248,255,1)_0%,rgba(248,251,255,1)_100%)] p-8 shadow-[0_16px_50px_rgba(15,23,42,0.03)] backdrop-blur sm:p-10">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 opacity-60">
            <Sparkles className="h-full w-full text-cyan-200/50" strokeWidth={0.5} />
          </div>

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <Badge className="w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600 shadow-sm">
                {t("COMBO PACKAGES", "COMBO PACKAGES")}
              </Badge>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                {t("Choose the right combo for your car", "Choose the right combo for your car")}
              </h1>
              <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
                {t(
                  "Carefully curated combo packages that combine our best services for complete car care.",
                  "Carefully curated combo packages that combine our best services for complete car care.",
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowOwnedCombos(true)}
              className="group flex cursor-pointer items-center gap-5 rounded-3xl border border-slate-100 bg-white p-4 pr-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 transition-colors group-hover:bg-cyan-100">
                <Gift className="h-7 w-7" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold text-slate-900">{t("My combo", "My combo")}</span>
                <span className="text-sm text-slate-500">{t("View selected packages", "View selected packages")}</span>
              </div>
              <div className="ml-4 flex items-center gap-3">
                <Badge className="rounded-full bg-cyan-600 px-3 py-1 font-semibold text-white">
                  {(ownedCombosQuery.data ?? []).length} {t("selected", "selected")}
                </Badge>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
              </div>
            </button>
          </div>
        </section>

        {combosQuery.isLoading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#0566D9]" />
              <span className="text-sm font-semibold text-slate-600">{t("Loading combos...", "Loading combos...")}</span>
            </div>
          </div>
        ) : featuredCombos.length === 0 ? (
          <Card className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">{t("No combos available yet", "No combos available yet")}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t(
                "When new combos are available, they will appear here with image and pricing.",
                "When new combos are available, they will appear here with image and pricing.",
              )}
            </p>
          </Card>
        ) : (
          <section className="grid gap-6 lg:grid-cols-2">
            {featuredCombos.map((combo) => (
              <ComboGridCard key={combo.comboId} combo={combo} onOpen={handleOpen} t={t} />
            ))}
          </section>
        )}
      </div>

      <Dialog
        open={Boolean(selectedCombo)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCombo(null);
            setActiveImageIndex(0);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] w-[min(96vw,72rem)] overflow-hidden rounded-[2rem] border-0 bg-white p-0 shadow-[0_30px_100px_rgba(15,23,42,0.45)] [&>button]:hidden">
          {selectedCombo && (
            <div className="flex max-h-[92vh] flex-col">
              <div className="relative h-[280px] bg-slate-100 sm:h-[340px]">
                <DialogTitle className="sr-only">{selectedCombo.name}</DialogTitle>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCombo(null);
                    setActiveImageIndex(0);
                  }}
                  className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-slate-700 shadow-lg shadow-slate-950/10 transition hover:bg-slate-50"
                  aria-label="Close"
                >
                  <span className="text-3xl leading-none">×</span>
                </button>

                <div className="absolute left-4 top-4 z-10">
                  <Badge className="rounded-full bg-[#167E9C] px-4 py-2 text-[13px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-cyan-950/20">
                    <Star className="mr-2 h-4 w-4 fill-current" />
                    {selectedCombo.canUpgrade ? t("Best value", "Best value") : t("Combo pack", "Combo pack")}
                  </Badge>
                </div>

                {selectedImages.length > 1 && (
                  <div className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                    {activeImageIndex + 1}/{selectedImages.length}
                  </div>
                )}

                {selectedImages.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImages[activeImageIndex]}
                    alt={selectedCombo.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex min-h-[360px] h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(5,102,217,0.16),transparent_55%),linear-gradient(180deg,#edf6ff_0%,#ffffff_100%)]">
                    <Sparkles className="h-14 w-14 text-[#0566D9]" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />

                {selectedImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : selectedImages.length - 1))}
                      className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-950/10 transition hover:bg-white"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev < selectedImages.length - 1 ? prev + 1 : 0))}
                      className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-950/10 transition hover:bg-white"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                      {selectedImages.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={cn("h-2 rounded-full transition-all", index === activeImageIndex ? "w-8 bg-white" : "w-2 bg-white/55")}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex min-w-0 flex-col overflow-y-auto p-6 sm:p-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl xl:text-5xl">
                    {selectedCombo.name}
                  </h2>
                  <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
                    {selectedCombo.description}
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="text-[12px] font-black uppercase tracking-[0.26em] text-cyan-700">
                    {t("Included", "Included")}
                  </p>
                  <div className="grid gap-3">
                    {selectedIncluded.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0E7490] text-white shadow-sm">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <span className="min-w-0 text-base font-bold leading-snug text-slate-800 sm:text-lg">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[1.7rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(236,253,255,1)_0%,rgba(255,255,255,1)_55%,rgba(240,249,255,1)_100%)] p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                        {t("Price", "Price")}
                      </p>
                      <div className="mt-2 flex items-end gap-3">
                        <span className="text-4xl font-black tracking-tight text-[#167E9C] sm:text-5xl">
                          {formatBookingCurrency(selectedCombo.basePrice)}
                        </span>
                        {selectedCombo.upgradePriceFrom > selectedCombo.basePrice && (
                          <span className="pb-2 text-sm font-semibold text-slate-400 line-through">
                            {formatBookingCurrency(selectedCombo.upgradePriceFrom)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 text-slate-700 sm:text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                        {t("Duration", "Duration")}
                      </p>
                      <p className="text-lg font-black sm:text-xl">
                        {selectedCombo.durationDays} {t("days", "days")}
                      </p>
                      {selectedCombo.upgradePriceFrom > selectedCombo.basePrice && (
                        <p className="text-sm font-semibold text-[#167E9C]">
                          <Star className="mr-1 inline-block h-4 w-4 fill-current" />
                          {t("Save", "Save")} {formatBookingCurrency(selectedCombo.upgradePriceFrom - selectedCombo.basePrice)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <AddToCartButton
                    itemId={selectedCombo.comboId}
                    type="COMBO"
                    name={selectedCombo.name}
                    price={selectedCombo.basePrice}
                    description={selectedCombo.description}
                    className="h-14 rounded-2xl border border-cyan-200 bg-white px-5 text-base font-bold text-slate-800 shadow-none hover:bg-slate-50"
                  />
                  <Button
                    type="button"
                    onClick={() => handleQuickBook(selectedCombo)}
                    className="h-14 rounded-2xl bg-[linear-gradient(135deg,#167E9C_0%,#0F5E86_100%)] px-5 text-base font-black text-white shadow-[0_18px_35px_rgba(22,126,156,0.32)] hover:opacity-95"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    {t("Book now", "Book now")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCheckoutCombo(selectedCombo)}
                    className="h-14 rounded-2xl border-violet-200 bg-violet-50 px-5 text-base font-black text-violet-700 hover:bg-violet-100 sm:col-span-2"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {t("Checkout now", "Checkout now")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showOwnedCombos} onOpenChange={setShowOwnedCombos}>
        <DialogContent className="max-h-[88vh] w-[min(92vw,52rem)] overflow-hidden rounded-[1.75rem] border-0 bg-white p-0 shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
          <div className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.95),rgba(255,255,255,1))] px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black text-slate-950">
              <Sparkles className="h-5 w-5 text-violet-500" />
              {t("Owned combos", "Owned combos")}
            </DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              {t("Purchased combo packages still valid", "Purchased combo packages still valid")}
            </p>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
            {ownedCombosQuery.isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Loading combos...", "Loading combos...")}
              </div>
            ) : (ownedCombosQuery.data ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                {t("You do not own any combo yet.", "You do not own any combo yet.")}
              </div>
            ) : (
              (ownedCombosQuery.data ?? []).map((combo) => (
                <OwnedComboCard key={combo.customerComboId} combo={combo} language={language} t={t} />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComboGridCard({
  combo,
  onOpen,
  t,
}: {
  combo: ComboCardModel;
  onOpen: (combo: ComboCardModel) => void;
  t: (vi: string, en: string) => string;
}) {
  const image = combo.imageUrls[0];
  const included = getIncludedItems(combo, t).slice(0, 3);

  return (
    <Card
      onClick={() => onOpen(combo)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/60 bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={combo.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100">
            <Sparkles className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {combo.imageUrls.length > 1 && (
          <div className="absolute right-4 top-4 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-slate-900 shadow-sm">
            {combo.imageUrls.length} photos
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent" />
        <Badge className="absolute left-4 top-4 rounded-full bg-[#0891b2] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
          {t("COMBO PACK", "COMBO PACK")}
        </Badge>
        <div className="absolute bottom-3 left-4 rounded bg-white/90 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-800 backdrop-blur">
          AURA CARE
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-6 p-6">
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-slate-900">{combo.name}</h3>
          <p className="text-sm text-slate-500">{combo.description}</p>
        </div>

        <div className="flex-1 space-y-3">
          {included.map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0891b2]" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("PRICE", "PRICE")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#0891b2]">
                {formatBookingCurrency(combo.basePrice)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AddToCartButton
              itemId={combo.comboId}
              type="COMBO"
              name={combo.name}
              price={combo.basePrice}
              description={combo.description}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            />
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(combo);
              }}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#020617] px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t("View detail", "View detail")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OwnedComboCard({
  combo,
  language,
  t,
}: {
  combo: CustomerCombo;
  language: string;
  t: (vi: string, en: string) => string;
}) {
  const remainingPct = Math.max(0, Math.min(100, Math.round((combo.remainingUsages / Math.max(combo.totalUsages, 1)) * 100)));

  return (
    <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/70 via-white to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-black text-slate-950">{combo.comboName}</div>
          <p className="mt-1 text-sm text-slate-500">
            {t("Remaining", "Remaining")}: <span className="font-bold text-violet-700">{combo.remainingUsages}</span>/{combo.totalUsages} {t("uses", "uses")}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
          {t("Active", "Active")}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${remainingPct}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {t("Activated", "Activated")}: {new Date(combo.activatedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB")}
        </span>
        <span>
          {t("Expires", "Expires")}: {new Date(combo.expiresAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB")}
        </span>
      </div>
    </div>
  );
}
