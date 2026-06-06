"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar, Clock, CheckCircle2, UserX, Users, ArrowRight, Stethoscope,
  Sparkles, TrendingUp, Play, StopCircle, X, FileText, ChevronRight, RotateCcw,
} from "lucide-react";
import api from "@/lib/api";
import { format, startOfDay, endOfDay, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment, AppointmentStatus } from "@/types";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; dark: string; light: string; dot: string }> = {
  scheduled:   { label: "Agendada",        dark: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",          light: "bg-cyan-50 text-cyan-700 border-cyan-200",         dot: "bg-cyan-400" },
  confirmed:   { label: "Confirmada",      dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", light: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  in_progress: { label: "Em atendimento",  dark: "bg-amber-500/15 text-amber-300 border-amber-500/20",       light: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-400" },
  completed:   { label: "Finalizada",      dark: "bg-white/5 text-white/40 border-white/5",                  light: "bg-gray-100 text-gray-500 border-gray-200",         dot: "bg-gray-400" },
  cancelled:   { label: "Cancelada",       dark: "bg-red-500/10 text-red-400/60 border-red-500/10",          light: "bg-red-50 text-red-500 border-red-200",             dot: "bg-red-400" },
  no_show:     { label: "Não compareceu",  dark: "bg-orange-500/10 text-orange-400 border-orange-500/10",    light: "bg-orange-50 text-orange-600 border-orange-200",    dot: "bg-orange-400" },
  rescheduled: { label: "Reagendada",      dark: "bg-violet-500/15 text-violet-300 border-violet-500/20",    light: "bg-violet-50 text-violet-700 border-violet-200",    dot: "bg-violet-400" },
};

const LEFT_BORDER: Record<string, string> = {
  scheduled: "border-l-cyan-400", confirmed: "border-l-emerald-400",
  in_progress: "border-l-amber-400", completed: "border-l-white/10",
  cancelled: "border-l-red-400/40", no_show: "border-l-orange-400", rescheduled: "border-l-violet-400",
};

type Filter = "all" | "in_progress" | "scheduled" | "completed" | "cancelled";

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const today = new Date();
  const isDark = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Appointment | null>(null);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", "today"],
    queryFn: () =>
      api.get("/appointments", {
        params: { date_from: startOfDay(today).toISOString(), date_to: endOfDay(today).toISOString() },
      }).then((r) => r.data),
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.patch(`/appointments/${id}`, { status }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["appointments", "today"] });
      setSelected(data);
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const stats = {
    total:       appointments.length,
    in_progress: appointments.filter((a) => a.status === "in_progress").length,
    pending:     appointments.filter((a) => ["scheduled", "confirmed"].includes(a.status)).length,
    completed:   appointments.filter((a) => a.status === "completed").length,
    no_show:     appointments.filter((a) => a.status === "no_show").length,
    cancelled:   appointments.filter((a) => a.status === "cancelled").length,
  };

  const hour = today.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const cardBase = cn("rounded-xl border-l-2 px-4 py-3 flex items-center gap-4 transition-all cursor-pointer",
    isDark ? "glass-card hover:bg-white/5" : "bg-white border border-gray-100 shadow-sm hover:shadow-md"
  );

  // Sort: in_progress first, then by time
  const STATUS_ORDER: Record<string, number> = {
    in_progress: 0, confirmed: 1, scheduled: 2, completed: 3,
    rescheduled: 4, no_show: 5, cancelled: 6,
  };

  const filtered = appointments
    .filter((a) => {
      if (filter === "all") return true;
      if (filter === "in_progress") return a.status === "in_progress";
      if (filter === "scheduled") return ["scheduled", "confirmed"].includes(a.status);
      if (filter === "completed") return a.status === "completed";
      if (filter === "cancelled") return ["cancelled", "no_show", "rescheduled"].includes(a.status);
      return true;
    })
    .sort((a, b) => {
      const orderDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all",         label: "Todos",          count: stats.total },
    { key: "in_progress", label: "Em andamento",   count: stats.in_progress },
    { key: "scheduled",   label: "Agendadas",      count: stats.pending },
    { key: "completed",   label: "Finalizadas",    count: stats.completed },
    { key: "cancelled",   label: "Canceladas",     count: stats.cancelled + stats.no_show },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={cn("text-3xl font-bold flex items-center gap-2", txt)}>
            {greeting}, {user?.name.split(" ")[0]}
            <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse-glow" />
          </h1>
          <p className={cn("mt-1 capitalize", txtMuted)}>
            {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/agenda")}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white border-0 rounded-xl h-11 px-5 shadow-lg shadow-cyan-500/20"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Abrir Agenda
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />}    label="Consultas hoje"    value={stats.total}       gradient="from-cyan-500 to-cyan-600"     isDark={isDark} onClick={() => setFilter("all")}         active={filter === "all"} />
        <StatCard icon={<Clock className="w-5 h-5" />}       label="Agendadas"          value={stats.pending}     gradient="from-amber-500 to-orange-500"  isDark={isDark} onClick={() => setFilter("scheduled")}   active={filter === "scheduled"} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Finalizadas"       value={stats.completed}   gradient="from-emerald-500 to-emerald-600" isDark={isDark} onClick={() => setFilter("completed")}  active={filter === "completed"} />
        <StatCard icon={<UserX className="w-5 h-5" />}       label="Não compareceram"   value={stats.no_show}     gradient="from-red-500 to-rose-500"      isDark={isDark} onClick={() => setFilter("cancelled")}   active={filter === "cancelled"} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Appointments list — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className={cn("flex rounded-xl overflow-hidden border text-sm", isDark ? "glass border-white/10" : "bg-white border-gray-200 shadow-sm")}>
              {FILTERS.map(({ key, label, count }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={cn("px-3 py-2 font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    filter === key
                      ? isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-500 text-white"
                      : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {label}
                  {count > 0 && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      filter === key
                        ? isDark ? "bg-cyan-400/20 text-cyan-300" : "bg-white/20 text-white"
                        : isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-500"
                    )}>{count}</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => router.push("/dashboard/agenda")}
              className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1 group">
              Ver agenda completa <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Appointment cards */}
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className={cn("rounded-xl h-16 animate-pulse", isDark ? "bg-white/5" : "bg-gray-100")} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className={cn("rounded-2xl py-14 text-center", isDark ? "glass-card" : "bg-white border border-gray-100 shadow-sm")}>
              <Calendar className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-white/10" : "text-gray-300")} />
              <p className={txtMuted}>Nenhuma consulta nesta categoria.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* In progress banner */}
              {filter === "all" && stats.in_progress > 0 && (
                <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1", isDark ? "text-amber-400/70" : "text-amber-600")}>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Em atendimento agora
                </div>
              )}
              {filtered.map((a) => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.completed;
                const borderCls = LEFT_BORDER[a.status] ?? "border-l-white/10";
                const isActive = a.status === "in_progress";
                const duration = differenceInMinutes(parseISO(a.end_time), parseISO(a.start_time));
                return (
                  <button key={a.id} onClick={() => setSelected(a)}
                    className={cn(cardBase, borderCls, "w-full text-left",
                      isActive && (isDark ? "border border-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.1)]" : "border-amber-200")
                    )}>
                    {/* Time */}
                    <div className="text-center min-w-[52px] shrink-0">
                      <p className={cn("text-lg font-bold leading-none", isActive ? "text-amber-400" : "text-cyan-500")}>
                        {format(parseISO(a.start_time), "HH:mm")}
                      </p>
                      <p className={cn("text-[10px] mt-0.5", txtMuted)}>{duration}min</p>
                    </div>
                    <div className={cn("w-px h-9 shrink-0", isDark ? "bg-white/10" : "bg-gray-200")} />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold truncate leading-tight", txt)}>{a.patient_name}</p>
                      <p className={cn("text-xs truncate mt-0.5", txtMuted)}>
                        {a.procedure_name ?? "Consulta / Avaliação"}
                        {a.dentist_name ? ` · ${a.dentist_name}` : ""}
                        {a.room_name ? ` · ${a.room_name}` : ""}
                      </p>
                    </div>
                    {/* Status + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border hidden sm:block",
                        isDark ? cfg.dark : cfg.light)}>
                        {cfg.label}
                      </span>
                      <div className={cn("w-2 h-2 rounded-full sm:hidden", cfg.dot)} />
                      <ChevronRight className={cn("w-4 h-4", txtMuted)} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <h2 className={cn("font-semibold flex items-center gap-2", txtSoft)}>
            <Users className="w-4 h-4 text-violet-400" />
            Ações Rápidas
          </h2>
          <div className="space-y-2">
            {[
              { label: "Novo Paciente",    icon: Users,      color: "text-cyan-500",    path: "/dashboard/pacientes/novo" },
              { label: "Agendar Consulta", icon: Calendar,   color: "text-emerald-500", path: "/dashboard/agenda" },
              { label: "Ver Pacientes",    icon: Stethoscope, color: "text-violet-500", path: "/dashboard/pacientes" },
            ].map((item) => (
              <button key={item.label} onClick={() => router.push(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isDark ? "glass-card hover:text-white" : "bg-white border border-gray-100 shadow-sm hover:shadow-md",
                  txtSoft
                )}>
                <div className={cn("p-1.5 rounded-lg transition-colors", isDark ? "bg-white/5 group-hover:bg-white/10" : "bg-gray-100 group-hover:bg-gray-200")}>
                  <item.icon className={cn("w-4 h-4", item.color)} />
                </div>
                {item.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-all group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          {/* Progress card — clickable to show completed */}
          {stats.total > 0 && (
            <button onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
              className={cn(
                "relative overflow-hidden rounded-2xl p-5 w-full text-left border transition-all",
                isDark
                  ? "bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/10 hover:border-cyan-500/20"
                  : "bg-gradient-to-br from-cyan-50 to-violet-50 border-cyan-200/50 hover:border-cyan-300",
                filter === "completed" && (isDark ? "ring-1 ring-cyan-500/30" : "ring-1 ring-cyan-300")
              )}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                <p className={cn("text-sm", txtMuted)}>Progresso do dia</p>
                <span className={cn("text-xs ml-auto", txtMuted)}>{filter === "completed" ? "Ocultar ↑" : "Ver detalhes →"}</span>
              </div>
              <div className="flex items-end gap-2 mt-2">
                <span className={cn("text-4xl font-bold", txt)}>{stats.completed}</span>
                <span className={cn("pb-1.5 text-sm", txtMuted)}>/ {stats.total} consultas</span>
              </div>
              <div className={cn("w-full rounded-full h-2 mt-4 overflow-hidden", isDark ? "bg-white/5" : "bg-gray-200")}>
                <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full h-2 transition-all duration-700"
                  style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }} />
              </div>
              {/* Mini status breakdown */}
              <div className="flex gap-3 mt-3 text-[11px]">
                {stats.in_progress > 0 && <span className={isDark ? "text-amber-400" : "text-amber-600"}>● {stats.in_progress} em andamento</span>}
                {stats.pending > 0 && <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>● {stats.pending} agendadas</span>}
                {stats.no_show > 0 && <span className={isDark ? "text-red-400" : "text-red-500"}>● {stats.no_show} faltaram</span>}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Quick action modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className={cn("max-w-md rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
            <DialogHeader>
              <DialogTitle className={cn("flex items-center gap-3", isDark ? "text-white" : "text-gray-900")}>
                {selected.patient_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Info grid */}
              <div className={cn("grid grid-cols-2 gap-3 rounded-xl p-4 text-sm", isDark ? "bg-white/5" : "bg-gray-50")}>
                <Info label="Início"       value={format(parseISO(selected.start_time), "HH:mm")} isDark={isDark} />
                <Info label="Fim"          value={format(parseISO(selected.end_time), "HH:mm")} isDark={isDark} />
                <Info label="Procedimento" value={selected.procedure_name ?? "—"} isDark={isDark} />
                <Info label="Dentista"     value={selected.dentist_name ?? "—"} isDark={isDark} />
                <Info label="Sala"         value={selected.room_name ?? "—"} isDark={isDark} />
                <Info label="Status"       value={(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.completed).label} isDark={isDark} />
              </div>

              {/* Action buttons — primary actions */}
              <div className="grid grid-cols-2 gap-2">
                {(selected.status === "scheduled" || selected.status === "confirmed") && (
                  <>
                    <button onClick={() => updateStatus.mutate({ id: selected.id, status: "in_progress" })}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                      <Play className="w-4 h-4" /> Iniciar
                    </button>
                    <button onClick={() => updateStatus.mutate({ id: selected.id, status: "cancelled" })}
                      disabled={updateStatus.isPending}
                      className={cn("flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                        isDark ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50")}>
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </>
                )}
                {selected.status === "in_progress" && (
                  <>
                    <button onClick={() => updateStatus.mutate({ id: selected.id, status: "completed" })}
                      disabled={updateStatus.isPending}
                      className="col-span-2 flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20">
                      <StopCircle className="w-4 h-4" /> Finalizar consulta
                    </button>
                  </>
                )}
                {(selected.status === "cancelled" || selected.status === "no_show" || selected.status === "rescheduled") && (
                  <button
                    onClick={() => { router.push(`/dashboard/agenda?patientId=${selected.patient_id}&patientName=${encodeURIComponent(selected.patient_name ?? "")}`); setSelected(null); }}
                    className="col-span-2 flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20">
                    <RotateCcw className="w-4 h-4" /> Reagendar consulta
                  </button>
                )}
              </div>

              {/* Secondary actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { router.push(`/dashboard/pacientes/${selected.patient_id}`); setSelected(null); }}
                  className={cn("flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs border transition-colors",
                    isDark ? "border-white/10 text-white/50 hover:bg-white/5 hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700")}>
                  <Users className="w-4 h-4" /> Ver paciente
                </button>
                <button
                  onClick={() => { router.push(`/dashboard/prontuario/${selected.patient_id}`); setSelected(null); }}
                  className={cn("flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs border transition-colors",
                    isDark ? "border-white/10 text-white/50 hover:bg-white/5 hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700")}>
                  <FileText className="w-4 h-4" /> Prontuário
                </button>
                <button
                  onClick={() => { router.push(`/dashboard/agenda?patientId=${selected.patient_id}&patientName=${encodeURIComponent(selected.patient_name ?? "")}`); setSelected(null); }}
                  className={cn("flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs border transition-colors",
                    isDark ? "border-white/10 text-white/50 hover:bg-white/5 hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700")}>
                  <RotateCcw className="w-4 h-4" /> Reagendar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Info({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", isDark ? "text-white/25" : "text-gray-400")}>{label}</p>
      <p className={cn("font-medium mt-0.5", isDark ? "text-white/80" : "text-gray-700")}>{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, gradient, isDark, onClick, active }: {
  icon: React.ReactNode; label: string; value: number; gradient: string; isDark: boolean;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        "glass-card rounded-2xl p-5 text-left transition-all duration-300 w-full",
        onClick && "hover:scale-[1.02]",
        active && (isDark ? "ring-1 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]" : "ring-1 ring-cyan-400 shadow-cyan-100")
      )}>
      <div className="flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <p className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>{value}</p>
          <p className={cn("text-xs leading-tight mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{label}</p>
        </div>
      </div>
    </button>
  );
}
