"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Appointment, AppointmentStatus, AppointmentLog, DelayLog, Procedure, Room, User, PatientListItem, PaginatedPatients } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft, ChevronRight, Plus, Search, X, Calendar as CalendarIcon,
  CheckCircle2, Clock, RotateCcw, History, Play, StopCircle,
} from "lucide-react";
import {
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, isSameMonth, parseISO, addWeeks, addMonths, addMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTheme } from "@/lib/theme";

type ViewMode = "semana" | "dia" | "mes";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; dark: string; light: string }> = {
  scheduled:   { label: "Agendada",       dark: "bg-cyan-500/15 border-l-cyan-400 text-cyan-300",           light: "bg-cyan-50 border-l-cyan-400 text-cyan-700" },
  confirmed:   { label: "Confirmada",     dark: "bg-emerald-500/15 border-l-emerald-400 text-emerald-300",  light: "bg-emerald-50 border-l-emerald-400 text-emerald-700" },
  in_progress: { label: "Em andamento",   dark: "bg-amber-500/15 border-l-amber-400 text-amber-300",        light: "bg-amber-50 border-l-amber-400 text-amber-700" },
  completed:   { label: "Finalizada",     dark: "bg-white/5 border-l-white/20 text-white/40",               light: "bg-gray-50 border-l-gray-300 text-gray-400" },
  cancelled:   { label: "Cancelada",      dark: "bg-red-500/10 border-l-red-400/50 text-red-400/50",        light: "bg-red-50 border-l-red-300 text-red-400" },
  rescheduled: { label: "Reagendada",     dark: "bg-violet-500/15 border-l-violet-400 text-violet-300",     light: "bg-violet-50 border-l-violet-400 text-violet-700" },
  no_show:     { label: "Não compareceu", dark: "bg-orange-500/10 border-l-orange-400 text-orange-400",     light: "bg-orange-50 border-l-orange-300 text-orange-600" },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    scheduled: "Agendado", confirmed: "Confirmado", cancelled: "Cancelado",
    rescheduled: "Reagendado", attended: "Atendido", no_show: "Não compareceu",
    started: "Consulta iniciada", finished: "Consulta finalizada",
  };
  return map[action] ?? action;
}

function InfoCell({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div>
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", isDark ? "text-white/25" : "text-gray-400")}>{label}</span>
      <p className={cn("font-medium mt-0.5 text-sm", isDark ? "text-white/80" : "text-gray-700")}>{value}</p>
    </div>
  );
}

export default function AgendaPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const firstWeekOfMonth = startOfWeek(monthStart, { weekStartsOn: 1 });
  const lastWeekOfMonth = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allMonthDays: Date[] = [];
  let d = firstWeekOfMonth;
  while (d <= lastWeekOfMonth) { allMonthDays.push(d); d = addDays(d, 1); }

  const queryFrom = view === "semana" ? weekStart : view === "dia" ? currentDate : firstWeekOfMonth;
  const queryTo   = view === "semana" ? weekEnd   : view === "dia" ? currentDate : lastWeekOfMonth;

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments", queryFrom.toISOString(), view],
    queryFn: () => api.get("/appointments", { params: { date_from: queryFrom.toISOString(), date_to: queryTo.toISOString() } }).then((r) => r.data),
  });
  const { data: procedures = [] } = useQuery<Procedure[]>({ queryKey: ["procedures"], queryFn: () => api.get("/appointments/procedures/list").then((r) => r.data) });
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["rooms"], queryFn: () => api.get("/appointments/rooms/list").then((r) => r.data) });
  const { data: dentists = [] } = useQuery<User[]>({ queryKey: ["dentists"], queryFn: () => api.get("/users/dentists").then((r) => r.data) });

  const { data: apptLogs = [] } = useQuery<AppointmentLog[]>({
    queryKey: ["appt-logs", selectedAppt?.id],
    queryFn: () => api.get("/logs/appointment", { params: { appointment_id: selectedAppt!.id } }).then((r) => r.data),
    enabled: !!selectedAppt,
  });
  const { data: delayLogs = [] } = useQuery<DelayLog[]>({
    queryKey: ["delay-log", selectedAppt?.id],
    queryFn: () => api.get("/logs/delay", { params: { appointment_id: selectedAppt!.id } }).then((r) => r.data),
    enabled: !!selectedAppt,
  });
  const activeDelay = delayLogs[0];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.patch(`/appointments/${id}`, { status }).then((r) => r.data),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["appointments"] }); setSelectedAppt(data); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const markAttended = useMutation({
    mutationFn: async (appt: Appointment) => {
      const updated = await api.patch(`/appointments/${appt.id}`, { status: "completed" });
      await api.post("/logs/appointment", { appointment_id: appt.id, patient_id: appt.patient_id, action: "attended", procedure_id: appt.procedure_id });
      return updated.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); qc.invalidateQueries({ queryKey: ["appt-logs"] }); setSelectedAppt(null); toast.success("Consulta marcada como atendida!"); },
    onError: () => toast.error("Erro ao marcar como atendida"),
  });

  const cancelAppt = useMutation({
    mutationFn: async ({ appt, reason }: { appt: Appointment; reason: string }) => {
      await api.patch(`/appointments/${appt.id}`, { status: "cancelled" });
      await api.post("/logs/appointment", { appointment_id: appt.id, patient_id: appt.patient_id, action: "cancelled", cancellation_reason: reason });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); qc.invalidateQueries({ queryKey: ["appt-logs"] }); setSelectedAppt(null); setShowCancelModal(false); setCancelReason(""); toast.success("Consulta cancelada."); },
    onError: () => toast.error("Erro ao cancelar"),
  });

  const startConsultation = useMutation({
    mutationFn: async (appt: Appointment) => {
      await api.patch(`/appointments/${appt.id}`, { status: "in_progress" });
      await api.post("/logs/delay", { appointment_id: appt.id, started_at: new Date().toISOString() });
      await api.post("/logs/appointment", { appointment_id: appt.id, patient_id: appt.patient_id, action: "started" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); qc.invalidateQueries({ queryKey: ["delay-log"] }); setSelectedAppt(null); toast.success("Consulta iniciada!"); },
    onError: () => toast.error("Erro ao iniciar"),
  });

  const finishConsultation = useMutation({
    mutationFn: async (appt: Appointment) => {
      await api.patch(`/appointments/${appt.id}`, { status: "completed" });
      if (activeDelay) await api.patch(`/logs/delay/${activeDelay.id}`, { finished_at: new Date().toISOString() });
      await api.post("/logs/appointment", { appointment_id: appt.id, patient_id: appt.patient_id, action: "finished" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); qc.invalidateQueries({ queryKey: ["delay-log"] }); setSelectedAppt(null); toast.success("Consulta finalizada!"); },
    onError: () => toast.error("Erro ao finalizar"),
  });

  function navigate(dir: "prev" | "next" | "today") {
    if (dir === "today") { setCurrentDate(new Date()); return; }
    const delta = dir === "next" ? 1 : -1;
    if (view === "semana") setCurrentDate(addWeeks(currentDate, delta));
    else if (view === "dia") setCurrentDate(addDays(currentDate, delta));
    else setCurrentDate(addMonths(currentDate, delta));
  }

  function getAppts(day: Date, hour?: number): Appointment[] {
    return appointments.filter((a) => {
      const s = parseISO(a.start_time);
      if (!isSameDay(s, day)) return false;
      if (hour !== undefined) return s.getHours() === hour;
      return true;
    });
  }

  const headerLabel = view === "semana"
    ? `${format(weekStart, "dd MMM", { locale: ptBR })} – ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`
    : view === "dia" ? format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR })
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  const btnNav = cn("p-2 rounded-xl border transition-colors", isDark ? "border-white/10 text-white/50 hover:bg-white/5 hover:text-white" : "border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700");

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <CalendarIcon className="w-4 h-4 text-white" />
          </div>
          Agenda
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn("flex rounded-xl overflow-hidden border text-sm", isDark ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
            {(["dia", "semana", "mes"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-4 py-2 font-medium transition-all duration-200",
                  view === v ? isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-500 text-white"
                    : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
                )}>
                {v === "mes" ? "Mês" : v === "dia" ? "Dia" : "Semana"}
              </button>
            ))}
          </div>
          <button onClick={() => navigate("prev")} className={btnNav}><ChevronLeft className="w-4 h-4" /></button>
          <span className={cn("font-medium min-w-[200px] text-center capitalize text-sm", isDark ? "text-white/60" : "text-gray-600")}>{headerLabel}</span>
          <button onClick={() => navigate("next")} className={btnNav}><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => navigate("today")} className={cn("text-sm px-3 py-2 rounded-xl transition-colors", isDark ? "text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-cyan-600 hover:bg-cyan-50")}>
            Hoje
          </button>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-0 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Plus className="w-4 h-4 mr-1.5" />Agendar
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className={cn("rounded-2xl overflow-hidden border", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
        {view === "semana" && <WeekView days={weekDays} hours={HOURS} getAppts={getAppts} onSelect={setSelectedAppt} isDark={isDark} />}
        {view === "dia"    && <DayView day={currentDate} hours={HOURS} getAppts={getAppts} onSelect={setSelectedAppt} isDark={isDark} />}
        {view === "mes"    && <MonthView days={allMonthDays} currentDate={currentDate} getAppts={getAppts} onSelect={setSelectedAppt} onDayClick={(day) => { setCurrentDate(day); setView("dia"); }} isDark={isDark} />}
      </div>

      {/* Appointment detail dialog */}
      {selectedAppt && (
        <Dialog open={!!selectedAppt} onOpenChange={() => setSelectedAppt(null)}>
          <DialogContent className={cn("max-w-lg rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
            <DialogHeader>
              <DialogTitle>{selectedAppt.patient_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
              <div className={cn("grid grid-cols-2 gap-3 rounded-xl p-4", isDark ? "bg-white/5" : "bg-gray-50")}>
                <InfoCell label="Início" value={format(parseISO(selectedAppt.start_time), "dd/MM HH:mm")} isDark={isDark} />
                <InfoCell label="Fim" value={format(parseISO(selectedAppt.end_time), "HH:mm")} isDark={isDark} />
                <InfoCell label="Dentista" value={selectedAppt.dentist_name ?? "—"} isDark={isDark} />
                <InfoCell label="Procedimento" value={selectedAppt.procedure_name ?? "—"} isDark={isDark} />
                <InfoCell label="Sala" value={selectedAppt.room_name ?? "—"} isDark={isDark} />
                <InfoCell label="Status" value={STATUS_CONFIG[selectedAppt.status].label} isDark={isDark} />
              </div>
              {selectedAppt.notes && <p className={cn("p-3 rounded-xl italic", isDark ? "text-white/40 bg-white/5" : "text-gray-500 bg-gray-50")}>{selectedAppt.notes}</p>}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                {(selectedAppt.status === "scheduled" || selectedAppt.status === "confirmed") && (
                  <>
                    <button onClick={() => startConsultation.mutate(selectedAppt)} disabled={startConsultation.isPending}
                      className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                      <Play className="w-4 h-4" /> Iniciar
                    </button>
                    <button onClick={() => setShowCancelModal(true)}
                      className={cn("flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors", isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </>
                )}
                {selectedAppt.status === "in_progress" && (
                  <>
                    <button onClick={() => finishConsultation.mutate(selectedAppt)} disabled={finishConsultation.isPending}
                      className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20">
                      <StopCircle className="w-4 h-4" /> Finalizar
                    </button>
                    <button onClick={() => markAttended.mutate(selectedAppt)} disabled={markAttended.isPending}
                      className={cn("flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors", isDark ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50")}>
                      <CheckCircle2 className="w-4 h-4" /> Marcar atendido
                    </button>
                  </>
                )}
                {(selectedAppt.status === "cancelled" || selectedAppt.status === "no_show" || selectedAppt.status === "rescheduled") && (
                  <button onClick={() => setShowReschedule(true)}
                    className="col-span-2 flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl border border-violet-500/30 text-violet-400 text-sm font-medium hover:bg-violet-500/10 transition-colors">
                    <RotateCcw className="w-4 h-4" /> Reagendar
                  </button>
                )}
              </div>

              {/* Status picker */}
              <div>
                <p className={cn("text-xs font-medium mb-2", isDark ? "text-white/30" : "text-gray-400")}>Status manual</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                    <button key={s} onClick={() => updateStatus.mutate({ id: selectedAppt.id, status: s })} disabled={updateStatus.isPending}
                      className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",
                        selectedAppt.status === s
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                          : isDark ? "border-white/10 text-white/40 hover:border-cyan-500/20 hover:text-cyan-300" : "border-gray-200 text-gray-400 hover:border-cyan-300 hover:text-cyan-600"
                      )}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delay log summary */}
              {activeDelay && (
                <div className={cn("rounded-xl p-3 text-xs space-y-1", isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200")}>
                  <p className={cn("font-medium", isDark ? "text-amber-300" : "text-amber-700")}>Registro de tempo</p>
                  {activeDelay.started_at && <p className={isDark ? "text-amber-400/60" : "text-amber-600"}>Iniciada: {format(parseISO(activeDelay.started_at), "HH:mm")}</p>}
                  {activeDelay.finished_at && <p className={isDark ? "text-amber-400/60" : "text-amber-600"}>Finalizada: {format(parseISO(activeDelay.finished_at), "HH:mm")}</p>}
                </div>
              )}

              {/* Appointment log history */}
              {apptLogs.length > 0 && (
                <div>
                  <p className={cn("text-xs font-medium mb-2 flex items-center gap-1.5", isDark ? "text-white/30" : "text-gray-400")}>
                    <History className="w-3.5 h-3.5" /> Histórico
                  </p>
                  <div className={cn("rounded-xl divide-y max-h-40 overflow-y-auto", isDark ? "bg-white/[0.02] divide-white/5" : "bg-gray-50 divide-gray-100")}>
                    {apptLogs.map((log) => (
                      <div key={log.id} className="px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("font-medium", isDark ? "text-white/70" : "text-gray-700")}>{actionLabel(log.action)}</span>
                          <span className={isDark ? "text-white/20" : "text-gray-400"}>{format(parseISO(log.created_at), "dd/MM HH:mm")}</span>
                        </div>
                        {log.cancellation_reason && <p className={isDark ? "text-white/30" : "text-gray-400"}>Motivo: {log.cancellation_reason}</p>}
                        {log.rescheduled_to && <p className={isDark ? "text-white/30" : "text-gray-400"}>Reagendado para: {format(parseISO(log.rescheduled_to), "dd/MM/yyyy HH:mm")}</p>}
                        {log.performed_by_name && <p className={isDark ? "text-white/20" : "text-gray-400"}>por {log.performed_by_name}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel modal */}
      {showCancelModal && selectedAppt && (
        <Dialog open onOpenChange={() => setShowCancelModal(false)}>
          <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
            <DialogHeader><DialogTitle>Cancelar consulta</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className={cn("text-sm", isDark ? "text-white/50" : "text-gray-500")}>Informe o motivo do cancelamento:</p>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex: paciente ligou cancelando…" rows={3}
                className={cn("resize-none rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200")} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCancelModal(false)}>Voltar</Button>
                <Button className="flex-1 rounded-xl bg-red-500 hover:bg-red-400 border-0 text-white" disabled={cancelAppt.isPending}
                  onClick={() => cancelAppt.mutate({ appt: selectedAppt, reason: cancelReason })}>
                  Confirmar cancelamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reschedule modal */}
      {showReschedule && selectedAppt && (
        <RescheduleModal appt={selectedAppt} isDark={isDark}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ["appointments"] }); setShowReschedule(false); setSelectedAppt(null); }} />
      )}

      <NewAppointmentForm
        open={showForm} onClose={() => setShowForm(false)}
        procedures={procedures} rooms={rooms} dentists={dentists}
        isDark={isDark}
        onSuccess={(appt: Appointment) => {
          qc.invalidateQueries({ queryKey: ["appointments"] });
          setShowForm(false);
          api.post("/logs/appointment", { appointment_id: appt.id, patient_id: appt.patient_id, action: "scheduled", procedure_id: appt.procedure_id }).catch(() => {});
        }}
      />
    </div>
  );
}

/* ─── Week View ──────────────────────────────────────────────── */
function WeekView({ days, hours, getAppts, onSelect, isDark }: {
  days: Date[]; hours: number[];
  getAppts: (d: Date, h: number) => Appointment[];
  onSelect: (a: Appointment) => void;
  isDark: boolean;
}) {
  const border = isDark ? "border-white/[0.04]" : "border-gray-100";
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className={cn("grid grid-cols-8 border-b", border, isDark ? "bg-white/[0.02]" : "bg-gray-50/80")}>
          <div className="py-3 w-14" />
          {days.map((d) => (
            <div key={d.toISOString()} className={cn("py-3 text-center border-l", border, isSameDay(d, new Date()) ? isDark ? "bg-cyan-500/5" : "bg-cyan-50/50" : "")}>
              <p className={cn("text-[10px] uppercase tracking-wider font-medium", isDark ? "text-white/20" : "text-gray-400")}>{format(d, "EEE", { locale: ptBR })}</p>
              <p className={cn("text-base font-bold leading-none mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full",
                isSameDay(d, new Date()) ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : isDark ? "text-white/50" : "text-gray-600"
              )}>{format(d, "dd")}</p>
            </div>
          ))}
        </div>
        {hours.map((h) => (
          <div key={h} className={cn("grid grid-cols-8 border-b min-h-[60px]", border)}>
            <div className={cn("px-2 py-1 text-right pt-2 select-none font-mono text-xs w-14 shrink-0", isDark ? "text-white/15" : "text-gray-300")}>
              {String(h).padStart(2, "0")}:00
            </div>
            {days.map((d) => {
              const appts = getAppts(d, h);
              return (
                <div key={d.toISOString()} className={cn("border-l p-1 space-y-0.5 transition-colors", border, isSameDay(d, new Date()) ? isDark ? "bg-cyan-500/[0.015]" : "bg-cyan-50/20" : isDark ? "hover:bg-white/[0.01]" : "hover:bg-gray-50/50")}>
                  {appts.map((a) => {
                    const cfg = STATUS_CONFIG[a.status];
                    return (
                      <button key={a.id} onClick={() => onSelect(a)}
                        className={cn("w-full text-left text-[11px] rounded-lg border-l-2 px-2 py-1 truncate leading-tight transition-all hover:scale-[1.02] hover:shadow-md", isDark ? cfg.dark : cfg.light)}>
                        <span className="font-semibold">{format(parseISO(a.start_time), "HH:mm")}</span>
                        {" "}{a.patient_name}
                        {a.procedure_name && <span className="opacity-50"> · {a.procedure_name}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Day View ───────────────────────────────────────────────── */
function DayView({ day, hours, getAppts, onSelect, isDark }: {
  day: Date; hours: number[];
  getAppts: (d: Date, h: number) => Appointment[];
  onSelect: (a: Appointment) => void;
  isDark: boolean;
}) {
  const border = isDark ? "border-white/[0.04]" : "border-gray-100";
  return (
    <div>
      <div className={cn("px-6 py-4 border-b text-center", border, isDark ? "bg-white/[0.02]" : "bg-gray-50")}>
        <p className={cn("text-base font-bold capitalize", isDark ? "text-white/80" : "text-gray-700")}>{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
      </div>
      {hours.map((h) => {
        const appts = getAppts(day, h);
        return (
          <div key={h} className={cn("flex border-b min-h-[64px]", border)}>
            <div className={cn("w-16 shrink-0 text-right pr-3 pt-2 font-mono text-xs", isDark ? "text-white/15" : "text-gray-300")}>
              {String(h).padStart(2, "0")}:00
            </div>
            <div className={cn("flex-1 p-1.5 space-y-1 border-l", border)}>
              {appts.map((a) => {
                const cfg = STATUS_CONFIG[a.status];
                return (
                  <button key={a.id} onClick={() => onSelect(a)}
                    className={cn("w-full text-left text-sm rounded-xl border-l-4 px-3 py-2 transition-all hover:shadow-md", isDark ? cfg.dark : cfg.light)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{format(parseISO(a.start_time), "HH:mm")} – {format(parseISO(a.end_time), "HH:mm")}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-white/10" : "bg-black/5")}>{cfg.label}</span>
                    </div>
                    <p className="font-medium mt-0.5">{a.patient_name}</p>
                    {a.procedure_name && <p className="text-xs opacity-60">{a.procedure_name}{a.dentist_name ? ` · ${a.dentist_name}` : ""}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Month View
function MonthView({ days, currentDate, getAppts, onSelect, onDayClick, isDark }: {
  days: Date[]; currentDate: Date;
  getAppts: (d: Date) => Appointment[];
  onSelect: (a: Appointment) => void;
  onDayClick: (d: Date) => void;
  isDark: boolean;
}) {
  const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
  const border = isDark ? "border-white/[0.04]" : "border-gray-100";
  return (
    <div>
      <div className={cn("grid grid-cols-7 border-b", border, isDark ? "bg-white/[0.02]" : "bg-gray-50")}>
        {DOW.map((d) => (
          <div key={d} className={cn("py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-white/20" : "text-gray-400")}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const appts = getAppts(d);
          const isToday = isSameDay(d, new Date());
          const isCurrentMonth = isSameMonth(d, currentDate);
          return (
            <div key={d.toISOString()} className={cn("min-h-[110px] border-b border-r p-1.5 cursor-pointer transition-colors", border, !isCurrentMonth ? "opacity-25" : "", isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50")}
              onClick={() => onDayClick(d)}>
              <p className={cn("text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1",
                isToday ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : isDark ? "text-white/50" : "text-gray-500"
              )}>{format(d, "d")}</p>
              <div className="space-y-0.5">
                {appts.slice(0, 4).map((a) => {
                  const cfg = STATUS_CONFIG[a.status];
                  return (
                    <button key={a.id} onClick={(e) => { e.stopPropagation(); onSelect(a); }}
                      className={cn("w-full text-left text-[10px] rounded px-1 py-0.5 truncate border-l-2", isDark ? cfg.dark : cfg.light)}>
                      {format(parseISO(a.start_time), "HH:mm")} {a.patient_name}
                    </button>
                  );
                })}
                {appts.length > 4 && <p className={cn("text-[10px] pl-1", isDark ? "text-white/20" : "text-gray-400")}>+{appts.length - 4} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Reschedule Modal
function RescheduleModal({ appt, isDark, onClose, onSuccess }: {
  appt: Appointment; isDark: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200");

  const mutation = useMutation({
    mutationFn: async () => {
      const updated = await api.patch(`/appointments/${appt.id}`, {
        start_time: new Date(newStart).toISOString(),
        end_time: new Date(newEnd).toISOString(),
        status: "scheduled",
      });
      await api.post("/logs/appointment", {
        appointment_id: appt.id, patient_id: appt.patient_id,
        action: "rescheduled", rescheduled_to: new Date(newStart).toISOString(),
      });
      return updated.data;
    },
    onSuccess,
    onError: () => toast.error("Erro ao reagendar"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
        <DialogHeader><DialogTitle>Reagendar consulta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className={cn("text-sm", isDark ? "text-white/50" : "text-gray-500")}>Paciente: <strong>{appt.patient_name}</strong></p>
          <div className="space-y-1.5">
            <Label className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>Novo inicio</Label>
            <Input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <Label className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>Novo fim</Label>
            <Input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 rounded-xl bg-violet-500 hover:bg-violet-400 border-0 text-white" disabled={mutation.isPending || !newStart || !newEnd} onClick={() => mutation.mutate()}>
              Reagendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// New Appointment Form
function NewAppointmentForm({ open, onClose, procedures, rooms, dentists, isDark, onSuccess }: {
  open: boolean; onClose: () => void;
  procedures: Procedure[]; rooms: Room[]; dentists: User[];
  isDark: boolean;
  onSuccess: (appt: Appointment) => void;
}) {
  const [step, setStep] = useState<"patient" | "details">("patient");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [form, setForm] = useState({ dentist_id: "", room_id: "", procedure_id: "", start_time: "", end_time: "", notes: "" });

  const { data: searchResult } = useQuery<PaginatedPatients>({
    queryKey: ["patients-search", patientSearch],
    queryFn: () => api.get("/patients", { params: { search: patientSearch, page_size: 8 } }).then((r) => r.data),
    enabled: patientSearch.length >= 2,
  });

  useEffect(() => {
    if (!form.start_time || !form.procedure_id) return;
    const proc = procedures.find((p) => p.id === form.procedure_id);
    if (!proc?.duration_minutes) return;
    const start = new Date(form.start_time);
    const end = addMinutes(start, proc.duration_minutes);
    const pad = (n: number) => String(n).padStart(2, "0");
    setForm((f) => ({
      ...f,
      end_time: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
    }));
  }, [form.start_time, form.procedure_id, procedures]);

  const mutation = useMutation({
    mutationFn: () => api.post("/appointments", {
      patient_id: selectedPatient!.id,
      dentist_id: form.dentist_id,
      room_id: form.room_id || undefined,
      procedure_id: form.procedure_id || undefined,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      notes: form.notes || undefined,
    }).then((r) => r.data),
    onSuccess,
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao agendar"),
  });

  function reset() { setStep("patient"); setPatientSearch(""); setSelectedPatient(null); setForm({ dentist_id: "", room_id: "", procedure_id: "", start_time: "", end_time: "", notes: "" }); }
  function handleClose() { reset(); onClose(); }
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const labelCls = cn("text-sm font-medium", isDark ? "text-white/60" : "text-gray-600");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200 text-gray-800");
  const selectStyle = isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {};
  const selectBg = isDark ? "bg-[#1a1e2e]" : "bg-white";
  const selectedProc = procedures.find((p) => p.id === form.procedure_id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-lg rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-800"}>Nova Consulta</DialogTitle>
        </DialogHeader>

        {step === "patient" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/20" : "text-gray-300")} />
              <Input className={cn("pl-9", inputCls)} placeholder="Nome, CPF ou telefone..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} autoFocus />
            </div>
            {selectedPatient && (
              <div className={cn("flex items-center justify-between rounded-xl px-3 py-2 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                <div>
                  <p className={cn("font-medium text-sm", isDark ? "text-cyan-300" : "text-cyan-700")}>{selectedPatient.name}</p>
                  <p className={cn("text-xs", isDark ? "text-cyan-400/50" : "text-cyan-500")}>{selectedPatient.cpf ?? selectedPatient.phone_primary ?? ""}</p>
                </div>
                <button onClick={() => setSelectedPatient(null)}><X className={cn("w-4 h-4", isDark ? "text-cyan-400/40" : "text-cyan-400")} /></button>
              </div>
            )}
            {!selectedPatient && searchResult?.items?.length ? (
              <div className={cn("border rounded-xl overflow-hidden divide-y max-h-52 overflow-y-auto", isDark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100")}>
                {searchResult.items.map((p) => (
                  <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                    className={cn("w-full text-left px-3 py-2.5 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <p className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{p.name}</p>
                    <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>{p.cpf ?? p.phone_primary ?? p.email ?? ""}</p>
                  </button>
                ))}
              </div>
            ) : null}
            {!selectedPatient && patientSearch.length >= 2 && searchResult?.items.length === 0 && (
              <p className={cn("text-sm text-center py-2", isDark ? "text-white/20" : "text-gray-400")}>Nenhum paciente encontrado.</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose} className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")}>Cancelar</Button>
              <Button disabled={!selectedPatient} onClick={() => setStep("details")} className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white">Continuar</Button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className={cn("flex items-center justify-between rounded-xl px-4 py-3 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <div>
                <p className={cn("text-[10px] font-medium uppercase tracking-wide", isDark ? "text-cyan-400/50" : "text-cyan-500")}>Paciente</p>
                <p className={cn("font-bold text-base", isDark ? "text-cyan-300" : "text-cyan-700")}>{selectedPatient?.name}</p>
              </div>
              <button onClick={() => setStep("patient")} className={cn("text-xs underline", isDark ? "text-cyan-400/50 hover:text-cyan-300" : "text-cyan-500 hover:text-cyan-700")}>Alterar</button>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Dentista <span className="text-red-400">*</span></Label>
              <div className="space-y-1.5">
                {dentists.map((den) => (
                  <button key={den.id} onClick={() => set("dentist_id", den.id)}
                    className={cn("flex items-center gap-3 border rounded-xl px-4 py-3 w-full text-left transition-all",
                      form.dentist_id === den.id
                        ? isDark ? "border-cyan-500/30 bg-cyan-500/10" : "border-cyan-300 bg-cyan-50"
                        : isDark ? "border-white/10 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"
                    )}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      form.dentist_id === den.id ? "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white" : isDark ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500"
                    )}>
                      {den.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className={cn("font-medium text-sm", isDark ? "text-white/80" : "text-gray-700")}>{den.name}</p>
                      <p className={cn("text-xs", isDark ? "text-white/20" : "text-gray-400")}>{den.email}</p>
                    </div>
                    {form.dentist_id === den.id && (
                      <div className="ml-auto w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Procedimento</Label>
              <select value={form.procedure_id} onChange={(e) => set("procedure_id", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                style={selectStyle}>
                <option value="" className={selectBg}>Selecionar procedimento</option>
                {procedures.map((p) => <option key={p.id} value={p.id} className={selectBg}>{p.name} {p.duration_minutes}min{p.price ? ` R$${Number(p.price).toFixed(2)}` : ""}</option>)}
              </select>
              {selectedProc && (
                <p className={cn("text-xs flex items-center gap-1.5", isDark ? "text-cyan-400/60" : "text-cyan-600")}>
                  <Clock className="w-3 h-3" /> {selectedProc.duration_minutes} min - horario fim calculado automaticamente
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>Inicio <span className="text-red-400">*</span></Label>
                <Input type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className={cn("text-sm", inputCls)} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Fim <span className="text-red-400">*</span></Label>
                <Input type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className={cn("text-sm", inputCls)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Sala</Label>
              <select value={form.room_id} onChange={(e) => set("room_id", e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                style={selectStyle}>
                <option value="" className={selectBg}>Selecionar sala</option>
                {rooms.map((r) => <option key={r.id} value={r.id} className={selectBg}>{r.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Observacoes</Label>
              <Textarea rows={2} placeholder="Observacoes..." value={form.notes} onChange={(e) => set("notes", e.target.value)} className={cn("resize-none", inputCls)} />
            </div>

            <div className="flex gap-2 pb-1">
              <Button variant="outline" className={cn("flex-1 rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")} onClick={() => setStep("patient")}>Voltar</Button>
              <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl shadow-lg shadow-cyan-500/20 text-white"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !form.dentist_id || !form.start_time || !form.end_time}>
                {mutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
