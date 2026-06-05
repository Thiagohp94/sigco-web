"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Procedure, ProcedureMaterial, Material } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ClipboardList, Edit2, Trash2, Clock, DollarSign, Package, X, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#3B82F6", "#14B8A6"];

export default function ProcedimentosPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProc, setEditingProc] = useState<Procedure | null>(null);
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [form, setForm] = useState({ name: "", duration_minutes: 30, price: "", color: "#06B6D4" });
  const [search, setSearch] = useState("");
  const isDark = useTheme();

  const { data: procedures = [] } = useQuery<Procedure[]>({
    queryKey: ["procedures", search],
    queryFn: () => api.get("/appointments/procedures/list", { params: search ? { search } : {} }).then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: () => api.get("/materials").then((r) => r.data),
  });

  const { data: procMaterials = [] } = useQuery<ProcedureMaterial[]>({
    queryKey: ["proc-materials", selectedProc?.id],
    queryFn: () => api.get(`/materials/procedure/${selectedProc!.id}`).then((r) => r.data),
    enabled: !!selectedProc,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, duration_minutes: form.duration_minutes, price: form.price ? parseFloat(form.price) : null, color: form.color };
      if (editingProc) return api.patch(`/appointments/procedures/${editingProc.id}`, payload).then((r) => r.data);
      return api.post("/appointments/procedures", payload).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procedures"] }); setShowForm(false); setEditingProc(null); setForm({ name: "", duration_minutes: 30, price: "", color: "#06B6D4" }); toast.success(editingProc ? "Procedimento atualizado!" : "Procedimento criado!"); },
    onError: () => toast.error("Erro ao salvar procedimento"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/procedures/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procedures"] }); toast.success("Procedimento removido."); },
    onError: () => toast.error("Erro ao remover"),
  });

  const addMaterialMutation = useMutation({
    mutationFn: ({ procId, materialId, qty }: { procId: string; materialId: string; qty: number }) =>
      api.post(`/materials/procedure/${procId}`, { material_id: materialId, quantity_required: qty }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proc-materials", selectedProc?.id] }); toast.success("Material vinculado!"); },
    onError: () => toast.error("Erro ao vincular material"),
  });

  const removeMaterialMutation = useMutation({
    mutationFn: (pmId: string) => api.delete(`/materials/procedure-material/${pmId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proc-materials", selectedProc?.id] }); toast.success("Material removido."); },
  });

  function openEdit(p: Procedure) {
    setEditingProc(p);
    setForm({ name: p.name, duration_minutes: p.duration_minutes, price: p.price?.toString() ?? "", color: p.color });
    setShowForm(true);
  }

  const [addMatId, setAddMatId] = useState("");
  const [addMatQty, setAddMatQty] = useState(1);

  const card = cn("rounded-2xl border p-5 transition-all", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm hover:shadow-md");
  const labelCls = cn("text-sm font-medium", isDark ? "text-white/60" : "text-gray-600");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
          <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          Procedimentos
        </h1>
        <Button onClick={() => { setEditingProc(null); setForm({ name: "", duration_minutes: 30, price: "", color: "#06B6D4" }); setShowForm(true); }}
          className="bg-gradient-to-r from-violet-500 to-violet-600 border-0 rounded-xl text-white shadow-lg shadow-violet-500/20">
          <Plus className="w-4 h-4 mr-1.5" />Novo procedimento
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar procedimento..."
          className={cn("pl-9 rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-white border-gray-200")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {procedures.filter((p) => p.is_active).map((p) => (
          <div key={p.id} className={cn(card, "cursor-pointer", selectedProc?.id === p.id ? isDark ? "border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]" : "border-violet-300 shadow-violet-100" : "")}
            onClick={() => setSelectedProc(selectedProc?.id === p.id ? null : p)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <p className={cn("font-semibold text-base leading-tight", isDark ? "text-white" : "text-gray-800")}>{p.name}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                  className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-white/20 hover:text-cyan-300 hover:bg-cyan-500/10" : "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50")}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                  className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className={cn("flex items-center gap-1.5", isDark ? "text-white/40" : "text-gray-500")}>
                <Clock className="w-3.5 h-3.5" />{p.duration_minutes} min
              </span>
              {p.price && (
                <span className={cn("flex items-center gap-1.5", isDark ? "text-emerald-400/60" : "text-emerald-600")}>
                  <DollarSign className="w-3.5 h-3.5" />R$ {Number(p.price).toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
          </div>
        ))}
        {procedures.filter((p) => p.is_active).length === 0 && (
          <p className={cn("col-span-3 text-center py-12", isDark ? "text-white/20" : "text-gray-400")}>Nenhum procedimento cadastrado.</p>
        )}
      </div>

      {/* Materials panel for selected procedure */}
      {selectedProc && (
        <div className={cn("rounded-2xl border p-6 space-y-4", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
          <div className="flex items-center justify-between">
            <h2 className={cn("font-semibold text-base flex items-center gap-2", isDark ? "text-white" : "text-gray-800")}>
              <Package className="w-4 h-4" />Materiais — {selectedProc.name}
            </h2>
            <button onClick={() => setSelectedProc(null)} className={isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {procMaterials.length > 0 ? (
            <div className="space-y-1.5">
              {procMaterials.map((pm) => (
                <div key={pm.id} className={cn("flex items-center justify-between px-4 py-3 rounded-xl", isDark ? "bg-white/[0.03]" : "bg-gray-50")}>
                  <div>
                    <span className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{pm.material_name}</span>
                    <span className={cn("ml-2 text-xs", isDark ? "text-white/30" : "text-gray-400")}>{pm.quantity_required} {pm.unit}</span>
                  </div>
                  <button onClick={() => removeMaterialMutation.mutate(pm.id)}
                    className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={cn("text-sm", isDark ? "text-white/20" : "text-gray-400")}>Nenhum material vinculado.</p>
          )}

          {/* Add material */}
          <div className={cn("flex gap-2 items-end pt-2 border-t", isDark ? "border-white/5" : "border-gray-100")}>
            <div className="flex-1 space-y-1.5">
              <Label className={labelCls}>Material</Label>
              <select value={addMatId} onChange={(e) => setAddMatId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                style={isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                <option value="" className={isDark ? "bg-[#1a1e2e]" : "bg-white"}>— Selecionar —</option>
                {materials.filter((m) => m.is_active).map((m) => (
                  <option key={m.id} value={m.id} className={isDark ? "bg-[#1a1e2e]" : "bg-white"}>{m.name} ({m.unit})</option>
                ))}
              </select>
            </div>
            <div className="w-24 space-y-1.5">
              <Label className={labelCls}>Qtd.</Label>
              <Input type="number" min={0.1} step={0.1} value={addMatQty} onChange={(e) => setAddMatQty(parseFloat(e.target.value))} className={inputCls} />
            </div>
            <Button onClick={() => { if (addMatId) { addMaterialMutation.mutate({ procId: selectedProc.id, materialId: addMatId, qty: addMatQty }); setAddMatId(""); setAddMatQty(1); } }}
              disabled={!addMatId || addMaterialMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-violet-600 border-0 rounded-xl text-white">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Procedure form dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader><DialogTitle>{editingProc ? "Editar procedimento" : "Novo procedimento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Nome <span className="text-red-400">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Limpeza dental" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Duração (min)</Label>
                <Input type="number" min={5} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) }))} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Valor (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0,00" className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn("w-7 h-7 rounded-full border-2 transition-all", form.color === c ? "border-white scale-110" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 border-0 text-white" disabled={saveMutation.isPending || !form.name} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
