"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Material } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Package, Edit2, AlertTriangle, ArrowUp, ArrowDown, Minus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

const UNITS = ["un", "cx", "ml", "mg", "g", "L", "kg", "m", "rolo", "par"];

export default function MateriaisPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [showStock, setShowStock] = useState<Material | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [form, setForm] = useState({ name: "", description: "", unit: "un", min_stock: 0 });
  const [filter, setFilter] = useState<"all" | "low" | "ok">("all");
  const [search, setSearch] = useState("");
  const isDark = useTheme();

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["materials", search],
    queryFn: () => api.get("/materials", { params: search ? { search } : {} }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingMat) return api.patch(`/materials/${editingMat.id}`, form).then((r) => r.data);
      return api.post("/materials", form).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["materials"] }); setShowForm(false); setEditingMat(null); setForm({ name: "", description: "", unit: "un", min_stock: 0 }); toast.success("Material salvo!"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => api.patch(`/materials/${id}/stock`, { quantity: qty }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["materials"] }); setShowStock(null); setStockQty(""); toast.success("Estoque atualizado!"); },
    onError: () => toast.error("Erro ao atualizar estoque"),
  });

  function openEdit(m: Material) {
    setEditingMat(m);
    setForm({ name: m.name, description: m.description ?? "", unit: m.unit, min_stock: m.min_stock });
    setShowForm(true);
  }

  const isLow = (m: Material) => m.current_stock <= m.min_stock && m.min_stock > 0;

  const filtered = materials.filter((m) => {
    if (filter === "low") return isLow(m);
    if (filter === "ok") return !isLow(m);
    return true;
  });

  const lowCount = materials.filter(isLow).length;

  const card = cn("rounded-2xl border p-5 transition-all", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm hover:shadow-md");
  const labelCls = cn("text-sm font-medium", isDark ? "text-white/60" : "text-gray-600");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Package className="w-4 h-4 text-white" />
          </div>
          Materiais & Estoque
        </h1>
        <div className="flex items-center gap-2">
          {lowCount > 0 && (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-sm", isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200")}>
              <AlertTriangle className="w-4 h-4" />{lowCount} com estoque baixo
            </div>
          )}
          <Button onClick={() => { setEditingMat(null); setForm({ name: "", description: "", unit: "un", min_stock: 0 }); setShowForm(true); }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 rounded-xl text-white shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4 mr-1.5" />Novo material
          </Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..."
            className={cn("pl-9 w-56 rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-white border-gray-200")}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className={cn("flex rounded-xl overflow-hidden border text-sm w-fit", isDark ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
        {([["all", "Todos"], ["low", "Estoque baixo"], ["ok", "OK"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn("px-4 py-2 font-medium transition-all",
              filter === v ? isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-500 text-white" : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
            )}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const low = isLow(m);
          const pct = m.min_stock > 0 ? Math.min(100, (m.current_stock / (m.min_stock * 2)) * 100) : 100;
          return (
            <div key={m.id} className={cn(card, low ? isDark ? "border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]" : "border-amber-200 shadow-amber-50" : "")}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className={cn("font-semibold", isDark ? "text-white" : "text-gray-800")}>{m.name}</p>
                  {m.description && <p className={cn("text-xs mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{m.description}</p>}
                </div>
                <button onClick={() => openEdit(m)}
                  className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-white/20 hover:text-cyan-300 hover:bg-cyan-500/10" : "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50")}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stock bar */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(isDark ? "text-white/30" : "text-gray-400")}>Estoque atual</span>
                  <span className={cn("font-semibold", low ? isDark ? "text-amber-400" : "text-amber-600" : isDark ? "text-emerald-400" : "text-emerald-600")}>
                    {m.current_stock} {m.unit}
                  </span>
                </div>
                <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-gray-100")}>
                  <div className={cn("h-full rounded-full transition-all", low ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
                </div>
                {m.min_stock > 0 && (
                  <p className={cn("text-[10px]", isDark ? "text-white/20" : "text-gray-400")}>Mín: {m.min_stock} {m.unit}</p>
                )}
              </div>

              {low && (
                <div className={cn("flex items-center gap-1.5 text-xs mb-3 p-2 rounded-lg", isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700")}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Repor estoque
                </div>
              )}

              <button onClick={() => { setShowStock(m); setStockQty(m.current_stock.toString()); }}
                className={cn("w-full text-sm py-2 rounded-xl border transition-colors font-medium", isDark ? "border-white/10 text-white/40 hover:bg-white/5 hover:text-white/70" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                Ajustar estoque
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className={cn("col-span-3 text-center py-12", isDark ? "text-white/20" : "text-gray-400")}>Nenhum material encontrado.</p>
        )}
      </div>

      {/* Stock adjustment dialog */}
      {showStock && (
        <Dialog open onOpenChange={() => setShowStock(null)}>
          <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
            <DialogHeader><DialogTitle>Ajustar estoque — {showStock.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className={cn("flex items-center justify-between p-4 rounded-xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                <span className={cn(isDark ? "text-white/50" : "text-gray-500")}>Atual</span>
                <span className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-800")}>{showStock.current_stock} {showStock.unit}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setStockQty((v) => String(Math.max(0, parseFloat(v || "0") - 1)))}
                  className={cn("p-2.5 rounded-xl border transition-colors", isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
                  <Minus className="w-4 h-4" />
                </button>
                <Input type="number" min={0} value={stockQty} onChange={(e) => setStockQty(e.target.value)} className={cn("flex-1 text-center font-bold text-lg", inputCls)} />
                <button onClick={() => setStockQty((v) => String(parseFloat(v || "0") + 1))}
                  className={cn("p-2.5 rounded-xl border transition-colors", isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowStock(null)}>Cancelar</Button>
                <Button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 text-white"
                  disabled={stockMutation.isPending}
                  onClick={() => stockMutation.mutate({ id: showStock.id, qty: parseFloat(stockQty) })}>
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Material form dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader><DialogTitle>{editingMat ? "Editar material" : "Novo material"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Nome <span className="text-red-400">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Luva descartável" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className={cn("resize-none rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Unidade</Label>
                <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                  {UNITS.map((u) => <option key={u} value={u} className={isDark ? "bg-[#1a1e2e]" : "bg-white"}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Estoque mínimo</Label>
                <Input type="number" min={0} value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: parseFloat(e.target.value) }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 text-white" disabled={saveMutation.isPending || !form.name} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
