"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type DatePickerButtonProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  label?: string;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
};

type DateTimePickerButtonProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
};

export function DatePickerButton({
  value,
  onChange,
  min,
  label,
  className,
  buttonClassName,
  align = "left",
}: DatePickerButtonProps) {
  const safeValue = value || getTodayInputValue();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(parseInputDate(safeValue)));

  const handleSelectDate = (date: string) => {
    if (min && date < min) return;
    onChange(date);
    setOpen(false);
  };

  const handleToday = () => {
    const today = getTodayInputValue();
    const nextDate = min && today < min ? min : today;
    onChange(nextDate);
    setVisibleMonth(monthStart(parseInputDate(nextDate)));
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => {
          setVisibleMonth(monthStart(parseInputDate(safeValue)));
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#00236f] shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50",
          buttonClassName,
        )}
        aria-expanded={open}
        aria-label={label ?? "Chọn ngày"}
      >
        <CalendarDays className="h-4 w-4" />
        <span>{value ? formatDate(value) : label ?? "Chọn ngày"}</span>
      </button>
      {open ? (
        <CalendarPopover
          selectedDate={safeValue}
          visibleMonth={visibleMonth}
          min={min}
          align={align}
          onPreviousMonth={() => setVisibleMonth((current) => addMonths(current, -1))}
          onNextMonth={() => setVisibleMonth((current) => addMonths(current, 1))}
          onSelectDate={handleSelectDate}
          onToday={handleToday}
        />
      ) : null}
    </div>
  );
}

export function DateTimePickerButton({ value, onChange, label, className, buttonClassName, align = "left" }: DateTimePickerButtonProps) {
  const date = value ? value.slice(0, 10) : "";
  const time = value.includes("T") ? value.slice(11, 16) : "";

  const updateDate = (nextDate: string) => {
    onChange(buildDateTimeValue(nextDate, time));
  };

  const updateTime = (nextTime: string) => {
    onChange(date ? buildDateTimeValue(date, nextTime) : "");
  };

  return (
    <div className={cn("grid gap-2 sm:grid-cols-[minmax(0,1fr)_108px]", className)}>
      <DatePickerButton value={date} onChange={updateDate} label={label} buttonClassName={cn("w-full justify-start", buttonClassName)} align={align} />
      <input
        type="time"
        value={time}
        onChange={(event) => updateTime(event.target.value)}
        disabled={!date}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#00236f] shadow-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`${label ?? "Ngày"} - giờ`}
      />
    </div>
  );
}

function CalendarPopover({
  selectedDate,
  visibleMonth,
  min,
  align,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  onToday,
}: {
  selectedDate: string;
  visibleMonth: Date;
  min?: string;
  align: "left" | "right";
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string) => void;
  onToday: () => void;
}) {
  const days = buildCalendarDays(visibleMonth);

  return (
    <div
      className={cn(
        "absolute top-12 z-[9999] w-[17.5rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)]",
        align === "right" ? "right-0" : "left-0",
      )}
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPreviousMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Tháng trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-black text-slate-950">{formatMonthTitle(visibleMonth)}</p>
        <button type="button" onClick={onNextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Tháng sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase text-slate-400">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inputValue = toInputDate(day.date);
          const selected = inputValue === selectedDate;
          const inMonth = day.date.getMonth() === visibleMonth.getMonth();
          const disabled = Boolean(min && inputValue < min);

          return (
            <button
              key={inputValue}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(inputValue)}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-xs font-black transition",
                selected
                  ? "bg-[#00236f] text-white shadow-sm"
                  : inMonth
                    ? "text-slate-950 hover:bg-cyan-50 hover:text-[#00236f]"
                    : "text-slate-300 hover:bg-slate-50",
                disabled && "cursor-not-allowed text-slate-200 hover:bg-transparent hover:text-slate-200",
              )}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2 text-right">
        <button type="button" onClick={onToday} className="text-xs font-black text-[#00236f] hover:underline">
          Hôm nay
        </button>
      </div>
    </div>
  );
}

export function formatDatePickerValue(value: string) {
  return formatDate(value);
}

export function getTodayInputValue() {
  return toInputDate(new Date());
}

function buildDateTimeValue(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function buildCalendarDays(visibleMonth: Date) {
  const firstDay = monthStart(visibleMonth);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function toInputDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthTitle(value: Date) {
  return `Tháng ${value.getMonth() + 1}, ${value.getFullYear()}`;
}
