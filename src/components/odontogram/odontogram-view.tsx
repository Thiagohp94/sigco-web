"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import type { OdontogramEntry, ToothCondition } from "@/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CONDITIONS: { key: ToothCondition; label: string; color: string }[] = [
  { key: "healthy",     label: "Hígido",      color: "#94a3b8" },
  { key: "caries",      label: "Cárie",       color: "#f97316" },
  { key: "restoration", label: "Restauração", color: "#06b6d4" },
  { key: "crown",       label: "Coroa",       color: "#8b5cf6" },
  { key: "extraction",  label: "Extração",    color: "#ef4444" },
  { key: "implant",     label: "Implante",    color: "#6366f1" },
  { key: "root_canal",  label: "Endodontia",  color: "#f59e0b" },
  { key: "missing",     label: "Ausente",     color: "#9ca3af" },
  { key: "fracture",    label: "Fratura",     color: "#ec4899" },
];

function getCondColor(c: ToothCondition) {
  return CONDITIONS.find((x) => x.key === c)?.color ?? "#94a3b8";
}
function getCondLabel(c: ToothCondition) {
  return CONDITIONS.find((x) => x.key === c)?.label ?? c;
}

const UPPER_LEFT  = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_RIGHT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_RIGHT = [31, 32, 33, 34, 35, 36, 37, 38];

function ToothSVG({ number, entry, onClick, isDark }: {
  number: number; entry: OdontogramEntry | undefined; onClick: (num: number) => void; isDark: boolean;
}) {
  const condition: ToothCondition = entry?.condition ?? "healthy";
  const color = getCondColor(condition);
  const hasCondition = condition !== "healthy";
  const defaultStroke = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const defaultFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)";
  const numColor = hasCondition ? color : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";

  return (
    <button
      onClick={() => onClick(number)}
      className="flex flex-col items-center gap-0.5 group"
      title={`Dente ${number} — ${getCondLabel(condition)}${entry?.notes ? `\n${entry.notes}` : ""}`}
    >
      <span className="text-[10px] font-semibold transition-all duration-200" style={{ color: numColor }}>
        {number}
      </span>
      <svg width="28" height="34" viewBox="0 0 28 34" className="transition-all duration-200 group-hover:scale-110">
        {hasCondition && (
          <rect x="1" y="1" width="26" height="32" rx="7" fill="none" stroke={color} strokeWidth="1" opacity="0.25" />
        )}
        <rect
          x="3" y="3" width="22" height="28" rx="6"
          fill={hasCondition ? `${color}20` : defaultFill}
          stroke={hasCondition ? color : defaultStroke}
          strokeWidth={hasCondition ? 1.5 : 0.8}
        />
        {hasCondition && condition !== "missing" && condition !== "extraction" && (
          <circle cx="14" cy="17" r="4" fill={color} opacity="0.7" />
        )}
        {(condition === "missing" || condition === "extraction") && (
          <>
            <line x1="8" y1="10" x2="20" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="10" x2="8" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {condition === "crown" && (
          <path d="M9 12 L14 8 L19 12" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <rect
          x="2" y="2" width="24" height="30" rx="7"
          fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      </svg>
    </button>
  );
}

interface Props {
  entries: OdontogramEntry[];
  patientId: string;
}

export function OdontogramView({ entries, patientId }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [condition, setCondition] = useState<ToothCondition>("healthy");
  const [notes, setNotes] = useState("");
  const [isDark, setIsDark] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const entryMap: Record<number, OdontogramEntry> = Object.fromEntries(
    entries.map((e) => [e.tooth_number, e])
  );

  const mutation = useMutation({
    mutationFn: (data: { tooth_number: number; condition: ToothCondition; notes?: string }) =>
      api.post(`/patients/${patientId}/records/odontogram`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["odontogram", patientId] });
      toast.success("Odontograma atualizado");
      setSelected(null);
    },
    onError: () => toast.error("Erro ao atualizar odontograma"),
  });

  function openTooth(num: number) {
    const existing = entryMap[num];
    setCondition(existing?.condition ?? "healthy");
    setNotes(existing?.notes ?? "");
    setSelected(num);
  }

  function save() {
    if (!selected) return;
    mutation.mutate({ tooth_number: selected, condition, notes: notes || undefined });
  }

  const Row = ({ numbers }: { numbers: number[] }) => (
    <div className="flex gap-1 justify-center">
      {numbers.map((n) => (
        <ToothSVG key={n} number={n} entry={entryMap[n]} onClick={openTooth} isDark={isDark} />
      ))}
    </div>
  );

  const midlineColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const dividerFrom = isDark ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.25)";
  const dividerTo = "transparent";
  const labelMuted = isDark ? "text-white/20" : "text-gray-400";
  const chartBg = isDark
    ? "bg-gradient-to-b from-cyan-500/[0.03] to-violet-500/[0.03] border border-white/5"
    : "bg-gradient-to-b from-cyan-50/50 to-violet-50/30 border border-gray-200";

  return (
    <div className="space-y-4">
      <div className={cn("rounded-xl p-5 overflow-x-auto", chartBg)}>
        <div className="min-w-[560px]">
          <div className={cn("text-center text-[9px] mb-2 uppercase tracking-[0.2em] font-semibold", isDark ? "text-cyan-400/40" : "text-cyan-600/60")}>Superior</div>
          <div className="flex justify-center gap-5">
            <Row numbers={UPPER_LEFT} />
            <div className="w-px self-stretch" style={{ background: `linear-gradient(to bottom, ${dividerFrom}, ${dividerTo})` }} />
            <Row numbers={UPPER_RIGHT} />
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: midlineColor }} />
            <span className={cn("text-[9px] uppercase tracking-[0.2em]", labelMuted)}>Linha Média</span>
            <div className="flex-1 h-px" style={{ background: midlineColor }} />
          </div>

          <div className="flex justify-center gap-5">
            <Row numbers={LOWER_LEFT} />
            <div className="w-px self-stretch" style={{ background: `linear-gradient(to bottom, ${dividerTo}, ${dividerFrom})` }} />
            <Row numbers={LOWER_RIGHT} />
          </div>
          <div className={cn("text-center text-[9px] mt-2 uppercase tracking-[0.2em] font-semibold", isDark ? "text-violet-400/40" : "text-violet-600/60")}>Inferior</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {CONDITIONS.map((c) => (
          <div key={c.key} className={cn("flex items-center gap-1.5 text-[11px]", labelMuted)}>
            <div
              className="w-2.5 h-2.5 rounded-full border"
              style={{
                background: c.key === "healthy" ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)") : `${c.color}30`,
                borderColor: c.key === "healthy" ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)") : c.color,
              }}
            />
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
              Dente {selected} — <span style={{ color: getCondColor(condition) }}>{getCondLabel(condition)}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{
              background: `${getCondColor(condition)}15`,
              border: `1px solid ${getCondColor(condition)}40`,
            }}>
              <div className="w-5 h-5 rounded-full" style={{ background: getCondColor(condition) }} />
              <span className="font-medium text-sm" style={{ color: getCondColor(condition) }}>{getCondLabel(condition)}</span>
            </div>

            <div className="space-y-1.5">
              <Label className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>Condição</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as ToothCondition)}>
                <SelectTrigger className={cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn("rounded-xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: `${c.color}40`, border: `1px solid ${c.color}` }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>Observações</Label>
              <Textarea
                placeholder="Ex: Cárie na face oclusal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={cn("rounded-xl resize-none", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400")}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelected(null)}
                className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={mutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
