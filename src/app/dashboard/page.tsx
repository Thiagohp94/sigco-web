"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, UserX, Users, ArrowRight, Stethoscope, Sparkles, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment } from "@/types";
import { useAuthStore } from "@/store/auth";

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  scheduled:   { label: "Agendada",       color: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20",      glow: "" },
  confirmed:   { label: "Confirmada",     color: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20", glow: "" },
  in_progress: { label: "Em atendimento", color: "bg-amber-500/15 text-amber-300 border border-amber-500/20",     glow: "shadow-[0_0_8px_rgba(251,191,36,0.15)]" },
  completed:   { label: "Finalizada",     color: "bg-white/5 text-white/40 border border-white/5",                glow: "" },
  cancelled:   { label: "Cancelada",      color: "bg-red-500/10 text-red-400/60 border border-red-500/10",        glow: "" },
  no_show:     { label: "Não compareceu", color: "bg-orange-500/10 text-orange-400 border border-orange-500/10",  glow: "" },
  rescheduled: { label: "Reagendada",     color: "bg-violet-500/15 text-violet-300 border border-violet-500/20",  glow: "" },
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const today = new Date();

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", "today"],
    queryFn: () =>
      api.get("/appointments", {
        params: {
          date_from: startOfDay(today).toISOString(),
          date_to: endOfDay(today).toISOString(),
        },
      }).then((r) => r.data),
  });

  const stats = {
    total:      appointments.length,
    pending:    appointments.filter((a) => a.status === "scheduled").length,
    confirmed:  appointments.filter((a) => a.status === "confirmed" || a.status === "in_progress").length,
    completed:  appointments.filter((a) => a.status === "completed").length,
    no_show:    appointments.filter((a) => a.status === "no_show").length,
  };

  const upcoming = appointments
    .filter((a) => ["scheduled", "confirmed", "in_progress"].includes(a.status))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 6);

  const hour = today.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            {greeting}, {user?.name.split(" ")[0]}
            <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse-glow" />
          </h1>
          <p className="text-white/30 mt-1 capitalize">
            {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/agenda")}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white border-0 rounded-xl h-11 px-5 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Abrir Agenda
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Consultas hoje"
          value={stats.total}
          gradient="from-cyan-500 to-cyan-600"
          glow="shadow-cyan-500/15"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Agendadas"
          value={stats.pending}
          gradient="from-amber-500 to-orange-500"
          glow="shadow-amber-500/15"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Finalizadas"
          value={stats.completed}
          gradient="from-emerald-500 to-emerald-600"
          glow="shadow-emerald-500/15"
        />
        <StatCard
          icon={<UserX className="w-5 h-5" />}
          label="Não compareceram"
          value={stats.no_show}
          gradient="from-red-500 to-rose-500"
          glow="shadow-red-500/15"
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming appointments */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white/80 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              Próximas Consultas
            </h2>
            <button
              onClick={() => router.push("/dashboard/agenda")}
              className="text-sm text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-1 group"
            >
              Ver agenda <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
              </div>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="glass-card rounded-2xl py-14 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30">Nenhuma consulta pendente para hoje.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 rounded-xl"
                onClick={() => router.push("/dashboard/agenda")}
              >
                Agendar consulta
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => {
                const cfg = STATUS_CONFIG[a.status] ?? { label: a.status, color: "bg-white/5 text-white/40", glow: "" };
                return (
                  <div key={a.id} className={`glass-card rounded-xl py-3 px-4 flex items-center gap-4 ${cfg.glow}`}>
                    <div className="text-center min-w-[56px]">
                      <p className="text-xl font-bold text-cyan-400 leading-none text-glow-cyan">
                        {format(parseISO(a.start_time), "HH:mm")}
                      </p>
                      <p className="text-[10px] text-white/20 mt-0.5">
                        até {format(parseISO(a.end_time), "HH:mm")}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-gradient-to-b from-cyan-500/30 via-cyan-500/10 to-transparent" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/90 truncate">{a.patient_name}</p>
                      <p className="text-sm text-white/30 truncate">
                        {a.procedure_name ?? "Consulta"} · {a.dentist_name}
                        {a.room_name ? ` · ${a.room_name}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white/80 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            Ações Rápidas
          </h2>
          <div className="space-y-2">
            {[
              { label: "Novo Paciente", icon: Users, color: "text-cyan-400", border: "hover:border-cyan-500/20", path: "/dashboard/pacientes/novo" },
              { label: "Agendar Consulta", icon: Calendar, color: "text-emerald-400", border: "hover:border-emerald-500/20", path: "/dashboard/agenda" },
              { label: "Ver Pacientes", icon: Stethoscope, color: "text-violet-400", border: "hover:border-violet-500/20", path: "/dashboard/pacientes" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 h-12 rounded-xl glass-card text-sm font-medium text-white/60 hover:text-white/90 transition-all duration-200 group ${item.border}`}
              >
                <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                {item.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-all group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          {/* Progress card */}
          {stats.total > 0 && (
            <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <p className="text-white/40 text-sm">Progresso do dia</p>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-bold text-white text-glow-cyan">{stats.completed}</span>
                  <span className="text-white/30 pb-1.5 text-sm">/ {stats.total} consultas</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full h-2 transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                    style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, gradient, glow }: {
  icon: React.ReactNode; label: string; value: number; gradient: string; glow: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-5 group hover:scale-[1.02] transition-all duration-300 hover:shadow-lg ${glow}`}>
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${glow}`}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/30 leading-tight mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}
