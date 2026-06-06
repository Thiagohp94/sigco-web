"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, TrendingUp, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Search, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { PatientListItem, PaginatedPatients } from "@/types";

const STATUS_LABELS: Record<string, { label: string; dark: string; light: string }> = {
  pending:   { label: "Pendente",   dark: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",       light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  paid:      { label: "Recebido",   dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "Em atraso",  dark: "bg-red-500/15 text-red-300 border-red-500/20",           light: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelado",  dark: "bg-white/5 text-white/30 border-white/10",               light: "bg-gray-50 text-gray-400 border-gray-200" },
  partial:   { label: "Parcial",    dark: "bg-amber-500/15 text-amber-300 border-amber-500/20",     light: "bg-amber-50 text-amber-700 border-amber-200" },
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito", bank_transfer: "Transferência",
  insurance: "Convênio", check: "Cheque",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const EMPTY_FORM = { description: "", amount: "", due_date: "", installments: "1", payment_method: "", notes: "" };
type Filter = "all" | "pending" | "overdue" | "paid";

export default function ContasReceberPage() {
  const qc = useQueryClient();
  const isDark = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  // Patient search state
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  // Receive payment
  const [showReceiveModal, setShowReceiveModal] = useState<any>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveMethod, setReceiveMethod] = useState("pix");

  const { data: receivables = [], isLoading } = useQuery<any[]>({
    queryKey: ["receivables", filter],
    queryFn: () => api.get("/financial/receivables", {
      params: filter !== "all" ? { status: filter } : {}
    }).then((r) => r.data),
  });

  const { data: patientResults } = useQuery<PaginatedPatients>({
    queryKey: ["patients-search", patientSearch],
    queryFn: () => api.get("/patients", { params: { search: patientSearch, page_size: 8 } }).then((r) => r.data),
    enabled: patientSearch.length >= 2 && !selectedPatient,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient) throw new Error("Selecione um paciente");
      const payload = {
        ...form,
        patient_id: selectedPatient.id,
        amount: parseFloat(form.amount),
        installments: parseInt(form.installments),
        payment_method: form.payment_method || undefined,
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
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? e?.message ?? "Erro ao salvar"),
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.post(
      `/financial/receivables/${showReceiveModal?.id}/receive`, null,
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
    setSelectedPatient({ id: r.patient_id, name: r.patient_name ?? "", cpf: null, phone_primary: null, email: null, status: "active", is_active: true });
    setForm({ description: r.description, amount: String(r.amount), due_date: r.due_date, installments: String(r.installments), payment_method: r.payment_method ?? "", notes: r.notes ?? "" });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSelectedPatient(null); setPatientSearch("");
  }
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const cardBase = cn("rounded-xl border p-4 transition-all", isDark ? "glass-card border-white/5" : "bg-white border-gray-100 shadow-sm");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");
  const labelCls = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" }, { key: "pending", label: "Pendentes" },
    { key: "overdue", label: "Em atraso" }, { key: "paid", label: "Recebidas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={cn("text-2xl font-bold flex items-center gap-3", txt)}>
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            Cobranças de Pacientes
          </h1>
          <p className={cn("text-sm mt-0.5 ml-12", txtMuted)}>Valores a receber por procedimentos realizados</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setSelectedPatient(null); setShowForm(true); }}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white shadow-lg shadow-cyan-500/20">
          <Plus className="w-4 h-4 mr-1.5" /> Nova cobrança
        </Button>
      </div>

      {/* Filter tabs */}
      <div className={cn("flex rounded-xl overflow-hidden border text-sm w-fit", isDark ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("px-4 py-2 font-medium transition-all",
              filter === key ? isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-500 text-white"
                : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
            )}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className={cn("rounded-xl h-16 animate-pulse", isDark ? "bg-white/5" : "bg-gray-100")} />)}</div>
      ) : receivables.length === 0 ? (
        <div className={cn("rounded-2xl py-14 text-center", isDark ? "glass-card" : "bg-white border border-gray-100 shadow-sm")}>
          <TrendingUp className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-white/10" : "text-gray-300")} />
          <p className={txtMuted}>Nenhuma cobrança encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receivables.map((r) => {
            const cfg = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
            return (
              <div key={r.id} className={cardBase}>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Patient avatar */}
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0",
                    "bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/20")}>
                    {r.patient_name ? r.patient_name.slice(0, 2).toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate", txt)}>{r.description}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.patient_name && (
                        <span className={cn("text-xs flex items-center gap-1", isDark ? "text-cyan-400/60" : "text-cyan-600")}>
                          <User className="w-3 h-3" />{r.patient_name}
                        </span>
                      )}
                      <span className={cn("text-xs", txtMuted)}>Venc. {format(parseISO(r.due_date + "T00:00:00"), "dd/MM/yyyy")}</span>
                      {r.installments > 1 && <span className={cn("text-xs", txtMuted)}>{r.installments}x</span>}
                      {r.payment_method && <span className={cn("text-xs", txtMuted)}>{METHOD_LABELS[r.payment_method]}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn("font-bold text-lg", txt)}>{fmt(r.amount)}</p>
                      {r.amount_paid > 0 && r.amount_paid < r.amount && (
                        <p className={cn("text-xs", isDark ? "text-emerald-400/60" : "text-emerald-600")}>{fmt(r.amount_paid)} recebido</p>
                      )}
                    </div>
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border hidden sm:block", isDark ? cfg.dark : cfg.light)}>
                      {cfg.label}
                    </span>
                    <div className="flex gap-1">
                      {(r.status === "pending" || r.status === "overdue" || r.status === "partial") && (
                        <button onClick={() => { setShowReceiveModal(r); setReceiveAmount(String(r.amount)); }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                            isDark ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}>
                          Receber
                        </button>
                      )}
                      <button onClick={() => openEdit(r)} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-gray-300 hover:text-cyan-600 hover:bg-cyan-50")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Remover?")) deleteMutation.mutate(r.id); }} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50")}>
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
        <DialogContent className={cn("max-w-lg rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="w-4 h-4 text-cyan-400" />{editingId ? "Editar cobrança" : "Nova cobrança de paciente"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Patient selector */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Paciente *</Label>
              {selectedPatient ? (
                <div className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <div>
                    <p className={cn("font-medium text-sm", isDark ? "text-cyan-300" : "text-cyan-700")}>{selectedPatient.name}</p>
                    {selectedPatient.cpf && <p className={cn("text-xs", isDark ? "text-cyan-400/50" : "text-cyan-500")}>{selectedPatient.cpf}</p>}
                  </div>
                  {!editingId && <button onClick={() => setSelectedPatient(null)}><X className={cn("w-4 h-4", isDark ? "text-cyan-400/40" : "text-cyan-400")} /></button>}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <Input className={cn("pl-9", inputCls)} placeholder="Buscar paciente..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} autoFocus />
                  </div>
                  {patientResults?.items?.length ? (
                    <div className={cn("border rounded-xl overflow-hidden divide-y max-h-40 overflow-y-auto", isDark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100")}>
                      {patientResults.items.map((p: any) => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                          className={cn("w-full text-left px-3 py-2 text-sm transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                          <p className={cn("font-medium", isDark ? "text-white/80" : "text-gray-700")}>{p.name}</p>
                          <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>{p.cpf ?? p.phone_primary ?? ""}</p>
                        </button>
                      ))}
                    </div>
                  ) : patientSearch.length >= 2 && <p className={cn("text-xs text-center py-2", txtMuted)}>Nenhum paciente encontrado.</p>}
                </div>
              )}
            </div>
            <div className="space-y-1.5"><Label className={labelCls}>Descrição / Procedimento *</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex: Extração, Canal, Limpeza..." className={inputCls} /></div>
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
                  style={isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                  <option value="">— Não definido —</option>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5"><Label className={labelCls}>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={cn(inputCls, "resize-none")} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm} className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")}>Cancelar</Button>
              <Button disabled={saveMutation.isPending || !selectedPatient || !form.description || !form.amount || !form.due_date}
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
          <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
            <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className={cn("rounded-xl p-3 text-sm", isDark ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-50 border border-cyan-200")}>
                <p className={cn("font-medium", isDark ? "text-cyan-300" : "text-cyan-700")}>{showReceiveModal.patient_name}</p>
                <p className={cn("text-xs mt-0.5", isDark ? "text-cyan-400/60" : "text-cyan-600")}>{showReceiveModal.description} — {fmt(showReceiveModal.amount)}</p>
              </div>
              <div className="space-y-1.5"><Label className={labelCls}>Valor recebido (R$)</Label>
                <Input type="number" step="0.01" value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Forma de pagamento</Label>
                <select value={receiveMethod} onChange={(e) => setReceiveMethod(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v}</option>)}
                </select></div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowReceiveModal(null)}>Cancelar</Button>
                <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-0 text-white"
                  disabled={receiveMutation.isPending || !receiveAmount} onClick={() => receiveMutation.mutate()}>
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
