"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, TrendingUp, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; dark: string; light: string }> = {
  pending:   { label: "Pendente",   dark: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",     light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  paid:      { label: "Recebido",   dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "Em atraso",  dark: "bg-red-500/15 text-red-300 border-red-500/20",        light: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelado",  dark: "bg-white/5 text-white/30 border-white/10",             light: "bg-gray-50 text-gray-400 border-gray-200" },
  partial:   { label: "Parcial",    dark: "bg-amber-500/15 text-amber-300 border-amber-500/20",   light: "bg-amber-50 text-amber-700 border-amber-200" },
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito", bank_transfer: "Transferência",
  insurance: "Convênio", check: "Cheque",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const EMPTY_FORM = {
  description: "", amount: "", due_date: "", patient_id: "", installments: "1",
  payment_method: "", notes: "",
};

type Filter = "all" | "pending" | "overdue" | "paid";

export default function ContasReceberPage() {
  const qc = useQueryClient();
  const isDark = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showReceiveModal, setShowReceiveModal] = useState<any>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveMethod, setReceiveMethod] = useState("pix");

  const { data: receivables = [], isLoading } = useQuery<any[]>({
    queryKey: ["receivables", filter],
    queryFn: () => api.get("/financial/receivables", {
      params: filter !== "all" ? { status: filter } : {}
    }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        installments: parseInt(form.installments),
        payment_method: form.payment_method || undefined,
        patient_id: form.patient_id || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) return api.patch(`/financial/receivables/${editingId}`, payload).then((r) => r.data);
      return api.post("/financial/receivables", payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success(editingId ? "Cobrança atualizada!" : "Cobrança criada!");
      closeForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Erro ao salvar"),
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.post(
      `/financial/receivables/${showReceiveModal?.id}/receive`,
      null,
      { params: { amount_paid: parseFloat(receiveAmount), method: receiveMethod } }
    ).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Pagamento registrado!");
      setShowReceiveModal(null);
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/financial/receivables/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["receivables"] }); toast.success("Removido."); },
    onError: () => toast.error("Erro ao remover"),
  });

  function openEdit(r: any) {
    setEditingId(r.id);
    setForm({
      description: r.description, amount: String(r.amount),
      due_date: r.due_date, patient_id: r.patient_id ?? "",
      installments: String(r.installments), payment_method: r.payment_method ?? "",
      notes: r.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const isDark_ = isDark;
  const txt = isDark_ ? "text-white" : "text-gray-900";
  const txtSoft = isDark_ ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark_ ? "text-white/30" : "text-gray-400";
  const cardBase = cn("rounded-xl border p-4 transition-all", isDark_ ? "glass-card border-white/5" : "bg-white border-gray-100 shadow-sm");
  const inputCls = cn("rounded-xl", isDark_ ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");
  const labelCls = cn("text-sm", isDark_ ? "text-white/50" : "text-gray-600");

  const FILTERS: { key: Filter; label: string; icon: any; color: string }[] = [
    { key: "all",     label: "Todas",       icon: DollarSign,   color: "text-white" },
    { key: "pending", label: "Pendentes",   icon: Clock,        color: "text-cyan-400" },
    { key: "overdue", label: "Em atraso",   icon: AlertCircle,  color: "text-red-400" },
    { key: "paid",    label: "Recebidas",   icon: CheckCircle2, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", txt)}>
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          Contas a Receber
        </h1>
        <Button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white shadow-lg shadow-cyan-500/20">
          <Plus className="w-4 h-4 mr-1.5" /> Nova cobrança
        </Button>
      </div>

      {/* Filter tabs */}
      <div className={cn("flex rounded-xl overflow-hidden border text-sm w-fit", isDark_ ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
        {FILTERS.map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("px-4 py-2 font-medium transition-all flex items-center gap-1.5",
              filter === key
                ? isDark_ ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-500 text-white"
                : isDark_ ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon className={cn("w-3.5 h-3.5", filter === key ? "" : color)} />
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className={cn("rounded-xl h-16 animate-pulse", isDark_ ? "bg-white/5" : "bg-gray-100")} />)}
        </div>
      ) : receivables.length === 0 ? (
        <div className={cn("rounded-2xl py-14 text-center", isDark_ ? "glass-card" : "bg-white border border-gray-100 shadow-sm")}>
          <TrendingUp className={cn("w-10 h-10 mx-auto mb-3", isDark_ ? "text-white/10" : "text-gray-300")} />
          <p className={txtMuted}>Nenhuma cobrança encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receivables.map((r) => {
            const cfg = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
            return (
              <div key={r.id} className={cardBase}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate", txt)}>{r.description}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.patient_name && <span className={cn("text-xs", txtMuted)}>{r.patient_name}</span>}
                      <span className={cn("text-xs", txtMuted)}>
                        Venc. {format(parseISO(r.due_date + "T00:00:00"), "dd/MM/yyyy")}
                      </span>
                      {r.payment_method && <span className={cn("text-xs", txtMuted)}>{METHOD_LABELS[r.payment_method]}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn("font-bold text-lg", isDark_ ? "text-white" : "text-gray-900")}>{fmt(r.amount)}</p>
                      {r.amount_paid > 0 && r.amount_paid < r.amount && (
                        <p className={cn("text-xs", isDark_ ? "text-emerald-400/60" : "text-emerald-600")}>
                          {fmt(r.amount_paid)} recebido
                        </p>
                      )}
                    </div>
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", isDark_ ? cfg.dark : cfg.light)}>
                      {cfg.label}
                    </span>
                    {/* Actions */}
                    <div className="flex gap-1">
                      {(r.status === "pending" || r.status === "overdue" || r.status === "partial") && (
                        <button onClick={() => { setShowReceiveModal(r); setReceiveAmount(String(r.amount)); }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                            isDark_ ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}>
                          Receber
                        </button>
                      )}
                      <button onClick={() => openEdit(r)}
                        className={cn("p-1.5 rounded-lg transition-all", isDark_ ? "text-white/20 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-gray-300 hover:text-cyan-600 hover:bg-cyan-50")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Remover esta cobrança?")) deleteMutation.mutate(r.id); }}
                        className={cn("p-1.5 rounded-lg transition-all", isDark_ ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50")}>
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

      {/* Create/Edit Modal */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className={cn("max-w-lg rounded-2xl", isDark_ ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
          <DialogHeader><DialogTitle>{editingId ? "Editar cobrança" : "Nova cobrança"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className={labelCls}>Descrição *</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex: Extração dente 28" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className={labelCls}>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className={labelCls}>Parcelas</Label>
                <Input type="number" min={1} value={form.installments} onChange={(e) => set("installments", e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Forma de pagamento</Label>
                <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={isDark_ ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                  <option value="">— Não definido —</option>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k} className={isDark_ ? "bg-[#1a1e2e]" : ""}>{v}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5"><Label className={labelCls}>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={cn(inputCls, "resize-none")} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm} className={cn("rounded-xl", isDark_ ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")}>Cancelar</Button>
              <Button disabled={saveMutation.isPending || !form.description || !form.amount || !form.due_date}
                onClick={() => saveMutation.mutate()}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white">
                {saveMutation.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar cobrança"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive payment modal */}
      {showReceiveModal && (
        <Dialog open onOpenChange={() => setShowReceiveModal(null)}>
          <DialogContent className={cn("max-w-sm rounded-2xl", isDark_ ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
            <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className={cn("text-sm", isDark_ ? "text-white/50" : "text-gray-500")}>{showReceiveModal.description}</p>
              <div className="space-y-1.5"><Label className={labelCls}>Valor recebido (R$)</Label>
                <Input type="number" step="0.01" value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Forma de pagamento</Label>
                <select value={receiveMethod} onChange={(e) => setReceiveMethod(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={isDark_ ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k} className={isDark_ ? "bg-[#1a1e2e]" : ""}>{v}</option>)}
                </select></div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowReceiveModal(null)}>Cancelar</Button>
                <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-0 text-white"
                  disabled={receiveMutation.isPending || !receiveAmount}
                  onClick={() => receiveMutation.mutate()}>
                  {receiveMutation.isPending ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
