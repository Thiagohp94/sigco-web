"use client";

import { useState } from "react";
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

const CONDITION_CONFIG: Record<ToothCondition, { label: string; fill: string; stroke: string; glow: string; text: string }> = {
  healthy:      { label: "Hígido",       fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.1)",  glow: "",                                  text: "text-white/30" },
  caries:       { label: "Cárie",        fill: "rgba(251,146,60,0.15)", stroke: "rgba(251,146,60,0.5)",   glow: "drop-shadow(0 0 4px rgba(251,146,60,0.3))",  text: "text-orange-400" },
  restoration:  { label: "Restauração",  fill: "rgba(6,182,212,0.15)",  stroke: "rgba(6,182,212,0.5)",    glow: "drop-shadow(0 0 4px rgba(6,182,212,0.3))",   text: "text-cyan-400" },
  crown:        { label: "Coroa",        fill: "rgba(139,92,246,0.15)", stroke: "rgba(139,92,246,0.5)",   glow: "drop-shadow(0 0 4px rgba(139,92,246,0.3))",  text: "text-violet-400" },
  extraction:   { label: "Extração",     fill: "rgba(239,68,68,0.12)",  stroke: "rgba(239,68,68,0.5)",    glow: "drop-shadow(0 0 4px rgba(239,68,68,0.3))",   text: "text-red-400" },
  implant:      { label: "Implante",     fill: "rgba(99,102,241,0.15)", stroke: "rgba(99,102,241,0.5)",   glow: "drop-shadow(0 0 4px rgba(99,102,241,0.3))",  text: "text-indigo-400" },
  root_canal:   { label: "Endodontia",   fill: "rgba(245,158,11,0.15)", stroke: "rgba(245,158,11,0.5)",   glow: "drop-shadow(0 0 4px rgba(245,158,11,0.3))",  text: "text-amber-400" },
  missing:      { label: "Ausente",      fill: "rgba(255,255,255,0.02)", stroke: "rgba(255,255,255,0.08)", glow: "",                                  text: "text-white/15" },
  fracture:     { label: "Fratura",      fill: "rgba(236,72,153,0.15)", stroke: "rgba(236,72,153,0.5)",   glow: "drop-shadow(0 0 4px rgba(236,72,153,0.3))",  text: "text-pink-400" },
};

const UPPER_LEFT  = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_RIGHT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_RIGHT = [31, 32, 33, 34, 35, 36, 37, 38];

function ToothSVG({ number, entry, onClick }: {
  number: number;
  entry: OdontogramEntry | undefined;
  onClick: (num: number) => void;
}) {
  const condition: ToothCondition = entry?.condition ?? "healthy";
  const cfg = CONDITION_CONFIG[condition];
  const hasCondition = condition !== "healthy";

  return (
    <button
      onClick={() => onClick(number)}
      className="flex flex-col items-center gap-0.5 group"
      title={`Dente ${number} — ${cfg.label}${entry?.notes ? `\n${entry.notes}` : ""}`}
    >
      <span className={cn(
        "text-[10px] transition-all duration-200",
        hasCondition ? `font-bold ${cfg.text}` : "text-white/15 group-hover:text-white/40"
      )}>
        {number}
      </span>
      <svg
        width="28" height="34" viewBox="0 0 28 34"
        className="transition-all duration-200 group-hover:scale-110"
        style={{ filter: hasCondition ? cfg.glow : undefined }}
      >
        {/* Outer glow for active conditions */}
        {hasCondition && (
          <rect
            x="1" y="1" width="26" height="32" rx="7"
            fill="none"
            stroke={cfg.stroke}
            strokeWidth="1"
            opacity="0.3"
          />
        )}
        {/* Tooth body */}
        <rect
          x="3" y="3" width="22" height="28" rx="6"
          fill={cfg.fill}
          stroke={hasCondition ? cfg.stroke : "rgba(255,255,255,0.06)"}
          strokeWidth={hasCondition ? 1.5 : 0.5}
        />
        {/* Condition indicator */}
        {hasCondition && condition !== "missing" && condition !== "extraction" && (
          <circle cx="14" cy="17" r="4" fill={cfg.stroke} opacity="0.7" />
        )}
        {/* X for missing/extraction */}
        {(condition === "missing" || condition === "extraction") && (
          <>
            <line x1="8" y1="10" x2="20" y2="24" stroke={cfg.stroke} strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="10" x2="8" y2="24" stroke={cfg.stroke} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {/* Crown symbol */}
        {condition === "crown" && (
          <path d="M9 12 L14 8 L19 12" fill="none" stroke={cfg.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Hover border */}
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
  const qc = useQueryClient();

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
        <ToothSVG key={n} number={n} entry={entryMap[n]} onClick={openTooth} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Odontogram chart */}
      <div className="rounded-xl p-5 overflow-x-auto bg-gradient-to-b from-cyan-500/[0.03] to-violet-500/[0.03] border border-white/5">
        <div className="min-w-[560px]">
          {/* Upper arch */}
          <div className="text-center text-[9px] text-cyan-400/30 mb-2 uppercase tracking-[0.2em] font-semibold">Superior</div>
          <div className="flex justify-center gap-5">
            <Row numbers={UPPER_LEFT} />
            <div className="w-px bg-gradient-to-b from-cyan-500/20 via-cyan-500/5 to-transparent self-stretch" />
            <Row numbers={UPPER_RIGHT} />
          </div>

          {/* Midline */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <span className="text-[9px] text-white/10 uppercase tracking-[0.2em]">Linha Média</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          {/* Lower arch */}
          <div className="flex justify-center gap-5">
            <Row numbers={LOWER_LEFT} />
            <div className="w-px bg-gradient-to-b from-transparent via-violet-500/5 to-violet-500/20 self-stretch" />
            <Row numbers={LOWER_RIGHT} />
          </div>
          <div className="text-center text-[9px] text-violet-400/30 mt-2 uppercase tracking-[0.2em] font-semibold">Inferior</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(Object.entries(CONDITION_CONFIG) as [ToothCondition, typeof CONDITION_CONFIG[ToothCondition]][]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-[11px] text-white/30">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: k === "healthy" ? "rgba(255,255,255,0.05)" : v.fill,
                border: `1px solid ${v.stroke}`,
                boxShadow: k !== "healthy" ? `0 0 6px ${v.stroke}` : undefined,
              }}
            />
            <span>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass-strong rounded-2xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              Dente {selected}
              {selected && CONDITION_CONFIG[condition] && (
                <span className={cn("text-sm font-normal", CONDITION_CONFIG[condition].text)}>
                  — {CONDITION_CONFIG[condition].label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Condition preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{
              background: CONDITION_CONFIG[condition].fill,
              border: `1px solid ${CONDITION_CONFIG[condition].stroke}`,
              boxShadow: condition !== "healthy" ? `0 0 15px ${CONDITION_CONFIG[condition].stroke}40` : undefined,
            }}>
              <div className="w-5 h-5 rounded-full" style={{
                border: `2px solid ${CONDITION_CONFIG[condition].stroke}`,
                background: CONDITION_CONFIG[condition].stroke,
                boxShadow: condition !== "healthy" ? `0 0 8px ${CONDITION_CONFIG[condition].stroke}` : undefined,
              }} />
              <span className={cn("font-medium text-sm", CONDITION_CONFIG[condition].text)}>
                {CONDITION_CONFIG[condition].label}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Condição</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as ToothCondition)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/10 text-white rounded-xl">
                  {(Object.entries(CONDITION_CONFIG) as [ToothCondition, typeof CONDITION_CONFIG[ToothCondition]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            background: v.fill,
                            border: `1px solid ${v.stroke}`,
                            boxShadow: k !== "healthy" ? `0 0 4px ${v.stroke}` : undefined,
                          }}
                        />
                        {v.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Observações</Label>
              <Textarea
                placeholder="Ex: Cárie na face oclusal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelected(null)} className="border-white/10 text-white/50 hover:bg-white/5 rounded-xl">
                Cancelar
              </Button>
              <Button onClick={save} disabled={mutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl shadow-lg shadow-cyan-500/20">
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
