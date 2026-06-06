"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Plus, TrendingDown, CheckCircle2, Clock, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; dark: string; light: string }> = {
  pending:   { label: "Pendente",   dark: "bg-amber-500/15 text-amber-300 border-amber-500/20",   light: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:      { label: "Pago",       dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "Em atraso",  dark: "bg-red-500/15 text-red-300 border-red-500/20",         light: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelado",  dark: "bg-white/5 text-white/30 border-white/10",              light: "bg-gray-50 text-gray-400 border-gray-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  salary: "Salários", rent: "Aluguel", supplies: "Materiais",
  equipment: "Equipamentos", utilities: "Serviços (luz/água/tel)",
  marketing: "Marketing", taxes: "Impostos", other: "Outros",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito", bank_transfer: "Transferência",
  insurance: "Convênio", check: "Cheque",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const EMPTY_FORM = {
  description: "", amount: "", due_date: "", category: "other",
  supplier: "", payment_method: "", is_recurring: "false", notes: "",
};

type Filter = "all" | "pending" | "overdue" | "paid";

export default function ContasPagarPage() {
  const qc = useQueryClient();
  const isDark = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: payables = [], isLoading } = useQuery<any[]>({
    queryKey: ["payables", filter],
    queryFn: () => api.get("/financial/payables", {
      params: filter !== "all" ? { status: filter } : {}
    }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method || undefined,
        supplier: form.supplier || undefined,
        notes: form.notes || undefined,
        is_recurring: form.is_recurring === "true",
      };
      if (editingId) return api.patch(`/financial/payables/${editingId}`, payload).then((r) => r.data);
      return api.post("/financial/payables", payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payables"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(editingId ? "Despesa atualizada!" : "Despesa registrada!");
      closeForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Erro ao salvar"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/financial/payables/${id}`, { status: "paid" }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payables"] }); qc.invalidateQueries({ queryKey: ["financial-summary"] }); toast.success("Marcado como pago!"); },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/financial/payables/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payables"] }); toast.success("Removido."); },
    onError: () => toast.error("Erro ao remover"),
  });

  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({
      description: p.description, amount: String(p.amount), due_date: p.due_date,
      category: p.category, supplier: p.supplier ?? "", payment_method: p.payment_method ?? "",
      is_recurring: String(p.is_recurring), notes: p.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const cardBase = cn("rounded-xl border p-4 transition-all", isDark ? "glass-card border-white/5" : "bg-white border-gray-100 shadow-sm");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");
  const labelCls = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");
  const selectStyle = isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {};

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" }, { key: "pending", label: "Pendentes" },
    { key: "overdue", label: "Em atraso" }, { key: "paid", label: "Pagas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", txt)}>
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          Contas a Pagar
        </h1>
        <Button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 rounded-xl text-white shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4 mr-1.5" /> Nova despesa
        </Button>
      </div>

      <div className={cn("flex rounded-xl overflow-hidden border text-sm w-fit", isDark ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("px-4 py-2 font-medium transition-all",
              filter === key ? isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-500 text-white"
                : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
            )}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className={cn("rounded-xl h-16 animate-pulse", isDark ? "bg-white/5" : "bg-gray-100")} />)}</div>
      ) : payables.length === 0 ? (
        <div className={cn("rounded-2xl py-14 text-center", isDark ? "glass-card" : "bg-white border border-gray-100 shadow-sm")}>
          <TrendingDown className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-white/10" : "text-gray-300")} />
          <p className={txtMuted}>Nenhuma despesa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payables.map((p) => {
            const cfg = STATUS_LABELS[p.status] ?? STATUS_LABELS.pending;
            return (
              <div key={p.id} className={cardBase}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate", txt)}>{p.description}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={cn("text-xs", isDark ? "text-amber-400/60" : "text-amber-600")}>
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                      {p.supplier && <span className={cn("text-xs", txtMuted)}>{p.supplier}</span>}
                      <span className={cn("text-xs", txtMuted)}>
                        Venc. {format(parseISO(p.due_date + "T00:00:00"), "dd/MM/yyyy")}
                      </span>
                      {p.is_recurring && <span className={cn("text-xs px-1.5 py-0.5 rounded", isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-600")}>Recorrente</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className={cn("font-bold text-lg", txt)}>{fmt(p.amount)}</p>
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", isDark ? cfg.dark : cfg.light)}>{cfg.label}</span>
                    <div className="flex gap-1">
                      {(p.status === "pending" || p.status === "overdue") && (
                        <button onClick={() => markPaidMutation.mutate(p.id)}
                          className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                            isDark ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}>
                          Marcar pago
                        </button>
                      )}
                      <button onClick={() => openEdit(p)} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-amber-400 hover:bg-amber-500/10" : "text-gray-300 hover:text-amber-600 hover:bg-amber-50")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Remover esta despesa?")) deleteMutation.mutate(p.id); }} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className={cn("max-w-lg rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
          <DialogHeader><DialogTitle>{editingId ? "Editar despesa" : "Nova despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className={labelCls}>Descrição *</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex: Aluguel sala" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className={labelCls}>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className={labelCls}>Categoria</Label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={selectStyle}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v}</option>)}
                </select></div>
              <div className="space-y-1.5"><Label className={labelCls}>Fornecedor</Label>
                <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Nome do fornecedor" className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className={labelCls}>Forma de pagamento</Label>
                <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={selectStyle}>
                  <option value="">— Não definido —</option>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v}</option>)}
                </select></div>
              <div className="space-y-1.5"><Label className={labelCls}>Recorrente?</Label>
                <select value={form.is_recurring} onChange={(e) => set("is_recurring", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={selectStyle}>
                  <option value="false" className={isDark ? "bg-[#1a1e2e]" : ""}>Não</option>
                  <option value="true" className={isDark ? "bg-[#1a1e2e]" : ""}>Sim (mensal)</option>
                </select></div>
            </div>
            <div className="space-y-1.5"><Label className={labelCls}>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={cn(inputCls, "resize-none")} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm} className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")}>Cancelar</Button>
              <Button disabled={saveMutation.isPending || !form.description || !form.amount || !form.due_date}
                onClick={() => saveMutation.mutate()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 rounded-xl text-white">
                {saveMutation.isPending ? "Salvando..." : editingId ? "Salvar" : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
