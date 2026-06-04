"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ContactLog, ContactType, PatientListItem, PaginatedPatients } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Phone, Search, CheckCircle2, XCircle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONTACT_TYPES: Record<ContactType, string> = {
  charge: "Cobrança",
  schedule: "Marcar consulta",
  confirm: "Confirmar consulta",
  reminder: "Lembrete",
  follow_up: "Pós-atendimento",
  other: "Outro",
};

const CHANNELS = ["Telefone", "WhatsApp", "E-mail", "SMS", "Pessoalmente"];

export default function ContatosPage() {
  const qc = useQueryClient();
  const [isDark, setIsDark] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null);
  const [form, setForm] = useState<{ contact_type: ContactType; was_successful: boolean; channel: string; notes: string }>({
    contact_type: "confirm", was_successful: false, channel: "WhatsApp", notes: "",
  });

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data: contacts = [] } = useQuery<ContactLog[]>({
    queryKey: ["contacts", filterPatientId],
    queryFn: () => api.get("/logs/contact", { params: filterPatientId ? { patient_id: filterPatientId } : {} }).then((r) => r.data),
  });

  const { data: searchResult } = useQuery<PaginatedPatients>({
    queryKey: ["patients-search", patientSearch],
    queryFn: () => api.get("/patients", { params: { search: patientSearch, page_size: 8 } }).then((r) => r.data),
    enabled: patientSearch.length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post("/logs/contact", {
      patient_id: selectedPatient!.id,
      contact_type: form.contact_type,
      was_successful: form.was_successful,
      channel: form.channel,
      notes: form.notes || undefined,
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setForm({ contact_type: "confirm", was_successful: false, channel: "WhatsApp", notes: "" });
      toast.success("Contato registrado!");
    },
    onError: () => toast.error("Erro ao registrar contato"),
  });

  const labelCls = cn("text-sm font-medium", isDark ? "text-white/60" : "text-gray-600");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");

  const successCount = contacts.filter((c) => c.was_successful).length;
  const failCount = contacts.filter((c) => !c.was_successful).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
          <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Phone className="w-4 h-4 text-white" />
          </div>
          Controle de Contatos
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-pink-500 to-pink-600 border-0 rounded-xl text-white shadow-lg shadow-pink-500/20">
          <Plus className="w-4 h-4 mr-1.5" />Registrar contato
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: contacts.length, color: isDark ? "text-white/80" : "text-gray-800" },
          { label: "Com sucesso", value: successCount, color: isDark ? "text-emerald-400" : "text-emerald-600" },
          { label: "Sem sucesso", value: failCount, color: isDark ? "text-red-400" : "text-red-600" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-4 text-center", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className={cn("text-xs mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter by patient */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
          <Input className={cn("pl-9", inputCls)} placeholder="Filtrar por paciente…"
            value={filterPatientId ? "" : patientSearch}
            onChange={(e) => { setPatientSearch(e.target.value); setFilterPatientId(null); }} />
        </div>
        {filterPatientId && (
          <button onClick={() => { setFilterPatientId(null); setPatientSearch(""); }}
            className={cn("flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border", isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
            <X className="w-3.5 h-3.5" />Limpar filtro
          </button>
        )}
      </div>
      {!filterPatientId && patientSearch.length >= 2 && searchResult?.items?.length ? (
        <div className={cn("border rounded-xl overflow-hidden divide-y max-h-40 overflow-y-auto", isDark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100")}>
          {searchResult.items.map((p) => (
            <button key={p.id} onClick={() => { setFilterPatientId(p.id); setPatientSearch(p.name); }}
              className={cn("w-full text-left px-3 py-2.5 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
              <p className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{p.name}</p>
              <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>{p.cpf ?? p.phone_primary ?? ""}</p>
            </button>
          ))}
        </div>
      ) : null}

      {/* Contact list */}
      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className={cn("rounded-2xl border p-4 flex items-start gap-4", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              c.was_successful ? isDark ? "bg-emerald-500/10" : "bg-emerald-50" : isDark ? "bg-red-500/10" : "bg-red-50"
            )}>
              {c.was_successful
                ? <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-600")} />
                : <XCircle className={cn("w-4 h-4", isDark ? "text-red-400" : "text-red-600")} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{c.patient_name}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500")}>{CONTACT_TYPES[c.contact_type]}</span>
                  {c.channel && <span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-400")}>{c.channel}</span>}
                </div>
                <span className={cn("text-xs shrink-0", isDark ? "text-white/20" : "text-gray-400")}>
                  {format(parseISO(c.contacted_at), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
              {c.notes && <p className={cn("text-sm mt-1", isDark ? "text-white/40" : "text-gray-500")}>{c.notes}</p>}
              {c.contacted_by_name && <p className={cn("text-xs mt-0.5", isDark ? "text-white/20" : "text-gray-400")}>por {c.contacted_by_name}</p>}
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <p className={cn("text-center py-16", isDark ? "text-white/20" : "text-gray-400")}>Nenhum contato registrado.</p>
        )}
      </div>

      {/* New contact dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader><DialogTitle>Registrar contato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Patient search */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Paciente <span className="text-red-400">*</span></Label>
              {selectedPatient ? (
                <div className={cn("flex items-center justify-between rounded-xl px-3 py-2 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <p className={cn("font-medium text-sm", isDark ? "text-cyan-300" : "text-cyan-700")}>{selectedPatient.name}</p>
                  <button onClick={() => setSelectedPatient(null)}><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <Input className={cn("pl-9", inputCls)} placeholder="Buscar…" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                  </div>
                  {searchResult?.items?.length ? (
                    <div className={cn("border rounded-xl overflow-hidden divide-y max-h-40 overflow-y-auto", isDark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100")}>
                      {searchResult.items.map((p) => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                          className={cn("w-full text-left px-3 py-2.5 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                          <p className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{p.name}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Tipo de contato</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CONTACT_TYPES) as [ContactType, string][]).map(([type, label]) => (
                  <button key={type} onClick={() => setForm((f) => ({ ...f, contact_type: type }))}
                    className={cn("p-2.5 rounded-xl border text-sm transition-all text-left",
                      form.contact_type === type
                        ? isDark ? "border-pink-500/30 bg-pink-500/10 text-pink-300" : "border-pink-300 bg-pink-50 text-pink-700"
                        : isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Canal</Label>
                <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {}}>
                  {CHANNELS.map((c) => <option key={c} value={c} className={isDark ? "bg-[#1a1e2e]" : "bg-white"}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Com sucesso?</Label>
                <div className="flex gap-2 h-[42px] items-center">
                  {[true, false].map((v) => (
                    <button key={String(v)} onClick={() => setForm((f) => ({ ...f, was_successful: v }))}
                      className={cn("flex-1 py-2 rounded-xl text-sm border transition-all",
                        form.was_successful === v
                          ? v ? isDark ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700" : isDark ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-red-50 border-red-300 text-red-700"
                          : isDark ? "border-white/10 text-white/30 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50"
                      )}>
                      {v ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observações…"
                className={cn("resize-none rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200")} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 border-0 text-white" disabled={saveMutation.isPending || !selectedPatient} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Registrando…" : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
