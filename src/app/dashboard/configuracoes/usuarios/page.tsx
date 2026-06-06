"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn, apiErrorMessage } from "@/lib/utils";
import { Plus, Users, Edit2, UserX, UserCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLE_CONFIG: Record<string, { label: string; dark: string; light: string }> = {
  admin:      { label: "Administrador",    dark: "bg-violet-500/15 text-violet-300 border-violet-500/20",   light: "bg-violet-50 text-violet-700 border-violet-200" },
  dentist:    { label: "Dentista",         dark: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",         light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  secretary:  { label: "Secretária",      dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  assistant:  { label: "Auxiliar",         dark: "bg-amber-500/15 text-amber-300 border-amber-500/20",      light: "bg-amber-50 text-amber-700 border-amber-200" },
  financial:  { label: "Financeiro",       dark: "bg-orange-500/15 text-orange-300 border-orange-500/20",   light: "bg-orange-50 text-orange-700 border-orange-200" },
  patient:    { label: "Paciente",         dark: "bg-white/5 text-white/40 border-white/10",                light: "bg-gray-50 text-gray-500 border-gray-200" },
};

const EMPTY_FORM = { name: "", email: "", cpf: "", role: "secretary", password: "" };

export default function UsuariosPage() {
  const qc = useQueryClient();
  const isDark = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const { data: me } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingId) {
        const payload: any = { name: form.name, email: form.email, role: form.role, cpf: form.cpf || undefined };
        return api.patch(`/users/${editingId}`, payload).then((r) => r.data);
      }
      return api.post("/users", { ...form, cpf: form.cpf || undefined }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(editingId ? "Usuário atualizado!" : "Usuário criado!");
      closeForm();
    },
    onError: (e: any) => toast.error(apiErrorMessage(e, "Erro ao salvar usuário")),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.delete(`/users/${id}`) : api.patch(`/users/${id}`, { is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("Status atualizado."); },
    onError: () => toast.error("Erro ao atualizar"),
  });

  function openEdit(u: any) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, cpf: u.cpf ?? "", role: u.role, password: "" });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-600";
  const txtMuted = isDark ? "text-white/30" : "text-gray-400";
  const cardBase = cn("rounded-xl border p-4 flex items-center gap-4 transition-all",
    isDark ? "glass-card border-white/5" : "bg-white border-gray-100 shadow-sm");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");
  const labelCls = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");
  const selectStyle = isDark ? { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.1)" } : {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", txt)}>
          <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Users className="w-4 h-4 text-white" />
          </div>
          Usuários da Clínica
        </h1>
        <Button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="bg-gradient-to-r from-violet-500 to-violet-600 border-0 rounded-xl text-white shadow-lg shadow-violet-500/20">
          <Plus className="w-4 h-4 mr-1.5" /> Novo usuário
        </Button>
      </div>

      {/* Stats */}
      <div className={cn("grid grid-cols-3 gap-3")}>
        {[
          { label: "Total", value: users.length, dark: "text-white", light: "text-gray-800" },
          { label: "Ativos", value: users.filter((u: any) => u.is_active).length, dark: "text-emerald-400", light: "text-emerald-600" },
          { label: "Dentistas", value: users.filter((u: any) => u.role === "dentist").length, dark: "text-cyan-400", light: "text-cyan-600" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border p-4 text-center", isDark ? "glass-card border-white/5" : "bg-white border-gray-100 shadow-sm")}>
            <p className={cn("text-2xl font-bold", isDark ? s.dark : s.light)}>{s.value}</p>
            <p className={cn("text-xs", txtMuted)}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className={cn("rounded-xl h-16 animate-pulse", isDark ? "bg-white/5" : "bg-gray-100")} />)}</div>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => {
            const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.patient;
            const isMe = u.id === me?.id;
            return (
              <div key={u.id} className={cn(cardBase, !u.is_active && "opacity-50")}>
                {/* Avatar */}
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg",
                  u.is_active ? "bg-gradient-to-br from-violet-500 to-cyan-500" : "bg-gray-400")}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-semibold truncate", txt)}>{u.name}</p>
                    {isMe && <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", isDark ? "border-cyan-500/20 text-cyan-400" : "border-cyan-200 text-cyan-600")}>Você</span>}
                    {!u.is_active && <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", isDark ? "border-red-500/20 text-red-400" : "border-red-200 text-red-500")}>Inativo</span>}
                  </div>
                  <p className={cn("text-xs truncate", txtMuted)}>{u.email}</p>
                </div>
                {/* Role badge */}
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 hidden sm:block", isDark ? cfg.dark : cfg.light)}>
                  {cfg.label}
                </span>
                {/* Joined */}
                <p className={cn("text-xs shrink-0 hidden md:block", txtMuted)}>
                  {format(parseISO(u.created_at), "dd/MM/yy", { locale: ptBR })}
                </p>
                {/* Actions */}
                {!isMe && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(u)}
                      className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-violet-400 hover:bg-violet-500/10" : "text-gray-300 hover:text-violet-600 hover:bg-violet-50")}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleActiveMutation.mutate({ id: u.id, active: u.is_active })}
                      title={u.is_active ? "Desativar" : "Reativar"}
                      className={cn("p-1.5 rounded-lg transition-all",
                        u.is_active
                          ? isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                          : isDark ? "text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-gray-300 hover:text-emerald-500 hover:bg-emerald-50"
                      )}>
                      {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className={cn("max-w-md rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              {editingId ? "Editar usuário" : "Novo usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className={labelCls}>Nome completo *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dr. João Silva" className={inputCls} /></div>
            <div className="space-y-1.5"><Label className={labelCls}>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="joao@clinica.com" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className={labelCls}>CPF</Label>
                <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" className={inputCls} /></div>
              <div className="space-y-1.5"><Label className={labelCls}>Perfil *</Label>
                <select value={form.role} onChange={(e) => set("role", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={selectStyle}>
                  {Object.entries(ROLE_CONFIG).filter(([k]) => k !== "patient").map(([k, v]) => (
                    <option key={k} value={k} className={isDark ? "bg-[#1a1e2e]" : ""}>{v.label}</option>
                  ))}
                </select></div>
            </div>
            {!editingId && (
              <div className="space-y-1.5"><Label className={labelCls}>Senha *</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" className={inputCls} /></div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm} className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500")}>Cancelar</Button>
              <Button disabled={saveMutation.isPending || !form.name || !form.email}
                onClick={() => saveMutation.mutate()}
                className="bg-gradient-to-r from-violet-500 to-violet-600 border-0 rounded-xl text-white">
                {saveMutation.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar usuário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
