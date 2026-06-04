"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { LogBookEntry, Material, LogBookActionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, BookOpen, Thermometer, ArrowDownToLine, ArrowUpFromLine, Sparkles, Wrench, MoreHorizontal } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACTION_CONFIG: Record<LogBookActionType, { label: string; icon: any; color: string }> = {
  sterilization: { label: "Esterilização",  icon: Thermometer,     color: "text-cyan-400 bg-cyan-500/10" },
  stock_in:      { label: "Entrada de estoque", icon: ArrowDownToLine, color: "text-emerald-400 bg-emerald-500/10" },
  stock_out:     { label: "Saída de estoque",   icon: ArrowUpFromLine, color: "text-amber-400 bg-amber-500/10" },
  cleaning:      { label: "Limpeza",            icon: Sparkles,        color: "text-violet-400 bg-violet-500/10" },
  maintenance:   { label: "Manutenção",         icon: Wrench,          color: "text-orange-400 bg-orange-500/10" },
  other:         { label: "Outro",              icon: MoreHorizontal,  color: "text-gray-400 bg-gray-500/10" },
};

export default function DiarioPage() {
  const qc = useQueryClient();
  const [isDark, setIsDark] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ action_type: LogBookActionType; description: string; material_id: string; quantity: string }>({
    action_type: "sterilization", description: "", material_id: "", quantity: "",
  });

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data: entries = [] } = useQuery<LogBookEntry[]>({
    queryKey: ["logbook"],
    queryFn: () => api.get("/logs/logbook", { params: { limit: 100 } }).then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: () => api.get("/materials").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post("/logs/logbook", {
      action_type: form.action_type,
      description: form.description,
      material_id: form.material_id || undefined,
      quantity: form.quantity ? parseFloat(form.quantity) : undefined,
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logbook"] });
      setShowForm(false);
      setForm({ action_type: "sterilization", description: "", material_id: "", quantity: "" });
      toast.success("Registro adicionado!");
    },
    onError: () => toast.error("Erro ao registrar"),
  });

  const labelCls = cn("text-sm font-medium", isDark ? "text-white/60" : "text-gray-600");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");

  // Group entries by date
  const grouped: Record<string, LogBookEntry[]> = {};
  entries.forEach((e) => {
    const dateKey = format(parseISO(e.created_at), "yyyy-MM-dd");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          Diário de Bordo
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-indigo-500 to-indigo-600 border-0 rounded-xl text-white shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4 mr-1.5" />Novo registro
        </Button>
      </div>

      {/* Entries grouped by date */}
      {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).length === 0 && (
        <p className={cn("text-center py-16", isDark ? "text-white/20" : "text-gray-400")}>Nenhum registro ainda.</p>
      )}

      {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((dateKey) => (
        <div key={dateKey} className="space-y-2">
          <p className={cn("text-sm font-semibold capitalize px-1", isDark ? "text-white/30" : "text-gray-400")}>
            {format(new Date(dateKey + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="space-y-2">
            {grouped[dateKey].map((entry) => {
              const cfg = ACTION_CONFIG[entry.action_type];
              const Icon = cfg.icon;
              return (
                <div key={entry.id} className={cn("rounded-2xl border p-4 flex items-start gap-4", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm", cfg.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{cfg.label}</span>
                      <span className={cn("text-xs shrink-0", isDark ? "text-white/20" : "text-gray-400")}>{format(parseISO(entry.created_at), "HH:mm")}</span>
                    </div>
                    <p className={cn("text-sm mt-0.5", isDark ? "text-white/50" : "text-gray-600")}>{entry.description}</p>
                    {entry.material_name && (
                      <p className={cn("text-xs mt-1", isDark ? "text-white/30" : "text-gray-400")}>
                        Material: {entry.material_name}{entry.quantity ? ` · ${entry.quantity}` : ""}
                      </p>
                    )}
                    {entry.user_name && (
                      <p className={cn("text-xs mt-0.5", isDark ? "text-white/20" : "text-gray-400")}>por {entry.user_name}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader><DialogTitle>Novo registro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Tipo de ação</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ACTION_CONFIG) as [LogBookActionType, typeof ACTION_CONFIG[LogBookActionType]][]).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={type} onClick={() => setForm((f) => ({ ...f, action_type: type }))}
                      className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm transition-all text-left",
                        form.action_type === type
                          ? isDark ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" : "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      )}>
                      <Icon className="w-4 h-4 shrink-0" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Descrição <span className="text-red-400">*</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="Descreva o que foi feito…"
                className={cn("resize-none rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200")} />
            </div>
            {(form.action_type === "sterilization" || form.action_type === "stock_in" || form.action_type === "stock_out") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Material</Label>
                  <select value={form.material_id} onChange={(e) => setForm((f) => ({ ...f, material_id: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                    <option value="" className={isDark ? "bg-[#1a1e2e]" : "bg-white"}>— Nenhum —</option>
                    {materials.map((m) => <option key={m.id} value={m.id} className={isDark ? "bg-[#1a1e2e]" : "bg-white"}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Quantidade</Label>
                  <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className={inputCls} />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 border-0 text-white" disabled={saveMutation.isPending || !form.description} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Registrando…" : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
