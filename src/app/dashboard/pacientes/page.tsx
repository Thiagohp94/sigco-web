"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { PaginatedPatients } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-cyan-400" />
          Pacientes
        </h1>
        <Button
          onClick={() => router.push("/dashboard/pacientes/novo")}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-0 rounded-xl shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-white/5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-11"
                placeholder="Buscar por nome, CPF, telefone ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="border-white/10 text-white/50 hover:text-white hover:bg-white/5 rounded-xl h-11">
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
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/20 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/20 uppercase tracking-wider">CPF</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/20 uppercase tracking-wider">Telefone</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/20 uppercase tracking-wider">E-mail</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/20 uppercase tracking-wider">Nascimento</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/20 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-white/20 py-16">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Nenhum paciente encontrado.
                      </td>
                    </tr>
                  )}
                  {data?.items.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer transition-colors hover:bg-white/[0.03] group"
                      onClick={() => router.push(`/dashboard/pacientes/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-[11px] font-bold text-white/60 group-hover:text-white/80 transition-colors">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-white/80 group-hover:text-white transition-colors">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/40 font-mono">{p.cpf ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-white/40">{p.phone_primary ?? p.whatsapp ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-white/40">{p.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-white/40">
                        {p.birth_date
                          ? format(new Date(p.birth_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          p.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-white/5 text-white/30 border border-white/5"
                        }`}>
                          {p.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <p className="text-sm text-white/20">
                  {data.total} pacientes · Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="border-white/10 text-white/40 hover:bg-white/5 rounded-lg disabled:opacity-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="border-white/10 text-white/40 hover:bg-white/5 rounded-lg disabled:opacity-20"
                  >
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
