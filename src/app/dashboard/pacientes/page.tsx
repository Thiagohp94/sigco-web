"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { PaginatedPatients } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains("light")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data, isLoading } = useQuery<PaginatedPatients>({
    queryKey: ["patients", search, page],
    queryFn: () =>
      api.get("/patients", { params: { search: search || undefined, page, page_size: PAGE_SIZE } })
        .then((r) => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
  }

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const border = isDark ? "border-white/5" : "border-gray-100";
  const inputCls = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/20"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-3xl font-bold flex items-center gap-3", txt)}>
          <Users className="w-7 h-7 text-cyan-400" />
          Pacientes
        </h1>
        <Button
          onClick={() => router.push("/dashboard/pacientes/novo")}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-0 rounded-xl shadow-lg shadow-cyan-500/20 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      <div className={cn("glass-card rounded-2xl overflow-hidden")}>
        {/* Search */}
        <div className={cn("p-4 border-b", border)}>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", txtMuted)} />
              <Input
                className={cn("pl-9 rounded-xl h-11", inputCls)}
                placeholder="Buscar por nome, CPF, telefone ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline"
              className={cn("rounded-xl h-11", isDark ? "border-white/10 text-white/50 hover:text-white hover:bg-white/5" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50")}>
              Buscar
            </Button>
          </form>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn("border-b", border)}>
                    {["Nome", "CPF", "Telefone", "E-mail", "Nascimento", "Status"].map((h) => (
                      <th key={h} className={cn("text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider", txtMuted)}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/[0.03]" : "divide-gray-50")}>
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className={cn("text-center py-16", txtMuted)}>
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Nenhum paciente encontrado.
                      </td>
                    </tr>
                  )}
                  {data?.items.map((p) => (
                    <tr
                      key={p.id}
                      className={cn("cursor-pointer transition-colors group", isDark ? "hover:bg-white/[0.03]" : "hover:bg-cyan-50/30")}
                      onClick={() => router.push(`/dashboard/pacientes/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-[11px] font-bold transition-colors",
                            isDark ? "text-white/60 group-hover:text-white/80" : "text-gray-600 group-hover:text-gray-800"
                          )}>
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className={cn("font-medium transition-colors", isDark ? "text-white/80 group-hover:text-white" : "text-gray-800 group-hover:text-gray-900")}>{p.name}</span>
                        </div>
                      </td>
                      <td className={cn("px-4 py-3 text-sm font-mono", txtSoft)}>{p.cpf ?? "—"}</td>
                      <td className={cn("px-4 py-3 text-sm", txtSoft)}>{p.phone_primary ?? p.whatsapp ?? "—"}</td>
                      <td className={cn("px-4 py-3 text-sm", txtSoft)}>{p.email ?? "—"}</td>
                      <td className={cn("px-4 py-3 text-sm", txtSoft)}>
                        {p.birth_date
                          ? format(new Date(p.birth_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border",
                          p.is_active
                            ? isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isDark ? "bg-white/5 text-white/30 border-white/5" : "bg-gray-100 text-gray-400 border-gray-200"
                        )}>
                          {p.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.total > PAGE_SIZE && (
              <div className={cn("flex items-center justify-between px-4 py-3 border-t", border)}>
                <p className={cn("text-sm", txtMuted)}>
                  {data.total} pacientes · Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className={cn("rounded-lg disabled:opacity-20", isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className={cn("rounded-lg disabled:opacity-20", isDark ? "border-white/10 text-white/40 hover:bg-white/5" : "border-gray-200 text-gray-400 hover:bg-gray-50")}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
