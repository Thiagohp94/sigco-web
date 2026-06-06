"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { cn, apiErrorMessage } from "@/lib/utils";
import { Settings, Building2, Phone, Mail, FileText, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ClinicaPage() {
  const qc = useQueryClient();
  const isDark = useTheme();
  const [form, setForm] = useState({ name: "", cnpj: "", phone: "", email: "", address: "" });
  const [loaded, setLoaded] = useState(false);

  const { data: clinic, isLoading } = useQuery<any>({
    queryKey: ["clinic"],
    queryFn: () => api.get("/users/clinic/me").then((r) => r.data),
  });

  useEffect(() => {
    if (clinic && !loaded) {
      setForm({
        name: clinic.name ?? "",
        cnpj: clinic.cnpj ?? "",
        phone: clinic.phone ?? "",
        email: clinic.email ?? "",
        address: clinic.address ?? "",
      });
      setLoaded(true);
    }
  }, [clinic, loaded]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch("/users/clinic/me", {
      ...form,
      cnpj: form.cnpj || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic"] });
      toast.success("Dados da clínica atualizados!");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e, "Erro ao salvar dados da clínica")),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-700";
  const sectionCard = cn("rounded-2xl overflow-hidden border", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm");
  const sectionHeader = cn("flex items-center gap-2 px-6 py-4 border-b", isDark ? "border-white/5" : "border-gray-100");
  const sectionTitle = cn("font-semibold text-sm", isDark ? "text-white/80" : "text-gray-700");
  const inputClass = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400");
  const labelClass = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");

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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className={cn("text-2xl font-bold flex items-center gap-3", txt)}>
        <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Settings className="w-4 h-4 text-white" />
        </div>
        Dados da Clínica
      </h1>

      <div className="space-y-5">
        {/* Identificação */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h2 className={sectionTitle}>Identificação</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Nome da clínica *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Clínica Odontológica..." className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <Phone className="w-4 h-4 text-violet-400" />
            <h2 className={sectionTitle}>Contato</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 3000-0000" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contato@clinica.com" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h2 className={sectionTitle}>Endereço</h2>
          </div>
          <div className="p-6 space-y-1.5">
            <Label className={labelClass}>Endereço completo</Label>
            <Textarea rows={3} value={form.address} onChange={(e) => set("address", e.target.value)}
              placeholder="Rua, número, bairro, cidade - estado" className={cn(inputClass, "resize-none")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-0 rounded-xl px-6 shadow-lg shadow-cyan-500/20 text-white">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
