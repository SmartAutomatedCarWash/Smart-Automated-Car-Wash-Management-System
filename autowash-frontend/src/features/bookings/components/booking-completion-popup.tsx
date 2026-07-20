"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Star, Award, Sparkles, MessageSquare, CheckCircle2, Loader2, ImageUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import { toast } from "sonner";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { uploadReviewImage } from "@/features/bookings/lib/review-service";

interface BookingCompletionPopupProps {
  bookingId: string;
  vehiclePlate?: string;
  pointsEarned: number;
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
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [beforeImageUrl, setBeforeImageUrl] = useState("");
  const [afterImageUrl, setAfterImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCode = vehiclePlate ?? bookingId;

  // Confetti Particle Class
  useEffect(() => {
    if (!isOpen || !newTier || newTier === oldTier) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = [];
    const colors = ["#2DD4BF", "#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6"];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height - 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    let animationFrameId: number;

    const updateAndRender = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let active = false;
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height) {
          active = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (active) {
        animationFrameId = requestAnimationFrame(updateAndRender);
      }
    };

    updateAndRender();

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, newTier, oldTier]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitReview(stars, comment, {
        beforeImageUrl: beforeImageUrl || null,
        afterImageUrl: afterImageUrl || null,
      });
      toast.success(translate(language, "Cảm ơn bạn đã gửi đánh giá!", "Thank you for your feedback!"));
      onClose();
    } catch (err) {
      toast.error(translate(language, "Không thể gửi đánh giá.", "Failed to submit review."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && newTier && newTier !== oldTier && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
        />
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-teal-500/5 opacity-50" />
          <div className="relative z-10 space-y-6 text-center">
            {/* Header Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-teal-500/20 to-primary/20 text-primary shadow-inner animate-pulse">
              {newTier && newTier !== oldTier ? (
                <Award className="h-10 w-10 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-teal-600" />
              )}
            </div>

            {/* Loyalty Tier Up Congratulation */}
            {newTier && newTier !== oldTier && (
              <div className="space-y-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 animate-bounce">
                <div className="flex items-center justify-center gap-2 text-amber-500 font-bold">
                  <Sparkles className="h-5 w-5" />
                  <span>{translate(language, "CHÚC MỪNG THĂNG HẠNG!", "TIER UPGRADED!")}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {language === "vi"
                    ? `Bạn đã được nâng cấp từ hạng ${oldTier || "Thành viên"} lên hạng ${newTier}!`
                    : `You have been upgraded from ${oldTier || "Member"} to ${newTier}!`}
                </p>
              </div>
            )}

            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                {translate(language, "Hoàn Thành Rửa Xe!", "Wash Complete!")}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
                {language === "vi"
                  ? `Xe #${displayCode} đã hoàn thành xuất sắc.`
                  : `Vehicle #${displayCode} has been successfully completed.`}
              </DialogDescription>
            </DialogHeader>

            {/* Points earned */}
            <div className="rounded-2xl border border-border/40 bg-accent/20 py-4 px-6 flex items-center justify-between shadow-sm">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {translate(language, "Điểm tích lũy", "Loyalty Points")}
              </span>
              <span className="text-2xl font-black text-primary">
                +{pointsEarned} pts
              </span>
            </div>

            {/* Interactive Stars Rating */}
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

            {/* Feedback stays in the same completion popup as the star rating. */}
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
                  "Tell us about the speed, wash quality, or service attitude..."
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

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-xl font-bold border-border/60 hover:bg-accent/40"
              >
                {translate(language, "Để sau", "Skip")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-xl font-black bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 shadow-lg shadow-primary/25"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  translate(language, "Gửi đánh giá", "Submit")
                )}
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
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(getErrorMessage(error));
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
