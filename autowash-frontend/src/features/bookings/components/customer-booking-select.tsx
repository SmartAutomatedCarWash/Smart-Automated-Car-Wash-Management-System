"use client";

import * as React from "react";
import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/ui/popover";
import { cn } from "@/shared/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  description?: string;
  helper?: string;
  badge?: { label: string; tone: "amber" | "emerald" | "sky" | "rose" | "purple" | "blue" };
};

function filterOptions(options: SelectOption[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return options;
  }
  return options.filter((option) => {
    const haystack = [option.label, option.description, option.helper].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

export function CustomerBookingSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
  renderValue,
}: {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
  renderValue?: (option: SelectOption | undefined) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = React.useMemo(() => filterOptions(options, query), [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-auto min-h-12 w-full items-center justify-between gap-3 rounded-2xl border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium hover:bg-slate-50",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {renderValue ? renderValue(selected) : selected?.label ?? placeholder}
          </span>
          {selected ? (
            <span
              aria-label="Clear selection"
              role="button"
              tabIndex={0}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onValueChange("");
                setOpen(false);
                setQuery("");
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                onValueChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b px-3 py-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">{emptyText}</div>
          ) : (
            filtered.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900">{option.label}</div>
                      {option.badge && (
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.4)] animate-pulse",
                          option.badge.tone === "emerald" && "bg-emerald-100 text-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.4)]",
                          option.badge.tone === "sky" && "bg-sky-100 text-sky-600 shadow-[0_0_10px_rgba(56,189,248,0.4)]",
                          option.badge.tone === "rose" && "bg-rose-100 text-rose-600 shadow-[0_0_10px_rgba(251,113,133,0.4)]",
                          option.badge.tone === "purple" && "bg-purple-100 text-purple-600 shadow-[0_0_10px_rgba(192,132,252,0.4)]",
                          option.badge.tone === "blue" && "bg-blue-100 text-blue-600 shadow-[0_0_10px_rgba(96,165,250,0.4)]"
                        )}>
                          <Sparkles className="h-3 w-3" />
                          {option.badge.label}
                        </span>
                      )}
                    </div>
                    {option.description ? (
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {option.description}
                      </div>
                    ) : null}
                    {option.helper ? (
                      <div className="mt-1 text-xs font-medium text-sky-700">{option.helper}</div>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CustomerBookingMultiSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
}: {
  options: SelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => filterOptions(options, query), [options, query]);
  const selectedOptions = options.filter((option) => value.includes(option.value));

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((item) => item !== optionValue));
      return;
    }
    onValueChange([...value, optionValue]);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "min-h-12 w-full justify-between rounded-2xl border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium hover:bg-slate-50",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                >
                  <span className="truncate">{option.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${option.label}`}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sky-500 hover:bg-sky-100"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleOption(option.value);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b px-3 py-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">{emptyText}</div>
          ) : (
            filtered.map((option) => {
              const active = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{option.label}</div>
                    {option.description ? (
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {option.description}
                      </div>
                    ) : null}
                    {option.helper ? (
                      <div className="mt-1 text-xs font-medium text-sky-700">{option.helper}</div>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
