"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import type { Appointment, AppointmentLog, ContactLog, PatientListItem, PaginatedPatients } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, Activity, Calendar, Phone, CheckCircle2, XCircle, AlertTriangle, Clock, X } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  charge: "Cobrança", schedule: "Marcar consulta", confirm: "Confirmar",
  reminder: "Lembrete", follow_up: "Pós-atendimento", other: "Outro",
};

type TimelineEvent =
  | { type: "appointment"; date: string; data: Appointment }
  | { type: "log"; date: string; data: AppointmentLog }
  | { type: "contact"; date: string; data: ContactLog };

export default function TimelinePage() {
  const searchParams = useSearchParams();
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(() => {
    // Pre-select patient from URL query params (deep-link from patient page)
    const pid = searchParams?.get("patientId");
    const pname = searchParams?.get("patientName");
    if (pid && pname) return { id: pid, name: pname, cpf: null, phone_primary: null, email: null, status: "active", is_active: true };
    return null;
  });

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data: searchResult } = useQuery<PaginatedPatients>({
    queryKey: ["patients-search", search],
    queryFn: () => api.get("/patients", { params: { search, page_size: 10 } }).then((r) => r.data),
    enabled: search.length >= 2 && !selectedPatient,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["patient-appointments", selectedPatient?.id],
    queryFn: () => api.get("/appointments", { params: { patient_id: selectedPatient!.id } }).then((r) => r.data),
    enabled: !!selectedPatient,
  });

  const { data: apptLogs = [] } = useQuery<AppointmentLog[]>({
    queryKey: ["patient-logs", selectedPatient?.id],
    queryFn: () => api.get("/logs/appointment", { params: { patient_id: selectedPatient!.id } }).then((r) => r.data),
    enabled: !!selectedPatient,
  });

  const { data: contacts = [] } = useQuery<ContactLog[]>({
    queryKey: ["patient-contacts", selectedPatient?.id],
    queryFn: () => api.get("/logs/contact", { params: { patient_id: selectedPatient!.id } }).then((r) => r.data),
    enabled: !!selectedPatient,
  });

  // Merge all events into a timeline
  const events: TimelineEvent[] = [
    ...appointments.map((a): TimelineEvent => ({ type: "appointment", date: a.start_time, data: a })),
    ...apptLogs.map((l): TimelineEvent => ({ type: "log", date: l.created_at, data: l })),
    ...contacts.map((c): TimelineEvent => ({ type: "contact", date: c.contacted_at, data: c })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");

  return (
    <div className="space-y-6">
      <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
        <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Activity className="w-4 h-4 text-white" />
        </div>
        Timeline de Pacientes
      </h1>

      {/* Patient search */}
      <div className="space-y-2 max-w-md">
        {selectedPatient ? (
          <div className={cn("flex items-center justify-between rounded-xl px-4 py-3 border", isDark ? "bg-teal-500/10 border-teal-500/20" : "bg-teal-50 border-teal-200")}>
            <div>
              <p className={cn("font-semibold", isDark ? "text-teal-300" : "text-teal-700")}>{selectedPatient.name}</p>
              <p className={cn("text-xs", isDark ? "text-teal-400/50" : "text-teal-500")}>{selectedPatient.cpf ?? selectedPatient.phone_primary ?? ""}</p>
            </div>
            <button onClick={() => { setSelectedPatient(null); setSearch(""); }}>
              <X className={cn("w-4 h-4", isDark ? "text-teal-400/50" : "text-teal-500")} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
              <Input className={cn("pl-9", inputCls)} placeholder="Buscar paciente…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            {searchResult?.items?.length ? (
              <div className={cn("border rounded-xl overflow-hidden divide-y", isDark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100")}>
                {searchResult.items.map((p) => (
                  <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(""); }}
                    className={cn("w-full text-left px-4 py-3 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <p className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{p.name}</p>
                    <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>{p.cpf ?? p.phone_primary ?? ""}</p>
                  </button>
                ))}
              </div>
            ) : search.length >= 2 && (
              <p className={cn("text-sm text-center py-4", isDark ? "text-white/20" : "text-gray-400")}>Nenhum paciente encontrado.</p>
            )}
          </>
        )}
      </div>

      {/* Summary cards */}
      {selectedPatient && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Consultas", value: appointments.length, icon: Calendar, color: isDark ? "text-cyan-400" : "text-cyan-600" },
            { label: "Contatos", value: contacts.length, icon: Phone, color: isDark ? "text-pink-400" : "text-pink-600" },
            { label: "Ações", value: apptLogs.length, icon: Activity, color: isDark ? "text-violet-400" : "text-violet-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={cn("rounded-2xl border p-4 flex items-center gap-3", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-gray-50")}>
                  <Icon className={cn("w-4 h-4", s.color)} />
                </div>
                <div>
                  <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                  <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      {selectedPatient && events.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className={cn("absolute left-[22px] top-0 bottom-0 w-[2px]", isDark ? "bg-white/5" : "bg-gray-100")} />

          <div className="space-y-4 pl-12">
            {events.map((event, idx) => {
              if (event.type === "appointment") {
                const a = event.data as Appointment;
                return (
                  <div key={`appt-${a.id}-${idx}`} className="relative">
                    <div className={cn("absolute -left-10 w-9 h-9 rounded-xl flex items-center justify-center border-2", isDark ? "bg-[#1a1e2e] border-cyan-500/30" : "bg-white border-cyan-300")}>
                      <Calendar className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    </div>
                    <div className={cn("rounded-2xl border p-4", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className={cn("font-semibold text-sm", isDark ? "text-white" : "text-gray-800")}>
                            Consulta {a.status === "completed" ? "realizada" : a.status === "cancelled" ? "cancelada" : "agendada"}
                          </p>
                          {a.procedure_name && <p className={cn("text-sm mt-0.5", isDark ? "text-white/50" : "text-gray-600")}>{a.procedure_name}</p>}
                          {a.dentist_name && <p className={cn("text-xs mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{a.dentist_name}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-xs font-medium", isDark ? "text-white/40" : "text-gray-500")}>
                            {format(parseISO(a.start_time), "dd/MM/yyyy")}
                          </p>
                          <p className={cn("text-xs", isDark ? "text-white/25" : "text-gray-400")}>
                            {format(parseISO(a.start_time), "HH:mm")} – {format(parseISO(a.end_time), "HH:mm")}
                          </p>
                          {a.procedure_duration_minutes && (
                            <p className={cn("text-xs flex items-center gap-1 justify-end mt-0.5", isDark ? "text-white/20" : "text-gray-400")}>
                              <Clock className="w-3 h-3" />{differenceInMinutes(parseISO(a.end_time), parseISO(a.start_time))} min
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (event.type === "log") {
                const l = event.data as AppointmentLog;
                const logColors: Record<string, string> = {
                  scheduled: "text-cyan-400 border-cyan-500/30",
                  cancelled: "text-red-400 border-red-500/30",
                  rescheduled: "text-violet-400 border-violet-500/30",
                  attended: "text-emerald-400 border-emerald-500/30",
                  started: "text-amber-400 border-amber-500/30",
                  finished: "text-emerald-400 border-emerald-500/30",
                };
                const clr = logColors[l.action] ?? "text-white/40 border-white/10";
                return (
                  <div key={`log-${l.id}-${idx}`} className="relative">
                    <div className={cn("absolute -left-10 w-9 h-9 rounded-xl flex items-center justify-center border-2", isDark ? `bg-[#1a1e2e] ${clr}` : `bg-white border-gray-200`)}>
                      <Activity className={cn("w-4 h-4", isDark ? clr.split(" ")[0] : "text-gray-400")} />
                    </div>
                    <div className={cn("rounded-2xl border p-3", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-gray-700")}>
                          {l.action === "scheduled" ? "Agendamento registrado" :
                            l.action === "cancelled" ? "Cancelamento" :
                            l.action === "rescheduled" ? "Reagendamento" :
                            l.action === "attended" ? "Atendido" :
                            l.action === "started" ? "Consulta iniciada" :
                            l.action === "finished" ? "Consulta finalizada" : l.action}
                        </p>
                        <span className={cn("text-xs", isDark ? "text-white/20" : "text-gray-400")}>
                          {format(parseISO(l.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      {l.cancellation_reason && <p className={cn("text-xs mt-1", isDark ? "text-white/30" : "text-gray-400")}>Motivo: {l.cancellation_reason}</p>}
                      {l.rescheduled_to && <p className={cn("text-xs mt-1", isDark ? "text-white/30" : "text-gray-400")}>Para: {format(parseISO(l.rescheduled_to), "dd/MM/yyyy HH:mm")}</p>}
                      {l.performed_by_name && <p className={cn("text-xs mt-0.5", isDark ? "text-white/20" : "text-gray-400")}>por {l.performed_by_name}</p>}
                    </div>
                  </div>
                );
              }

              if (event.type === "contact") {
                const c = event.data as ContactLog;
                return (
                  <div key={`contact-${c.id}-${idx}`} className="relative">
                    <div className={cn("absolute -left-10 w-9 h-9 rounded-xl flex items-center justify-center border-2", isDark ? `bg-[#1a1e2e] ${c.was_successful ? "border-emerald-500/30" : "border-red-500/30"}` : "bg-white border-gray-200")}>
                      {c.was_successful
                        ? <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-600")} />
                        : <XCircle className={cn("w-4 h-4", isDark ? "text-red-400" : "text-red-600")} />}
                    </div>
                    <div className={cn("rounded-2xl border p-3", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-gray-700")}>
                            Contato — {CONTACT_TYPE_LABELS[c.contact_type] ?? c.contact_type}
                          </p>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", c.was_successful ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600" : isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")}>
                            {c.was_successful ? "Sucesso" : "Sem sucesso"}
                          </span>
                          {c.channel && <span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-500")}>{c.channel}</span>}
                        </div>
                        <span className={cn("text-xs shrink-0", isDark ? "text-white/20" : "text-gray-400")}>
                          {format(parseISO(c.contacted_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      {c.notes && <p className={cn("text-xs mt-1", isDark ? "text-white/30" : "text-gray-400")}>{c.notes}</p>}
                      {c.contacted_by_name && <p className={cn("text-xs mt-0.5", isDark ? "text-white/20" : "text-gray-400")}>por {c.contacted_by_name}</p>}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {selectedPatient && events.length === 0 && (
        <div className={cn("text-center py-16", isDark ? "text-white/20" : "text-gray-400")}>
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro encontrado para este paciente.</p>
        </div>
      )}

      {!selectedPatient && (
        <div className={cn("text-center py-20", isDark ? "text-white/20" : "text-gray-300")}>
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base">Selecione um paciente para ver a timeline</p>
          <p className="text-sm mt-1 opacity-60">Consultas, contatos e ações agrupados cronologicamente</p>
        </div>
      )}
    </div>
  );
}
