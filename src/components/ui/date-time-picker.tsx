"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  isDark?: boolean;
  /** When set, the calendar opens to this date by default (useful for "end" picker inheriting from "start") */
  suggestedDate?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10...55

function toLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimePicker({ value, onChange, label, required, isDark = true, suggestedDate }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const roundedMinute = Math.ceil(now.getMinutes() / 5) * 5 % 60;
  const [viewMonth, setViewMonth] = useState(now);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(roundedMinute);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when value changes from outside (e.g. auto-calc)
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setHour(d.getHours());
        setMinute(d.getMinutes());
        setViewMonth(d);
      }
    }
  }, [value]);

  // When opening with no value, default to today + current time (or suggestedDate)
  useEffect(() => {
    if (!open) return;
    if (selectedDate) return; // already has a value

    const base = suggestedDate ? new Date(suggestedDate) : new Date();
    if (!isNaN(base.getTime())) {
      const h = base.getHours();
      const m = Math.ceil(base.getMinutes() / 5) * 5 % 60;
      setSelectedDate(base);
      setViewMonth(base);
      setHour(h);
      setMinute(m);
      // Emit the default value so parent form gets it immediately
      const d = new Date(base);
      d.setHours(h, m, 0, 0);
      onChange(toLocalValue(d));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to selected hour/minute when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        hourRef.current?.querySelector("[data-selected=true]")?.scrollIntoView({ block: "center", behavior: "instant" });
        minuteRef.current?.querySelector("[data-selected=true]")?.scrollIntoView({ block: "center", behavior: "instant" });
      }, 50);
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function emit(date: Date | null, h: number, m: number) {
    if (!date) return;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    onChange(toLocalValue(d));
  }

  function handleDateClick(day: Date) {
    setSelectedDate(day);
    emit(day, hour, minute);
  }

  function handleHourClick(h: number) {
    setHour(h);
    emit(selectedDate, h, minute);
  }

  function handleMinuteClick(m: number) {
    setMinute(m);
    emit(selectedDate, hour, m);
    // Close after full selection
    if (selectedDate) setTimeout(() => setOpen(false), 200);
  }

  // Calendar grid
  const mStart = startOfMonth(viewMonth);
  const mEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(mStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
  const calDays: Date[] = [];
  let cur = calStart;
  while (cur <= calEnd) { calDays.push(cur); cur = addDays(cur, 1); }

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const displayValue = selectedDate
    ? `${format(selectedDate, "dd/MM/yyyy")} ${pad2(hour)}:${pad2(minute)}`
    : "";

  // Theme classes
  const bg = isDark ? "bg-[#111827]" : "bg-white";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const txt = isDark ? "text-white" : "text-gray-900";
  const txtMuted = isDark ? "text-white/35" : "text-gray-400";
  const txtSoft = isDark ? "text-white/60" : "text-gray-500";
  const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";
  const inputBg = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/20"
    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400";

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className={cn("text-sm font-medium mb-1.5 block", txtSoft)}>
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-3 h-11 rounded-xl border text-sm text-left transition-all",
          inputBg,
          open && "ring-2 ring-cyan-500/30 border-cyan-500/50"
        )}
      >
        <CalendarIcon className={cn("w-4 h-4 shrink-0", txtMuted)} />
        {displayValue ? (
          <span className={txt}>{displayValue}</span>
        ) : (
          <span className={txtMuted}>Selecionar...</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute z-50 mt-2 rounded-2xl border shadow-2xl overflow-hidden",
          bg, border,
          isDark ? "shadow-black/50" : "shadow-gray-300/50",
        )} style={{ width: "420px", zIndex: 9999 }}>
          <div className="flex">
            {/* Calendar side */}
            <div className="flex-1 p-4 min-w-0">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                  className={cn("p-1.5 rounded-lg transition-colors", hoverBg, txtMuted)}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className={cn("text-sm font-semibold capitalize", txt)}>
                  {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                  className={cn("p-1.5 rounded-lg transition-colors", hoverBg, txtMuted)}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                  <div key={i} className={cn("text-center text-[10px] font-semibold py-1", txtMuted)}>{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calDays.map((day) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurMonth = isSameMonth(day, viewMonth);
                  const isTodayD = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all",
                        isSelected
                          ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                          : isTodayD
                            ? cn("ring-1 ring-cyan-400/50 font-bold", txt)
                            : isCurMonth
                              ? cn(txt, hoverBg)
                              : cn(txtMuted, "opacity-40")
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div className="mt-2 flex justify-between items-center">
                <button type="button" onClick={() => { setViewMonth(new Date()); handleDateClick(new Date()); }}
                  className="text-[11px] text-cyan-500 hover:text-cyan-400 transition-colors font-medium">
                  Hoje
                </button>
                {selectedDate && (
                  <span className={cn("text-[11px]", txtMuted)}>
                    {format(selectedDate, "dd/MM/yyyy")} {pad2(hour)}:{pad2(minute)}
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className={cn("w-px", isDark ? "bg-white/5" : "bg-gray-100")} />

            {/* Time side — two scrollable columns */}
            <div className="flex" style={{ width: "130px" }}>
              {/* Hours column */}
              <div className="flex-1 flex flex-col">
                <div className={cn("text-[10px] font-semibold text-center py-2 border-b uppercase tracking-wider",
                  isDark ? "text-white/20 border-white/5" : "text-gray-400 border-gray-100")}>
                  Hora
                </div>
                <div ref={hourRef} className="flex-1 overflow-y-auto max-h-[260px] py-1 scrollbar-thin">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-selected={hour === h}
                      onClick={() => handleHourClick(h)}
                      className={cn(
                        "w-full py-1.5 text-center text-sm font-medium transition-all rounded-md mx-auto",
                        hour === h
                          ? "bg-cyan-500 text-white shadow-sm"
                          : cn(txtSoft, hoverBg)
                      )}
                    >
                      {pad2(h)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className={cn("w-px", isDark ? "bg-white/5" : "bg-gray-100")} />

              {/* Minutes column */}
              <div className="flex-1 flex flex-col">
                <div className={cn("text-[10px] font-semibold text-center py-2 border-b uppercase tracking-wider",
                  isDark ? "text-white/20 border-white/5" : "text-gray-400 border-gray-100")}>
                  Min
                </div>
                <div ref={minuteRef} className="flex-1 overflow-y-auto max-h-[260px] py-1 scrollbar-thin">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-selected={minute === m}
                      onClick={() => handleMinuteClick(m)}
                      className={cn(
                        "w-full py-1.5 text-center text-sm font-medium transition-all rounded-md mx-auto",
                        minute === m
                          ? "bg-cyan-500 text-white shadow-sm"
                          : cn(txtSoft, hoverBg)
                      )}
                    >
                      {pad2(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
