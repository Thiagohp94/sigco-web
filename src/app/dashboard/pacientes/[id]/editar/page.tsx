"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCog, User, Phone, MapPin, HeartPulse, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface EmergencyContact {
  id?: string;
  name: string;
  contact_relationship: string;
  phone: string;
  whatsapp: string;
}

const EMPTY_CONTACT: EmergencyContact = { name: "", contact_relationship: "", phone: "", whatsapp: "" };

export default function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const isDark = useTheme();

  const [form, setForm] = useState({
    name: "", cpf: "", rg: "", birth_date: "", gender: "", marital_status: "",
    zip_code: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    phone_primary: "", phone_secondary: "", whatsapp: "", email: "",
    allergies: "", medications: "", chronic_diseases: "", medical_history: "", observations: "",
  });
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => api.get(`/patients/${id}`).then((r) => r.data),
  });

  // Pre-populate form when patient data arrives
  useEffect(() => {
    if (patient && !loaded) {
      setForm({
        name: patient.name ?? "",
        cpf: patient.cpf ?? "",
        rg: patient.rg ?? "",
        birth_date: patient.birth_date ?? "",
        gender: patient.gender ?? "",
        marital_status: patient.marital_status ?? "",
        zip_code: patient.zip_code ?? "",
        street: patient.street ?? "",
        number: patient.number ?? "",
        complement: patient.complement ?? "",
        neighborhood: patient.neighborhood ?? "",
        city: patient.city ?? "",
        state: patient.state ?? "",
        phone_primary: patient.phone_primary ?? "",
        phone_secondary: patient.phone_secondary ?? "",
        whatsapp: patient.whatsapp ?? "",
        email: patient.email ?? "",
        allergies: patient.allergies ?? "",
        medications: patient.medications ?? "",
        chronic_diseases: patient.chronic_diseases ?? "",
        medical_history: patient.medical_history ?? "",
        observations: patient.observations ?? "",
      });
      setContacts(
        (patient.contacts ?? []).map((c: any) => ({
          id: c.id,
          name: c.name ?? "",
          contact_relationship: c.contact_relationship ?? "",
          phone: c.phone ?? "",
          whatsapp: c.whatsapp ?? "",
        }))
      );
      setLoaded(true);
    }
  }, [patient, loaded]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")),
        contacts: contacts.filter((c) => c.name.trim() !== ""),
      };
      return api.patch(`/patients/${id}`, payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente atualizado com sucesso!");
      router.push(`/dashboard/pacientes/${id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao salvar"),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value),
  });

  function addContact() { setContacts((c) => [...c, { ...EMPTY_CONTACT }]); }
  function removeContact(i: number) { setContacts((c) => c.filter((_, idx) => idx !== i)); }
  function setContact(i: number, k: keyof EmergencyContact, v: string) {
    setContacts((c) => c.map((contact, idx) => idx === i ? { ...contact, [k]: v } : contact));
  }

  const sectionCard = cn("rounded-2xl overflow-hidden border", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm");
  const sectionHeader = cn("flex items-center gap-2 px-6 py-4 border-b", isDark ? "border-white/5" : "border-gray-100");
  const sectionTitle = cn("font-semibold text-sm", isDark ? "text-white/80" : "text-gray-700");
  const inputClass = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400");
  const labelClass = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");
  const selectCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800");
  const selectContent = cn("border", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200");

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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className={cn("p-2 rounded-xl transition-all", isDark ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={cn("text-3xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-900")}>
            <UserCog className="w-7 h-7 text-cyan-400" />
            Editar Paciente
          </h1>
          {patient && <p className={cn("text-sm mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{patient.name}</p>}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Dados pessoais */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className={sectionTitle}>Dados Pessoais</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className={labelClass}>Nome completo *</Label>
              <Input placeholder="João da Silva" {...f("name")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>CPF</Label>
              <Input placeholder="000.000.000-00" {...f("cpf")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>RG</Label>
              <Input placeholder="00.000.000-0" {...f("rg")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Data de nascimento</Label>
              <Input type="date" {...f("birth_date")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Sexo</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")}>
                <SelectTrigger className={selectCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent className={selectContent}>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Estado civil</Label>
              <Select value={form.marital_status} onValueChange={(v) => set("marital_status", v ?? "")}>
                <SelectTrigger className={selectCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent className={selectContent}>
                  <SelectItem value="single">Solteiro(a)</SelectItem>
                  <SelectItem value="married">Casado(a)</SelectItem>
                  <SelectItem value="divorced">Divorciado(a)</SelectItem>
                  <SelectItem value="widowed">Viúvo(a)</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <Phone className="w-4 h-4 text-violet-400" />
            <h2 className={sectionTitle}>Contato</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Telefone principal</Label>
              <Input placeholder="(11) 99999-9999" {...f("phone_primary")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>WhatsApp</Label>
              <Input placeholder="(11) 99999-9999" {...f("whatsapp")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Telefone secundário</Label>
              <Input placeholder="(11) 3333-3333" {...f("phone_secondary")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>E-mail</Label>
              <Input type="email" placeholder="joao@email.com" {...f("email")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Contatos de emergência */}
        <div className={sectionCard}>
          <div className={cn(sectionHeader, "justify-between")}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className={sectionTitle}>Contatos de Emergência</h2>
            </div>
            <button onClick={addContact} className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all", isDark ? "text-cyan-400 hover:bg-cyan-500/10" : "text-cyan-600 hover:bg-cyan-50")}>
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
          <div className="p-6 space-y-4">
            {contacts.length === 0 && (
              <p className={cn("text-sm text-center py-4", isDark ? "text-white/20" : "text-gray-400")}>
                Nenhum contato de emergência cadastrado.
              </p>
            )}
            {contacts.map((c, i) => (
              <div key={i} className={cn("rounded-xl border p-4 space-y-3", isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50/50")}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", isDark ? "text-white/30" : "text-gray-400")}>Contato {i + 1}</span>
                  <button onClick={() => removeContact(i)} className={cn("p-1 rounded-lg transition-all", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Nome</Label>
                    <Input value={c.name} onChange={(e) => setContact(i, "name", e.target.value)} placeholder="Nome completo" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Parentesco</Label>
                    <Input value={c.contact_relationship} onChange={(e) => setContact(i, "contact_relationship", e.target.value)} placeholder="Mãe, pai, cônjuge..." className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Telefone</Label>
                    <Input value={c.phone} onChange={(e) => setContact(i, "phone", e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>WhatsApp</Label>
                    <Input value={c.whatsapp} onChange={(e) => setContact(i, "whatsapp", e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Endereço */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h2 className={sectionTitle}>Endereço</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>CEP</Label>
              <Input placeholder="00000-000" {...f("zip_code")} className={inputClass} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className={labelClass}>Rua</Label>
              <Input {...f("street")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Número</Label>
              <Input {...f("number")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Complemento</Label>
              <Input {...f("complement")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Bairro</Label>
              <Input {...f("neighborhood")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Cidade</Label>
              <Input {...f("city")} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Estado (UF)</Label>
              <Input maxLength={2} placeholder="SP" {...f("state")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Histórico médico */}
        <div className={sectionCard}>
          <div className={sectionHeader}>
            <HeartPulse className="w-4 h-4 text-red-400" />
            <h2 className={sectionTitle}>Histórico Médico</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Alergias</Label>
              <Textarea rows={2} placeholder="Ex: penicilina, látex..." {...f("allergies")} className={cn(inputClass, "resize-none")} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Medicamentos em uso</Label>
              <Textarea rows={2} placeholder="Ex: aspirina 100mg..." {...f("medications")} className={cn(inputClass, "resize-none")} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Doenças crônicas</Label>
              <Textarea rows={2} placeholder="Ex: diabetes, hipertensão..." {...f("chronic_diseases")} className={cn(inputClass, "resize-none")} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Histórico clínico</Label>
              <Textarea rows={2} {...f("medical_history")} className={cn(inputClass, "resize-none")} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className={labelClass}>Observações gerais</Label>
              <Textarea rows={2} {...f("observations")} className={cn(inputClass, "resize-none")} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => router.back()} className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
          Cancelar
        </Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 border-0 rounded-xl px-6 shadow-lg shadow-cyan-500/20 text-white">
          {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
