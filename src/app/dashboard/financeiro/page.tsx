"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle,
  ChevronLeft, ChevronRight, ArrowRight, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinancialSummary {
  period_label: string;
  total_receivable: number;
  total_received: number;
  total_overdue: number;
  total_payable: number;
  total_paid_expenses: number;
  net_result: number;
  receivable_count: number;
  payable_count: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function FinanceiroPage() {
  const router = useRouter();
  const isDark = useTheme();
  const [refDate, setRefDate] = useState(new Date());

  const dateFrom = startOfMonth(refDate);
  const dateTo = endOfMonth(refDate);

  const { data: summary, isLoading } = useQuery<FinancialSummary>({
    queryKey: ["financial-summary", dateFrom.toISOString()],
    queryFn: () => api.get("/financial/summary", {
      params: {
        date_from: format(dateFrom, "yyyy-MM-dd"),
        date_to: format(dateTo, "yyyy-MM-dd"),
      }
    }).then((r) => r.data),
  });

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const card = cn("rounded-2xl border p-5", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm");

  const netPositive = (summary?.net_result ?? 0) >= 0;
  const collectionRate = summary && summary.total_receivable > 0
    ? Math.round((summary.total_received / summary.total_receivable) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", txt)}>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          Financeiro
        </h1>
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => setRefDate(subMonths(refDate, 1))}
            className={cn("p-2 rounded-xl border transition-colors", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={cn("font-semibold capitalize min-w-[140px] text-center", txtSoft)}>
            {format(refDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setRefDate(addMonths(refDate, 1))}
            className={cn("p-2 rounded-xl border transition-colors", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className={cn("rounded-2xl h-28 animate-pulse", isDark ? "bg-white/5" : "bg-gray-100")} />)}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="A Receber" value={fmt(summary?.total_receivable ?? 0)}
              sub={`${summary?.receivable_count ?? 0} cobranças`}
              gradient="from-cyan-500 to-cyan-600" icon={<TrendingUp className="w-5 h-5" />}
              isDark={isDark}
            />
            <KPICard
              label="Recebido" value={fmt(summary?.total_received ?? 0)}
              sub={`${collectionRate}% de taxa`}
              gradient="from-emerald-500 to-emerald-600" icon={<DollarSign className="w-5 h-5" />}
              isDark={isDark}
            />
            <KPICard
              label="Em Atraso" value={fmt(summary?.total_overdue ?? 0)}
              sub="vencidas e não pagas"
              gradient="from-red-500 to-rose-500" icon={<AlertCircle className="w-5 h-5" />}
              isDark={isDark}
              alert={!!summary?.total_overdue}
            />
            <KPICard
              label="Despesas" value={fmt(summary?.total_paid_expenses ?? 0)}
              sub={`de ${fmt(summary?.total_payable ?? 0)} previsto`}
              gradient="from-amber-500 to-orange-500" icon={<TrendingDown className="w-5 h-5" />}
              isDark={isDark}
            />
          </div>

          {/* Net result */}
          <div className={cn(
            "rounded-2xl p-6 border",
            netPositive
              ? isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
              : isDark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200"
          )}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className={cn("text-sm font-medium mb-1", txtMuted)}>Resultado líquido do período</p>
                <p className={cn("text-4xl font-bold", netPositive ? "text-emerald-400" : "text-red-400")}>
                  {fmt(summary?.net_result ?? 0)}
                </p>
                <p className={cn("text-sm mt-1", txtMuted)}>
                  {fmt(summary?.total_received ?? 0)} recebido − {fmt(summary?.total_paid_expenses ?? 0)} pago em despesas
                </p>
              </div>
              {/* Progress bar */}
              <div className="min-w-[200px] flex-1 max-w-xs">
                <div className="flex justify-between text-xs mb-1">
                  <span className={cn(isDark ? "text-emerald-400/70" : "text-emerald-600")}>Recebido</span>
                  <span className={cn(isDark ? "text-amber-400/70" : "text-amber-600")}>Despesas</span>
                </div>
                <div className={cn("w-full h-3 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-gray-200")}>
                  <div className="flex h-full">
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 h-full"
                      style={{ width: `${summary && summary.total_receivable > 0 ? Math.min(100, (summary.total_received / summary.total_receivable) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick access */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn("font-semibold flex items-center gap-2", txtSoft)}>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Contas a Receber
                </h2>
                <button onClick={() => router.push("/dashboard/financeiro/receber")}
                  className="text-sm text-cyan-500 hover:text-cyan-400 flex items-center gap-1 group transition-colors">
                  Ver todas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={txtMuted}>Pendentes</span>
                  <span className={cn("font-medium", isDark ? "text-cyan-300" : "text-cyan-700")}>
                    {fmt((summary?.total_receivable ?? 0) - (summary?.total_received ?? 0) - (summary?.total_overdue ?? 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={txtMuted}>Em atraso</span>
                  <span className={cn("font-medium", summary?.total_overdue ? "text-red-400" : txtMuted)}>
                    {fmt(summary?.total_overdue ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={txtMuted}>Recebido</span>
                  <span className={cn("font-medium text-emerald-400")}>{fmt(summary?.total_received ?? 0)}</span>
                </div>
              </div>
              <Button size="sm" onClick={() => router.push("/dashboard/financeiro/receber")}
                className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-cyan-600 border-0 rounded-xl text-white text-sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova cobrança
              </Button>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn("font-semibold flex items-center gap-2", txtSoft)}>
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  Contas a Pagar
                </h2>
                <button onClick={() => router.push("/dashboard/financeiro/pagar")}
                  className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1 group transition-colors">
                  Ver todas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={txtMuted}>Previsto</span>
                  <span className={cn("font-medium", isDark ? "text-amber-300" : "text-amber-700")}>
                    {fmt(summary?.total_payable ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={txtMuted}>Pago</span>
                  <span className={cn("font-medium text-emerald-400")}>{fmt(summary?.total_paid_expenses ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={txtMuted}>Cobranças</span>
                  <span className={txtSoft}>{summary?.payable_count ?? 0} lançamentos</span>
                </div>
              </div>
              <Button size="sm" onClick={() => router.push("/dashboard/financeiro/pagar")}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 border-0 rounded-xl text-white text-sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova despesa
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPICard({ label, value, sub, gradient, icon, isDark, alert }: {
  label: string; value: string; sub: string; gradient: string;
  icon: React.ReactNode; isDark: boolean; alert?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl p-5 border transition-all",
      isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm",
      alert && (isDark ? "border-red-500/20" : "border-red-200")
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
          <div className="text-white">{icon}</div>
        </div>
        <span className={cn("text-xs font-medium uppercase tracking-wide", isDark ? "text-white/30" : "text-gray-400")}>{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{value}</p>
      <p className={cn("text-xs mt-1", isDark ? "text-white/25" : "text-gray-400")}>{sub}</p>
    </div>
  );
}
