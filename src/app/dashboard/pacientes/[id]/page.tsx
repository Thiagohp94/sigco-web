"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Patient, PatientStatus, MedicalRecord, OdontogramEntry, AppointmentLog, Appointment } from "@/types";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Phone, Mail, MapPin, AlertCircle, FileText, Stethoscope,
  Edit, Calendar, CheckCircle2, XCircle, Clock, Activity, Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OdontogramView } from "@/components/odontogram/odontogram-view";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: PatientStatus; label: string; color: string; darkColor: string }[] = [
  { value: "active",          label: "Ativo",                   color: "bg-emerald-50 text-emerald-700 border-emerald-200",   darkColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "inactive",        label: "Inativo",                 color: "bg-gray-100 text-gray-500 border-gray-200",           darkColor: "bg-white/5 text-white/40 border-white/10" },
  { value: "no_recent_visit", label: "Sem consulta recente",    color: "bg-amber-50 text-amber-700 border-amber-200",         darkColor: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  { value: "transferred",     label: "Mudou de clínica",        color: "bg-blue-50 text-blue-700 border-blue-200",            darkColor: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { value: "deceased",        label: "Falecido",                color: "bg-red-50 text-red-600 border-red-200",               darkColor: "bg-red-500/10 text-red-400 border-red-500/20" },
];

function getStatusConfig(status: PatientStatus, isDark: boolean) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
  return { label: opt.label, cls: isDark ? opt.darkColor : opt.color };
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [isDark, setIsDark] = useState(true);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => api.get(`/patients/${id}`).then((r) => r.data),
  });

  const { data: records = [] } = useQuery<MedicalRecord[]>({
    queryKey: ["records", id],
    queryFn: () => api.get(`/patients/${id}/records`).then((r) => r.data),
    enabled: !!patient,
  });

  const { data: odontogram = [] } = useQuery<OdontogramEntry[]>({
    queryKey: ["odontogram", id],
    queryFn: () => api.get(`/patients/${id}/records/odontogram`).then((r) => r.data),
    enabled: !!patient,
  });

  const { data: apptLogs = [] } = useQuery<AppointmentLog[]>({
    queryKey: ["patient-logs", id],
    queryFn: () => api.get("/logs/appointment", { params: { patient_id: id } }).then((r) => r.data),
    enabled: !!patient,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["patient-appointments", id],
    queryFn: () => api.get("/appointments", { params: { patient_id: id } }).then((r) => r.data),
    enabled: !!patient,
  });

  const updateStatus = useMutation({
    mutationFn: (status: PatientStatus) =>
      api.patch(`/patients/${id}`, { status, is_active: status === "active" || status === "no_recent_visit" }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Status atualizado");
      setShowStatusPicker(false);
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const deleteLog = useMutation({
    mutationFn: (logId: string) => api.delete(`/logs/appointment/${logId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-logs", id] });
      toast.success("Registro removido da timeline");
    },
    onError: () => toast.error("Erro ao remover registro"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }
  if (!patient) return null;

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const border = isDark ? "border-white/5" : "border-gray-100";
  const cardBg = isDark ? "glass-card" : "bg-white border border-gray-100 shadow-sm";
  const statusCfg = getStatusConfig(patient.status ?? "active", isDark);

  // Build timeline from logs + appointments
  const timelineItems = [
    ...apptLogs.map((l) => ({ id: l.id, date: l.created_at, type: "log" as const, data: l })),
    ...appointments.map((a) => ({ id: a.id, date: a.start_time, type: "appointment" as const, data: a })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => router.back()} className={cn("p-2 rounded-xl transition-all", isDark ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-violet-500/20 shrink-0">
            {patient.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className={cn("text-2xl font-bold truncate", txt)}>{patient.name}</h1>
            <p className={cn("text-sm", txtMuted)}>CPF: {patient.cpf ?? "Não informado"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status badge - clickable */}
          <div className="relative">
            <button
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-all hover:scale-105", statusCfg.cls)}
            >
              {statusCfg.label}
            </button>
            {showStatusPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusPicker(false)} />
                <div className={cn("absolute right-0 top-full mt-2 z-50 rounded-xl border shadow-xl p-2 min-w-[200px]",
                  isDark ? "bg-[#111827] border-white/10" : "bg-white border-gray-200"
                )}>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatus.mutate(opt.value)}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                        patient.status === opt.value
                          ? isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-cyan-50 text-cyan-700"
                          : isDark ? "text-white/60 hover:bg-white/5" : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {opt.label}
                      {patient.status === opt.value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Edit button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/pacientes/${id}/editar`)}
            className={cn("rounded-xl gap-1.5", isDark ? "border-white/10 text-white/50 hover:text-white hover:bg-white/5" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50")}
          >
            <Edit className="w-3.5 h-3.5" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact info */}
          <div className={cn("rounded-2xl overflow-hidden", cardBg)}>
            <div className={cn("flex items-center gap-2 px-5 py-3 border-b", border)}>
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <h2 className={cn("font-semibold text-sm", txtSoft)}>Contato</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex gap-3 items-start">
                <Phone className={cn("w-4 h-4 mt-0.5 shrink-0", txtMuted)} />
                <span className={txtSoft}>{patient.phone_primary ?? "—"}</span>
              </div>
              {patient.whatsapp && patient.whatsapp !== patient.phone_primary && (
                <div className="flex gap-3 items-start">
                  <Phone className={cn("w-4 h-4 mt-0.5 shrink-0", txtMuted)} />
                  <span className={txtSoft}>WhatsApp: {patient.whatsapp}</span>
                </div>
              )}
              <div className="flex gap-3 items-start">
                <Mail className={cn("w-4 h-4 mt-0.5 shrink-0", txtMuted)} />
                <span className={txtSoft}>{patient.email ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          {(patient.street || patient.city) && (
            <div className={cn("rounded-2xl overflow-hidden", cardBg)}>
              <div className={cn("flex items-center gap-2 px-5 py-3 border-b", border)}>
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <h2 className={cn("font-semibold text-sm", txtSoft)}>Endereço</h2>
              </div>
              <div className="p-5 text-sm space-y-1">
                {patient.street && (
                  <p className={txtSoft}>
                    {patient.street}{patient.number ? `, ${patient.number}` : ""}
                    {patient.complement ? ` - ${patient.complement}` : ""}
                  </p>
                )}
                {patient.neighborhood && <p className={txtMuted}>{patient.neighborhood}</p>}
                {patient.city && (
                  <p className={txtSoft}>
                    {patient.city}{patient.state ? `/${patient.state}` : ""}
                    {patient.zip_code ? ` - CEP: ${patient.zip_code}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Medical alerts */}
          {(patient.allergies || patient.chronic_diseases || patient.medications) && (
            <div className={cn("rounded-2xl overflow-hidden border",
              isDark ? "border-amber-500/15 bg-amber-500/5" : "border-amber-200 bg-amber-50"
            )}>
              <div className={cn("flex items-center gap-2 px-5 py-3 border-b",
                isDark ? "border-amber-500/10" : "border-amber-200"
              )}>
                <AlertCircle className={cn("w-3.5 h-3.5", isDark ? "text-amber-400" : "text-amber-600")} />
                <h2 className={cn("font-semibold text-sm", isDark ? "text-amber-400/80" : "text-amber-700")}>Alertas Médicos</h2>
              </div>
              <div className="p-5 space-y-2 text-sm">
                {patient.allergies && (
                  <p className={isDark ? "text-amber-300/70" : "text-amber-800"}>
                    <span className={cn("font-medium", isDark ? "text-amber-300" : "text-amber-900")}>Alergias:</span> {patient.allergies}
                  </p>
                )}
                {patient.chronic_diseases && (
                  <p className={isDark ? "text-amber-300/70" : "text-amber-800"}>
                    <span className={cn("font-medium", isDark ? "text-amber-300" : "text-amber-900")}>Doenças:</span> {patient.chronic_diseases}
                  </p>
                )}
                {patient.medications && (
                  <p className={isDark ? "text-amber-300/70" : "text-amber-800"}>
                    <span className={cn("font-medium", isDark ? "text-amber-300" : "text-amber-900")}>Medicamentos:</span> {patient.medications}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Personal info */}
          <div className={cn("rounded-2xl overflow-hidden", cardBg)}>
            <div className={cn("flex items-center gap-2 px-5 py-3 border-b", border)}>
              <Stethoscope className="w-3.5 h-3.5 text-violet-400" />
              <h2 className={cn("font-semibold text-sm", txtSoft)}>Dados Pessoais</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              {patient.birth_date && (
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide font-semibold", txtMuted)}>Nascimento</p>
                  <p className={txtSoft}>{format(new Date(patient.birth_date + "T00:00:00"), "dd/MM/yyyy")}</p>
                </div>
              )}
              {patient.gender && (
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide font-semibold", txtMuted)}>Sexo</p>
                  <p className={txtSoft}>{patient.gender === "male" ? "Masculino" : patient.gender === "female" ? "Feminino" : "Outro"}</p>
                </div>
              )}
              {patient.rg && (
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide font-semibold", txtMuted)}>RG</p>
                  <p className={txtSoft}>{patient.rg}</p>
                </div>
              )}
              {patient.cpf && (
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide font-semibold", txtMuted)}>CPF</p>
                  <p className={cn("font-mono", txtSoft)}>{patient.cpf}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Odontogram */}
          <div className={cn("rounded-2xl overflow-hidden", cardBg)}>
            <div className={cn("flex items-center gap-2 px-5 py-3 border-b", border)}>
              <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
              <h2 className={cn("font-semibold text-sm", txtSoft)}>Odontograma</h2>
            </div>
            <div className="p-5">
              <OdontogramView entries={odontogram} patientId={id} />
            </div>
          </div>

          {/* Medical records */}
          <div className={cn("rounded-2xl overflow-hidden", cardBg)}>
            <div className={cn("flex items-center justify-between px-5 py-3 border-b", border)}>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <h2 className={cn("font-semibold text-sm", txtSoft)}>Prontuário</h2>
              </div>
              <Button size="sm" variant="outline"
                onClick={() => router.push(`/dashboard/prontuario/${id}`)}
                className={cn("rounded-lg text-xs", isDark ? "border-white/10 text-white/40 hover:text-white hover:bg-white/5" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50")}>
                Ver Completo
              </Button>
            </div>
            <div className="p-5">
              {records.length === 0 ? (
                <p className={cn("text-sm text-center py-6", txtMuted)}>Nenhum registro no prontuário.</p>
              ) : (
                <div className="space-y-3">
                  {records.slice(0, 5).map((r) => (
                    <div key={r.id} className={cn("rounded-xl border p-4 space-y-1 transition-colors",
                      isDark ? "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]" : "border-gray-100 bg-gray-50/50 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-sm font-medium", txtSoft)}>
                          {format(new Date(r.record_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className={cn("text-xs", txtMuted)}>Dr(a). {r.dentist_name}</span>
                      </div>
                      {r.procedure_description && <p className={cn("text-sm", txtMuted)}>{r.procedure_description}</p>}
                      {r.evolution && <p className={cn("text-xs italic", txtMuted)}>{r.evolution}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className={cn("rounded-2xl overflow-hidden", cardBg)}>
            <div className={cn("flex items-center justify-between px-5 py-3 border-b", border)}>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <h2 className={cn("font-semibold text-sm", txtSoft)}>Timeline</h2>
              </div>
              <Button size="sm" variant="outline"
                onClick={() => router.push(`/dashboard/timeline?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)}
                className={cn("rounded-lg text-xs", isDark ? "border-white/10 text-white/40 hover:text-white hover:bg-white/5" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50")}>
                Ver Completa
              </Button>
            </div>
            <div className="p-5">
              {timelineItems.length === 0 ? (
                <p className={cn("text-sm text-center py-6", txtMuted)}>Nenhum evento registrado.</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className={cn("absolute left-[7px] top-2 bottom-2 w-px", isDark ? "bg-white/5" : "bg-gray-200")} />

                  <div className="space-y-3">
                    {timelineItems.slice(0, 20).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex gap-3 group">
                        {/* Dot */}
                        <div className={cn("w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-1",
                          item.type === "appointment"
                            ? "border-cyan-400 bg-cyan-400/20"
                            : item.type === "log" && (item.data as AppointmentLog).action === "cancelled"
                              ? "border-red-400 bg-red-400/20"
                              : "border-violet-400 bg-violet-400/20"
                        )} />

                        {/* Content */}
                        <div className={cn("flex-1 rounded-xl p-3 text-sm transition-colors",
                          isDark ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-gray-50/50 hover:bg-gray-50"
                        )}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {item.type === "appointment" && (
                                <>
                                  <p className={cn("font-medium", txtSoft)}>
                                    <Calendar className="w-3 h-3 inline mr-1" />
                                    Consulta — {(item.data as Appointment).procedure_name ?? "Avaliação"}
                                  </p>
                                  <p className={txtMuted}>
                                    {format(parseISO(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    {(item.data as Appointment).dentist_name ? ` · ${(item.data as Appointment).dentist_name}` : ""}
                                  </p>
                                </>
                              )}
                              {item.type === "log" && (() => {
                                const log = item.data as AppointmentLog;
                                const actionLabels: Record<string, string> = {
                                  scheduled: "Consulta agendada", confirmed: "Consulta confirmada",
                                  cancelled: "Consulta cancelada", rescheduled: "Consulta reagendada",
                                  attended: "Paciente atendido", no_show: "Paciente não compareceu",
                                  started: "Consulta iniciada", finished: "Consulta finalizada",
                                };
                                return (
                                  <>
                                    <p className={cn("font-medium", txtSoft)}>
                                      {log.action === "cancelled" ? <XCircle className="w-3 h-3 inline mr-1 text-red-400" /> :
                                       log.action === "attended" || log.action === "finished" ? <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-400" /> :
                                       <Clock className="w-3 h-3 inline mr-1" />}
                                      {actionLabels[log.action] ?? log.action}
                                    </p>
                                    <p className={txtMuted}>
                                      {format(parseISO(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      {log.performed_by_name ? ` · por ${log.performed_by_name}` : ""}
                                    </p>
                                    {log.cancellation_reason && <p className={cn("text-xs italic mt-1", isDark ? "text-red-400/60" : "text-red-500")}>Motivo: {log.cancellation_reason}</p>}
                                    {log.procedure_name && <p className={cn("text-xs", txtMuted)}>Procedimento: {log.procedure_name}</p>}
                                  </>
                                );
                              })()}
                            </div>
                            {/* Delete button for logs */}
                            {item.type === "log" && (
                              <button
                                onClick={() => { if (confirm("Remover este registro da timeline?")) deleteLog.mutate(item.id); }}
                                className={cn("opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all shrink-0",
                                  isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                                )}
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
