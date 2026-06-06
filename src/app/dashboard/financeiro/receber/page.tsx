"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn, apiErrorMessage } from "@/lib/utils";
import { format, parseISO, isPast, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, TrendingUp, Edit2, Trash2, Search, X, User,
  Calendar, AlertTriangle, Package, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { PatientListItem, PaginatedPatients } from "@/types";

// ── Constantes ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; dark: string; light: string }> = {
  pending:   { label: "Pendente",     dark: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",         light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  paid:      { label: "Recebido",     dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "⚠ Em atraso", dark: "bg-red-500/15 text-red-300 border-red-500/20",             light: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelado",   dark: "bg-white/5 text-white/30 border-white/10",                 light: "bg-gray-50 text-gray-400 border-gray-200" },
  partial:   { label: "Parcial",     dark: "bg-amber-500/15 text-amber-300 border-amber-500/20",       light: "bg-amber-50 text-amber-700 border-amber-200" },
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito", bank_transfer: "Transferência",
  insurance: "Convênio", check: "Cheque",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function isOverdue(rec: any): boolean {
  if (rec.status === "paid" || rec.status === "cancelled") return false;
  return isPast(startOfDay(parseISO(rec.due_date + "T00:00:00")));
}

// ── Tipos ────────────────────────────────────────────────────

interface ProcedureItem {
  id: string;          // uuid local
  name: string;
  price: string;       // string para input controlado
}

type Filter = "all" | "pending" | "overdue" | "paid";

const EMPTY_META = {
  due_date: "", installments: "1",
  payment_method: "", notes: "", already_paid: "false",
};

function newItem(name = "", price = ""): ProcedureItem {
  return { id: Math.random().toString(36).slice(2), name, price };
}

// ── Componente principal ─────────────────────────────────────

export default function ContasReceberPage() {
  const qc = useQueryClient();
  const isDark = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ ...EMPTY_META });

  // Paciente
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  // Atendimento
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Itens de procedimento (multi)
  const [items, setItems] = useState<ProcedureItem[]>([newItem()]);

  // Modal de recebimento
  const [showReceiveModal, setShowReceiveModal] = useState<any>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveMethod, setReceiveMethod] = useState("pix");

  // Total calculado
  const total = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0), 0);
  const descriptionAuto = items.filter(i => i.name.trim()).map(i => i.name.trim()).join(" + ");

  // ── Queries ──────────────────────────────────────────────────

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

  const { data: appointmentResults = [] } = useQuery<any[]>({
    queryKey: ["appointments-patient", selectedPatient?.id],
    queryFn: () => api.get("/appointments", {
      params: { patient_id: selectedPatient!.id, page_size: 50 }
    }).then((r) => Array.isArray(r.data) ? r.data : r.data?.items ?? []),
    enabled: !!selectedPatient && showForm,
  });

  // Busca todos os procedimentos cadastrados (para o seletor de procedimentos extras)
  const { data: allProcedures = [] } = useQuery<any[]>({
    queryKey: ["procedures"],
    queryFn: () => api.get("/appointments/procedures").then((r) =>
      Array.isArray(r.data) ? r.data : r.data?.items ?? []
    ),
    enabled: showForm,
  });

  // ── Mutations ────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient) throw new Error("Selecione um paciente");
      if (!meta.due_date) throw new Error("Informe a data de vencimento");
      if (items.every(i => !i.name.trim())) throw new Error("Adicione ao menos um procedimento");
      if (total <= 0) throw new Error("O valor total deve ser maior que zero");

      const alreadyPaid = meta.already_paid === "true";
      const payload: any = {
        patient_id: selectedPatient.id,
        appointment_id: selectedAppointment?.id ?? undefined,
        description: descriptionAuto || "Procedimento odontológico",
        amount: total,
        due_date: meta.due_date,
        installments: parseInt(meta.installments),
        payment_method: meta.payment_method || undefined,
        notes: meta.notes || undefined,
        ...(alreadyPaid && { status: "paid", amount_paid: total }),
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
    onError: (e: any) => toast.error(apiErrorMessage(e, "Erro ao salvar cobrança")),
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

  // ── Helpers ──────────────────────────────────────────────────

  function onSelectAppointment(appt: any) {
    setSelectedAppointment(appt);
    // Auto-fill: adiciona o procedimento do atendimento como primeiro item
    if (appt?.procedure_name) {
      setItems([
        newItem(appt.procedure_name, appt.procedure_price ? String(appt.procedure_price) : ""),
      ]);
    }
    // Auto-fill data de vencimento com a data do atendimento
    if (appt?.start_time) {
      const d = parseISO(appt.start_time);
      setMeta(m => ({ ...m, due_date: format(d, "yyyy-MM-dd") }));
    }
  }

  function addItem() { setItems(prev => [...prev, newItem()]); }

  function removeItem(id: string) {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  }

  function updateItem(id: string, field: "name" | "price", value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  function addFromProcedure(proc: any) {
    setItems(prev => [...prev, newItem(proc.name, proc.price ? String(proc.price) : "")]);
  }

  function openEdit(r: any) {
    setEditingId(r.id);
    setSelectedPatient({ id: r.patient_id, name: r.patient_name ?? "", cpf: null, phone_primary: null, email: null, status: "active", is_active: true });
    setSelectedAppointment(r.appointment_id ? { id: r.appointment_id } : null);
    setItems([newItem(r.description, String(r.amount))]);
    setMeta({
      due_date: r.due_date,
      installments: String(r.installments),
      payment_method: r.payment_method ?? "",
      notes: r.notes ?? "",
      already_paid: "false",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditingId(null);
    setMeta({ ...EMPTY_META });
    setItems([newItem()]);
    setSelectedPatient(null); setPatientSearch("");
    setSelectedAppointment(null);
  }

  function setM(k: string, v: string) { setMeta(m => ({ ...m, [k]: v })); }

  // ── Styles ───────────────────────────────────────────────────

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const cardBase = cn("rounded-xl border p-4 transition-all", isDark ? "glass-card border-white/5" : "bg-white border-gray-100 shadow-sm");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");
  const labelCls = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");
  const selectStyle = isDark
    ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" }
    : {};

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" }, { key: "pending", label: "Pendentes" },
    { key: "overdue", label: "Em atraso" }, { key: "paid", label: "Recebidas" },
  ];

  const enrichedReceivables = receivables.map((r) => ({
    ...r,
    _overdue: isOverdue(r),
    _displayStatus: isOverdue(r) && r.status !== "paid" ? "overdue" : r.status,
  }));

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
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
        <Button
          onClick={() => { closeForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nova cobrança
        </Button>
      </div>

      {/* Filter tabs */}
      <div className={cn("flex rounded-xl overflow-hidden border text-sm w-fit", isDark ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("px-4 py-2 font-medium transition-all",
              filter === key
                ? isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-500 text-white"
                : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className={cn("rounded-xl h-16 animate-pulse", isDark ? "bg-white/5" : "bg-gray-100")} />)}</div>
      ) : enrichedReceivables.length === 0 ? (
        <div className={cn("rounded-2xl py-14 text-center", isDark ? "glass-card" : "bg-white border border-gray-100 shadow-sm")}>
          <TrendingUp className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-white/10" : "text-gray-300")} />
          <p className={txtMuted}>Nenhuma cobrança encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {enrichedReceivables.map((r) => {
            const cfg = STATUS_LABELS[r._displayStatus] ?? STATUS_LABELS.pending;
            return (
              <div key={r.id} className={cn(cardBase, r._overdue && r.status !== "paid" && (isDark ? "border-red-500/20" : "border-red-200"))}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0",
                    r._overdue && r.status !== "paid"
                      ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20"
                      : "bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/20"
                  )}>
                    {r._overdue && r.status !== "paid"
                      ? <AlertTriangle className="w-4 h-4" />
                      : (r.patient_name?.slice(0, 2).toUpperCase() ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate", txt)}>{r.description}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.patient_name && (
                        <span className={cn("text-xs flex items-center gap-1", isDark ? "text-cyan-400/60" : "text-cyan-600")}>
                          <User className="w-3 h-3" />{r.patient_name}
                        </span>
                      )}
                      <span className={cn("text-xs flex items-center gap-1", r._overdue && r.status !== "paid" ? "text-red-400 font-medium" : txtMuted)}>
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(r.due_date + "T00:00:00"), "dd/MM/yyyy")}
                        {r._overdue && r.status !== "paid" && " — VENCIDA"}
                      </span>
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
                      {(r._displayStatus === "pending" || r._displayStatus === "overdue" || r._displayStatus === "partial") && (
                        <button onClick={() => { setShowReceiveModal(r); setReceiveAmount(String(r.amount)); }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                            isDark ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}>
                          Receber
                        </button>
                      )}
                      <button onClick={() => openEdit(r)} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-gray-300 hover:text-cyan-600 hover:bg-cyan-50")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Remover esta cobrança?")) deleteMutation.mutate(r.id); }} className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50")}>
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

      {/* ── Modal de criação/edição ── */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className={cn("max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              {editingId ? "Editar cobrança" : "Nova cobrança de paciente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pb-2">

            {/* ── Paciente ── */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Paciente *</Label>
              {selectedPatient ? (
                <div className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <div>
                    <p className={cn("font-medium text-sm", isDark ? "text-cyan-300" : "text-cyan-700")}>{selectedPatient.name}</p>
                    {selectedPatient.cpf && <p className={cn("text-xs", isDark ? "text-cyan-400/50" : "text-cyan-500")}>{selectedPatient.cpf}</p>}
                  </div>
                  {!editingId && (
                    <button onClick={() => { setSelectedPatient(null); setSelectedAppointment(null); setItems([newItem()]); }}>
                      <X className={cn("w-4 h-4", isDark ? "text-cyan-400/40" : "text-cyan-400")} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <Input className={cn("pl-9", inputCls)} placeholder="Buscar pelo nome ou CPF..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} autoFocus />
                  </div>
                  {patientResults?.items?.length ? (
                    <div className={cn("border rounded-xl overflow-hidden divide-y max-h-36 overflow-y-auto", isDark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100")}>
                      {patientResults.items.map((p: any) => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                          className={cn("w-full text-left px-3 py-2 text-sm transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                          <p className={cn("font-medium", isDark ? "text-white/80" : "text-gray-700")}>{p.name}</p>
                          <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>{p.cpf ?? p.phone_primary ?? ""}</p>
                        </button>
                      ))}
                    </div>
                  ) : patientSearch.length >= 2 && (
                    <p className={cn("text-xs text-center py-2", txtMuted)}>Nenhum paciente encontrado.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Vincular atendimento ── */}
            {selectedPatient && (
              <div className="space-y-1.5">
                <Label className={labelCls}>
                  Atendimento vinculado <span className={cn("text-xs", txtMuted)}>(opcional — preenche valores automaticamente)</span>
                </Label>
                {selectedAppointment ? (
                  <div className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 border text-sm", isDark ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-200")}>
                    <div className="flex items-center gap-2">
                      <Calendar className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-violet-400" : "text-violet-600")} />
                      <span className={cn("text-sm", isDark ? "text-violet-300" : "text-violet-700")}>
                        {selectedAppointment.start_time
                          ? format(parseISO(selectedAppointment.start_time), "dd/MM/yyyy 'às' HH:mm")
                          : "Atendimento"}
                        {selectedAppointment.procedure_name && ` — ${selectedAppointment.procedure_name}`}
                        {selectedAppointment.procedure_price && ` (${fmt(selectedAppointment.procedure_price)})`}
                      </span>
                    </div>
                    <button onClick={() => setSelectedAppointment(null)}>
                      <X className={cn("w-4 h-4", isDark ? "text-violet-400/40" : "text-violet-400")} />
                    </button>
                  </div>
                ) : (
                  <select
                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={selectStyle}
                    onChange={(e) => {
                      const appt = appointmentResults.find((a: any) => a.id === e.target.value);
                      if (appt) onSelectAppointment(appt);
                    }}
                    defaultValue=""
                  >
                    <option value="">— Selecionar atendimento —</option>
                    {appointmentResults.map((a: any) => (
                      <option key={a.id} value={a.id} className={isDark ? "bg-[#1a1e2e]" : ""}>
                        {a.start_time ? format(parseISO(a.start_time), "dd/MM/yyyy HH:mm") : a.id}
                        {a.procedure_name ? ` — ${a.procedure_name}` : ""}
                        {a.procedure_price ? ` (${fmt(a.procedure_price)})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* ── Procedimentos / Itens ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={labelCls}>Procedimentos *</Label>
                {allProcedures.length > 0 && (
                  <div className="relative group">
                    <button className={cn("text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-all",
                      isDark ? "text-cyan-400/70 hover:bg-cyan-500/10 hover:text-cyan-300" : "text-cyan-600 hover:bg-cyan-50")}>
                      <Package className="w-3 h-3" /> Adicionar do catálogo <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className={cn(
                      "absolute right-0 top-full mt-1 z-50 rounded-xl border shadow-xl min-w-[220px] max-h-48 overflow-y-auto hidden group-hover:block",
                      isDark ? "glass-strong border-white/10" : "bg-white border-gray-200"
                    )}>
                      {allProcedures.filter((p: any) => p.is_active !== false).map((p: any) => (
                        <button key={p.id} onClick={() => addFromProcedure(p)}
                          className={cn("w-full text-left px-3 py-2 text-sm flex justify-between items-center transition-colors",
                            isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                          <span className={cn(isDark ? "text-white/70" : "text-gray-700")}>{p.name}</span>
                          {p.price && <span className={cn("text-xs font-medium", isDark ? "text-cyan-400/60" : "text-cyan-600")}>{fmt(p.price)}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0",
                      isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-400")}>
                      {idx + 1}
                    </div>
                    <Input
                      className={cn("flex-1", inputCls)}
                      placeholder="Ex: Limpeza, Canal, Faceta..."
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className={cn("w-28 shrink-0", inputCls)}
                      placeholder="R$ 0,00"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, "price", e.target.value)}
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className={cn("p-1.5 rounded-lg transition-all shrink-0",
                        items.length === 1 ? "opacity-20 cursor-not-allowed" : "",
                        isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                      )}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={addItem}
                className={cn("w-full rounded-xl border py-2 text-sm font-medium transition-all flex items-center justify-center gap-2",
                  isDark ? "border-dashed border-white/10 text-white/30 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5"
                    : "border-dashed border-gray-200 text-gray-400 hover:border-cyan-300 hover:text-cyan-600 hover:bg-cyan-50/50")}>
                <Plus className="w-3.5 h-3.5" /> Adicionar procedimento
              </button>

              {/* Total */}
              {items.length > 1 && (
                <div className={cn("flex items-center justify-between rounded-xl px-4 py-2.5 border",
                  isDark ? "bg-white/3 border-white/5" : "bg-gray-50 border-gray-200")}>
                  <span className={cn("text-sm font-medium", isDark ? "text-white/50" : "text-gray-500")}>Total</span>
                  <span className={cn("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>{fmt(total)}</span>
                </div>
              )}
            </div>

            {/* ── Vencimento + Parcelas ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Vencimento *</Label>
                <Input type="date" value={meta.due_date} onChange={(e) => setM("due_date", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Parcelas</Label>
                <Input type="number" min={1} value={meta.installments} onChange={(e) => setM("installments", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* ── Forma de pagamento ── */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Forma de pagamento</Label>
              <select value={meta.payment_method} onChange={(e) => setM("payment_method", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={selectStyle}>
                <option value="">— Não definido —</option>
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v}</option>
                ))}
              </select>
            </div>

            {/* ── Já pago ── */}
            {!editingId && (
              <div className={cn("flex items-center gap-3 rounded-xl p-3 border cursor-pointer select-none",
                isDark ? "bg-emerald-500/5 border-emerald-500/15" : "bg-emerald-50 border-emerald-200")}
                onClick={() => setM("already_paid", meta.already_paid === "true" ? "false" : "true")}>
                <input type="checkbox" readOnly checked={meta.already_paid === "true"}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                <span className={cn("text-sm font-medium", isDark ? "text-emerald-300" : "text-emerald-700")}>
                  Já foi pago no momento do atendimento
                </span>
              </div>
            )}

            {/* ── Observações ── */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Observações</Label>
              <Textarea rows={2} value={meta.notes} onChange={(e) => setM("notes", e.target.value)} className={cn(inputCls, "resize-none")} />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeForm} className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")}>
                Cancelar
              </Button>
              <Button
                disabled={saveMutation.isPending || !selectedPatient || !meta.due_date || total <= 0}
                onClick={() => saveMutation.mutate()}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white"
              >
                {saveMutation.isPending ? "Salvando..." : editingId ? "Salvar" : `Criar cobrança · ${fmt(total)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de recebimento ── */}
      {showReceiveModal && (
        <Dialog open onOpenChange={() => setShowReceiveModal(null)}>
          <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
            <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className={cn("rounded-xl p-3 text-sm", isDark ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-50 border border-cyan-200")}>
                <p className={cn("font-medium", isDark ? "text-cyan-300" : "text-cyan-700")}>{showReceiveModal.patient_name}</p>
                <p className={cn("text-xs mt-0.5", isDark ? "text-cyan-400/60" : "text-cyan-600")}>
                  {showReceiveModal.description} — {fmt(showReceiveModal.amount)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Valor recebido (R$)</Label>
                <Input type="number" step="0.01" value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Forma de pagamento</Label>
                <select value={receiveMethod} onChange={(e) => setReceiveMethod(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={selectStyle}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v}</option>
                  ))}
                </select>
              </div>
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
