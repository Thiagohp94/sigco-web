"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, User, Phone, MapPin, HeartPulse } from "lucide-react";
import { toast } from "sonner";

export default function NovoPacientePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", cpf: "", rg: "", birth_date: "", gender: "", marital_status: "",
    zip_code: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    phone_primary: "", phone_secondary: "", whatsapp: "", email: "",
    allergies: "", medications: "", chronic_diseases: "", medical_history: "", observations: "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      return api.post("/patients", payload).then((r) => r.data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente cadastrado com sucesso!");
      router.push(`/dashboard/pacientes/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao cadastrar paciente"),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value),
  });

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <UserPlus className="w-7 h-7 text-cyan-400" />
            Novo Paciente
          </h1>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Dados pessoais */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-white/80">Dados Pessoais</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-white/50 text-sm">Nome completo *</Label>
              <Input placeholder="João da Silva" {...f("name")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">CPF</Label>
              <Input placeholder="000.000.000-00" {...f("cpf")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">RG</Label>
              <Input placeholder="00.000.000-0" {...f("rg")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Data de nascimento</Label>
              <Input type="date" {...f("birth_date")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Sexo</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent className="glass-strong border-white/10 text-white">
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
            <Phone className="w-4 h-4 text-violet-400" />
            <h2 className="font-semibold text-white/80">Contato</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Telefone principal</Label>
              <Input placeholder="(11) 99999-9999" {...f("phone_primary")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">WhatsApp</Label>
              <Input placeholder="(11) 99999-9999" {...f("whatsapp")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Telefone secundário</Label>
              <Input placeholder="(11) 3333-3333" {...f("phone_secondary")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">E-mail</Label>
              <Input type="email" placeholder="joao@email.com" {...f("email")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-white/80">Endereço</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">CEP</Label>
              <Input placeholder="00000-000" {...f("zip_code")} className={inputClass} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-white/50 text-sm">Rua</Label>
              <Input {...f("street")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Número</Label>
              <Input {...f("number")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Complemento</Label>
              <Input {...f("complement")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Bairro</Label>
              <Input {...f("neighborhood")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Cidade</Label>
              <Input {...f("city")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Estado</Label>
              <Input maxLength={2} placeholder="SP" {...f("state")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Histórico médico */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
            <HeartPulse className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-white/80">Histórico Médico</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Alergias</Label>
              <Textarea rows={2} placeholder="Ex: penicilina, látex..." {...f("allergies")} className={`${inputClass} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Medicamentos em uso</Label>
              <Textarea rows={2} placeholder="Ex: aspirina 100mg..." {...f("medications")} className={`${inputClass} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Doenças crônicas</Label>
              <Textarea rows={2} placeholder="Ex: diabetes, hipertensão..." {...f("chronic_diseases")} className={`${inputClass} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Histórico clínico</Label>
              <Textarea rows={2} {...f("medical_history")} className={`${inputClass} resize-none`} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-white/50 text-sm">Observações gerais</Label>
              <Textarea rows={2} {...f("observations")} className={`${inputClass} resize-none`} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => router.back()} className="border-white/10 text-white/50 hover:bg-white/5 rounded-xl">
          Cancelar
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-0 rounded-xl px-6 shadow-lg shadow-cyan-500/20"
        >
          {mutation.isPending ? "Salvando..." : "Cadastrar Paciente"}
        </Button>
      </div>
    </div>
  );
}
