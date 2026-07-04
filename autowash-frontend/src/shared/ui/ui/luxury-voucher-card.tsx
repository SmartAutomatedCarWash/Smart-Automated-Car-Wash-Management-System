import React from "react";
import { Copy, Calendar, Gift, Info } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";

export interface LuxuryVoucherCardProps {
  title?: string;
  amountText: string;
  unitText?: string;
  code: string;
  tier?: string;
  validUntil: string;
  minOrder?: string;
  className?: string;
}

export function LuxuryVoucherCard({
  title = "Voucher",
  amountText = "50,000",
  unitText = "VND",
  code = "LOY-237AD1DDCE37",
  tier = "ALL TIERS",
  validUntil = "31 DEC 2024",
  minOrder = "None",
  className,
}: LuxuryVoucherCardProps) {
  return (
    <div
      className={cn(
        "group relative w-full max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden flex flex-row",
        "shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,43,92,0.15)] hover:-translate-y-1 transition-all duration-300",
        "border border-slate-200/60",
        className
      )}
      style={{
        maskImage: `
          radial-gradient(circle at 0px 50%, transparent 12px, black 12.5px),
          radial-gradient(circle at 100% 50%, transparent 12px, black 12.5px)
        `,
        WebkitMaskImage: `
          radial-gradient(circle at 0px 50%, transparent 12px, black 12.5px),
          radial-gradient(circle at 100% 50%, transparent 12px, black 12.5px)
        `,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      {/* Left Ribbon / Accent line */}
      <div className="w-2.5 bg-[#002B5C] relative shrink-0 z-10 transition-colors group-hover:bg-[#0F5FFF]" />

      {/* Left Main Content */}
      <div className="flex-1 p-5 md:p-7 flex flex-col justify-between relative bg-white">
        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none overflow-hidden transition-opacity group-hover:opacity-[0.04]">
          <span className="font-serif text-[12rem] font-bold text-[#002B5C] leading-none -translate-x-8 -translate-y-4">A</span>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h3 className="font-serif text-lg md:text-xl text-[#002B5C] tracking-tight mb-1">
              Aura Care Rewards
            </h3>
            <p className="text-[#D4AF37] text-[10px] font-medium tracking-widest uppercase">
              Exclusive Privilege
            </p>
          </div>
          <div className="text-center bg-slate-50 p-2 rounded-lg border border-slate-100 hidden sm:block">
            <span className="font-serif text-lg text-[#002B5C] font-bold block leading-none">A</span>
            <span className="text-[#002B5C] text-[0.5rem] uppercase tracking-widest leading-none font-semibold">Aura</span>
          </div>
        </div>

        {/* Code Section */}
        <div className="relative bg-slate-50 rounded-xl p-2 border border-slate-200/80 mb-6 z-10 group-hover:border-[#D4AF37]/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="font-mono text-base md:text-lg font-semibold text-[#002B5C] tracking-[0.1em] md:tracking-[0.15em] truncate px-3">
              {code}
            </div>
            <Button 
              variant="outline" 
              className="border-[#002B5C]/20 hover:bg-[#002B5C] hover:text-white text-[#002B5C] rounded-lg transition-all gap-1.5 h-auto py-1.5 px-3 text-xs shrink-0"
              onClick={() => navigator.clipboard.writeText(code)}
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex flex-row justify-between items-end mt-auto relative z-10">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF9F7] border border-[#D4AF37]/30 text-[10px] md:text-xs font-semibold text-[#002B5C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
              {tier}
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" /> Min order: <span className="text-slate-800 font-semibold">{minOrder}</span>
            </p>
          </div>

          <div className="text-right bg-[#FAF9F7] px-3 py-2 rounded-xl border border-slate-100">
            <p className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5 flex items-center justify-end gap-1.5">
              <Calendar className="w-3 h-3 text-[#D4AF37]" />
              Valid Until
            </p>
            <p className="font-bold text-[#002B5C] text-sm md:text-base leading-none">{validUntil}</p>
          </div>
        </div>
      </div>

      {/* Dashed Divider with Cutouts */}
      <div className="w-[1px] relative flex flex-col justify-center items-center z-10 bg-white">
        <div className="absolute inset-y-4 left-0 w-full border-l-[1.5px] border-dashed border-slate-300"></div>
        <div className="w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200/60 absolute -top-3 -left-3 shadow-inner hidden md:block"></div>
        <div className="w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200/60 absolute -bottom-3 -left-3 shadow-inner hidden md:block"></div>
      </div>

      {/* Right Side: Voucher Value */}
      <div className="w-40 md:w-56 shrink-0 bg-[#FAF9F7] p-5 md:p-7 flex flex-col items-center justify-center relative z-10 group-hover:bg-[#F5F3ED] transition-colors duration-300">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform duration-500">
           <Gift className="w-32 h-32 text-[#D4AF37]" />
        </div>
        
        <div className="relative z-10 text-center w-full">
          <div className="font-serif text-[10px] md:text-xs font-bold tracking-widest text-[#002B5C] uppercase mb-4 line-clamp-3 leading-snug px-1">
            {title}
          </div>
          <div className="font-serif text-4xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#D4AF37] via-[#E7C97F] to-[#B5852A] drop-shadow-sm leading-none group-hover:scale-105 transition-transform">
            {amountText}
          </div>
          {unitText && (
            <div className="text-xs md:text-sm font-bold text-[#B5852A] mt-2 tracking-widest uppercase">
              {unitText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
