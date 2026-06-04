"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Patient, MedicalRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, FileText, Calendar, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ProntuarioPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ record_date: "", procedure_description: "", evolution: "", observations: "" });

  const { data: patient } = useQuery<Patient>({
    queryKey: ["patient", patientId],
    queryFn: () => api.get(`/patients/${patientId}`).then((r) => r.data),
  });

  const { data: records = [], isLoading } = useQuery<MedicalRecord[]>({
    queryKey: ["records", patientId],
    queryFn: () => api.get(`/patients/${patientId}/records`).then((r) => r.data),
  });

  const createRecord = useMutation({
    mutationFn: () =>
      api.post(`/patients/${patientId}/records`, {
        patient_id: patientId,
        ...form,
        procedure_description: form.procedure_description || undefined,
        evolution: form.evolution || undefined,
        observations: form.observations || undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["records", patientId] });
      toast.success("Registro adicionado ao prontuário");
      setShowForm(false);
      setForm({ record_date: "", procedure_description: "", evolution: "", observations: "" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao salvar"),
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-violet-400" />
            Prontuário
          </h1>
          {patient && <p className="text-white/30 text-sm mt-0.5">{patient.name} · CPF: {patient.cpf ?? "—"}</p>}
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 border-0 rounded-xl shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
          </div>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-20">
          <FileText className="w-12 h-12 mx-auto mb-4 text-white/10" />
          <p className="text-white/30 mb-4">Nenhum registro no prontuário.</p>
          <Button variant="outline" onClick={() => setShowForm(true)}
            className="border-violet-500/20 text-violet-400 hover:bg-violet-500/10 rounded-xl">
            Criar primeiro registro
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-violet-500/30 via-cyan-500/10 to-transparent" />

          <div className="space-y-4">
            {records.map((r, i) => (
              <div key={r.id} className="flex gap-4">
                {/* Timeline dot */}
                <div className="relative flex-shrink-0 mt-5">
                  <div className={`w-[10px] h-[10px] rounded-full border-2 ${
                    i === 0
                      ? "border-violet-400 bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                      : "border-white/15 bg-white/5"
                  }`} />
                </div>

                {/* Card */}
                <div className="flex-1 glass-card rounded-xl p-5 space-y-3 hover:bg-white/[0.06] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400/50" />
                      <span className="font-semibold text-white/70">
                        {format(new Date(r.record_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-white/20">
                      <Stethoscope className="w-3 h-3" />
                      Dr(a). {r.dentist_name}
                    </div>
                  </div>
                  {r.procedure_description && (
                    <div>
                      <p className="text-[10px] font-semibold text-cyan-400/40 uppercase tracking-widest mb-0.5">Procedimento</p>
                      <p className="text-sm text-white/60">{r.procedure_description}</p>
                    </div>
                  )}
                  {r.evolution && (
                    <div>
                      <p className="text-[10px] font-semibold text-violet-400/40 uppercase tracking-widest mb-0.5">Evolução</p>
                      <p className="text-sm text-white/60">{r.evolution}</p>
                    </div>
                  )}
                  {r.observations && (
                    <div>
                      <p className="text-[10px] font-semibold text-white/15 uppercase tracking-widest mb-0.5">Observações</p>
                      <p className="text-sm text-white/30 italic">{r.observations}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-strong rounded-2xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Registro no Prontuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Data da Consulta</Label>
              <Input type="date" value={form.record_date} onChange={(e) => set("record_date", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Procedimento Realizado</Label>
              <Textarea rows={2} placeholder="Descreva o procedimento..." value={form.procedure_description} onChange={(e) => set("procedure_description", e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Evolução Clínica</Label>
              <Textarea rows={3} placeholder="Evolução do quadro clínico..." value={form.evolution} onChange={(e) => set("evolution", e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-sm">Observações</Label>
              <Textarea rows={2} placeholder="Observações adicionais..." value={form.observations} onChange={(e) => set("observations", e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/10 text-white/50 hover:bg-white/5 rounded-xl">Cancelar</Button>
              <Button onClick={() => createRecord.mutate()} disabled={createRecord.isPending || !form.record_date}
                className="bg-gradient-to-r from-violet-500 to-violet-600 border-0 rounded-xl shadow-lg shadow-violet-500/20">
                {createRecord.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
