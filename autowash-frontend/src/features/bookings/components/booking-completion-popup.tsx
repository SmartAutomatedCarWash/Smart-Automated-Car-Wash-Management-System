"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Star, MessageSquare, CheckCircle2, Loader2, ImageUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import { notify } from "@/shared/lib/notify";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { uploadReviewImage } from "@/features/bookings/lib/review-service";
import { MembershipTierUpgradePopup } from "@/features/loyalty/components/membership-tier-upgrade-popup";

interface BookingCompletionPopupProps {
  bookingId: string;
  vehiclePlate?: string;
  pointsEarned?: number | null;
  newTier?: string | null;
  oldTier?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (stars: number, comment: string, images: { beforeImageUrl?: string | null; afterImageUrl?: string | null }) => Promise<void>;
}

export function BookingCompletionPopup({
  bookingId,
  vehiclePlate,
  pointsEarned,
  newTier,
  oldTier,
  isOpen,
  onClose,
  onSubmitReview,
}: BookingCompletionPopupProps) {
  const { language } = useLanguageStore();
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [beforeImageUrl, setBeforeImageUrl] = useState("");
  const [afterImageUrl, setAfterImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tierUpgradeSeen, setTierUpgradeSeen] = useState(false);
  const displayCode = vehiclePlate ?? bookingId;
  const hasTierUpgrade = Boolean(newTier && newTier !== oldTier);
  const showTierUpgrade = isOpen && hasTierUpgrade && !tierUpgradeSeen;
  const showReviewDialog = isOpen && !showTierUpgrade;

  useEffect(() => {
    if (!isOpen) {
      setTierUpgradeSeen(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitReview(stars, comment, {
        beforeImageUrl: beforeImageUrl || null,
        afterImageUrl: afterImageUrl || null,
      });
      notify.success(translate(language, "Cảm ơn bạn đã gửi đánh giá!", "Thank you for your feedback!"));
      onClose();
    } catch {
      notify.error(translate(language, "Không thể gửi đánh giá.", "Failed to submit review."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {hasTierUpgrade ? (
        <MembershipTierUpgradePopup
          open={showTierUpgrade}
          oldTier={oldTier}
          newTier={newTier!}
          onClose={() => setTierUpgradeSeen(true)}
          onViewTier={() => setTierUpgradeSeen(true)}
        />
      ) : null}

      <Dialog open={showReviewDialog} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/95 p-6 shadow-2xl backdrop-blur-2xl sm:max-w-md">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-teal-500/5 opacity-50" />
          <div className="relative z-10 space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-teal-500/20 to-primary/20 text-primary shadow-inner">
              <CheckCircle2 className="h-10 w-10 text-teal-600" />
            </div>

            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                {translate(language, "Hoàn Thành Rửa Xe!", "Wash Complete!")}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm font-medium text-muted-foreground">
                {language === "vi"
                  ? `Xe #${displayCode} đã hoàn thành xuất sắc.`
                  : `Vehicle #${displayCode} has been successfully completed.`}
              </DialogDescription>
            </DialogHeader>

            {pointsEarned != null ? (
              <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-accent/20 px-6 py-4 shadow-sm">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {translate(language, "Điểm tích lũy", "Loyalty Points")}
                </span>
                <span className="text-2xl font-black text-primary">+{pointsEarned} pts</span>
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="text-sm font-bold text-foreground">
                {translate(language, "Đánh giá chất lượng dịch vụ?", "Rate your experience?")}
              </div>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStars(star)}
                    onMouseEnter={() => setHoverStars(star)}
                    onMouseLeave={() => setHoverStars(null)}
                    className="transition-transform duration-100 hover:scale-125"
                  >
                    <Star
                      className={`h-9 w-9 ${
                        star <= (hoverStars ?? stars)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-primary" />
                {translate(language, "Góp ý của bạn", "Your feedback")}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={translate(
                  language,
                  "Chia sẻ cảm nhận về tốc độ, chất lượng rửa xe hoặc thái độ phục vụ...",
                  "Tell us about the speed, wash quality, or service attitude...",
                )}
                className="w-full resize-none rounded-2xl border border-border/50 bg-background/70 p-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="grid gap-3 text-left sm:grid-cols-2">
              <ReviewImageUploadField
                label={translate(language, "Ảnh trước khi rửa", "Before image")}
                value={beforeImageUrl}
                onChange={setBeforeImageUrl}
              />
              <ReviewImageUploadField
                label={translate(language, "Ảnh sau khi rửa", "After image")}
                value={afterImageUrl}
                onChange={setAfterImageUrl}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-xl border-border/60 font-bold hover:bg-accent/40"
              >
                {translate(language, "Để sau", "Skip")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 font-black shadow-lg shadow-primary/25 hover:from-primary/95 hover:to-indigo-600/95"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : translate(language, "Gửi đánh giá", "Submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReviewImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const getErrorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadReviewImage(file);
      onChange(uploaded.url);
      notify.success("Image uploaded.");
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {value ? <img src={value} alt={label} className="h-24 w-full rounded-2xl border border-border/50 object-cover" /> : null}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()} className="rounded-xl">
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
        {label}
      </Button>
    </div>
  );
}
