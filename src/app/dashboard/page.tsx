"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, UserX, Users, ArrowRight, Stethoscope, Sparkles, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment } from "@/types";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; dark: string; light: string }> = {
  scheduled:   { label: "Agendada",       dark: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20",           light: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  confirmed:   { label: "Confirmada",     dark: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",  light: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  in_progress: { label: "Em atendimento", dark: "bg-amber-500/15 text-amber-300 border border-amber-500/20",        light: "bg-amber-50 text-amber-700 border border-amber-200" },
  completed:   { label: "Finalizada",     dark: "bg-white/5 text-white/40 border border-white/5",                   light: "bg-gray-100 text-gray-500 border border-gray-200" },
  cancelled:   { label: "Cancelada",      dark: "bg-red-500/10 text-red-400/60 border border-red-500/10",           light: "bg-red-50 text-red-500 border border-red-200" },
  no_show:     { label: "Não compareceu", dark: "bg-orange-500/10 text-orange-400 border border-orange-500/10",     light: "bg-orange-50 text-orange-600 border border-orange-200" },
  rescheduled: { label: "Reagendada",     dark: "bg-violet-500/15 text-violet-300 border border-violet-500/20",     light: "bg-violet-50 text-violet-700 border border-violet-200" },
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const today = new Date();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", "today"],
    queryFn: () =>
      api.get("/appointments", {
        params: { date_from: startOfDay(today).toISOString(), date_to: endOfDay(today).toISOString() },
      }).then((r) => r.data),
  });

  const stats = {
    total:     appointments.length,
    pending:   appointments.filter((a) => a.status === "scheduled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    no_show:   appointments.filter((a) => a.status === "no_show").length,
  };

  const upcoming = appointments
    .filter((a) => ["scheduled", "confirmed", "in_progress"].includes(a.status))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 6);

  const hour = today.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";

  return (
    <div className="space-y-8">
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Consultas hoje" value={stats.total} gradient="from-cyan-500 to-cyan-600" isDark={isDark} />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Agendadas" value={stats.pending} gradient="from-amber-500 to-orange-500" isDark={isDark} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Finalizadas" value={stats.completed} gradient="from-emerald-500 to-emerald-600" isDark={isDark} />
        <StatCard icon={<UserX className="w-5 h-5" />} label="Não compareceram" value={stats.no_show} gradient="from-red-500 to-rose-500" isDark={isDark} />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn("font-semibold flex items-center gap-2", txtSoft)}>
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              Próximas Consultas
            </h2>
            <button onClick={() => router.push("/dashboard/agenda")}
              className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1 group">
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
            <div className={cn("glass-card rounded-2xl py-14 text-center")}>
              <Calendar className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-white/10" : "text-gray-300")} />
              <p className={txtMuted}>Nenhuma consulta pendente para hoje.</p>
              <Button variant="outline" size="sm" className="mt-4 border-cyan-500/20 text-cyan-500 hover:bg-cyan-500/10 rounded-xl"
                onClick={() => router.push("/dashboard/agenda")}>
                Agendar consulta
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.completed;
                return (
                  <div key={a.id} className="glass-card rounded-xl py-3 px-4 flex items-center gap-4">
                    <div className="text-center min-w-[56px]">
                      <p className="text-xl font-bold text-cyan-500 leading-none">
                        {format(parseISO(a.start_time), "HH:mm")}
                      </p>
                      <p className={cn("text-[10px] mt-0.5", txtMuted)}>
                        até {format(parseISO(a.end_time), "HH:mm")}
                      </p>
                    </div>
                    <div className={cn("w-px h-10", isDark ? "bg-white/10" : "bg-gray-200")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold truncate", txt)}>{a.patient_name}</p>
                      <p className={cn("text-sm truncate", txtMuted)}>
                        {a.procedure_name ?? "Consulta"} · {a.dentist_name}
                        {a.room_name ? ` · ${a.room_name}` : ""}
                      </p>
                    </div>
                    <span className={cn("text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap", isDark ? cfg.dark : cfg.light)}>
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
          <h2 className={cn("font-semibold flex items-center gap-2", txtSoft)}>
            <Users className="w-4 h-4 text-violet-400" />
            Ações Rápidas
          </h2>
          <div className="space-y-2">
            {[
              { label: "Novo Paciente", icon: Users, color: "text-cyan-500", path: "/dashboard/pacientes/novo" },
              { label: "Agendar Consulta", icon: Calendar, color: "text-emerald-500", path: "/dashboard/agenda" },
              { label: "Ver Pacientes", icon: Stethoscope, color: "text-violet-500", path: "/dashboard/pacientes" },
            ].map((item) => (
              <button key={item.label} onClick={() => router.push(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 h-12 rounded-xl glass-card text-sm font-medium transition-all duration-200 group",
                  txtSoft, isDark ? "hover:text-white" : "hover:text-gray-900"
                )}>
                <div className={cn("p-1.5 rounded-lg transition-colors", isDark ? "bg-white/5 group-hover:bg-white/10" : "bg-gray-100 group-hover:bg-gray-200")}>
                  <item.icon className={cn("w-4 h-4", item.color)} />
                </div>
                {item.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-all group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          {stats.total > 0 && (
            <div className={cn(
              "relative overflow-hidden rounded-2xl p-5 border",
              isDark ? "bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/10" : "bg-gradient-to-br from-cyan-50 to-violet-50 border-cyan-200/50"
            )}>
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  <p className={cn("text-sm", txtMuted)}>Progresso do dia</p>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <span className={cn("text-4xl font-bold", txt)}>{stats.completed}</span>
                  <span className={cn("pb-1.5 text-sm", txtMuted)}>/ {stats.total} consultas</span>
                </div>
                <div className={cn("w-full rounded-full h-2 mt-4 overflow-hidden", isDark ? "bg-white/5" : "bg-gray-200")}>
                  <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full h-2 transition-all duration-700"
                    style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, gradient, isDark }: {
  icon: React.ReactNode; label: string; value: number; gradient: string; isDark: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 group hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
          <div className="text-white">{icon}</div>
        </div>
        <div>
          <p className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>{value}</p>
          <p className={cn("text-xs leading-tight mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{label}</p>
        </div>
      </div>
    </div>
  );
}
