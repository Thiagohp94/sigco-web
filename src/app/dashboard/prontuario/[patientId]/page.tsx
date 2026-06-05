"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Patient, MedicalRecord } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, FileText, Calendar, Stethoscope, Edit2 } from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { record_date: "", procedure_description: "", evolution: "", observations: "" };

export default function ProntuarioPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const isDark = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: patient } = useQuery<Patient>({
    queryKey: ["patient", patientId],
    queryFn: () => api.get(`/patients/${patientId}`).then((r) => r.data),
  });

  const { data: records = [], isLoading } = useQuery<MedicalRecord[]>({
    queryKey: ["records", patientId],
    queryFn: () => api.get(`/patients/${patientId}/records`).then((r) => r.data),
  });

  const saveRecord = useMutation({
    mutationFn: () => {
      const payload = {
        patient_id: patientId, ...form,
        procedure_description: form.procedure_description || undefined,
        evolution: form.evolution || undefined,
        observations: form.observations || undefined,
      };
      if (editingId) {
        return api.patch(`/patients/${patientId}/records/${editingId}`, payload).then((r) => r.data);
      }
      return api.post(`/patients/${patientId}/records`, payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["records", patientId] });
      toast.success(editingId ? "Registro atualizado!" : "Registro adicionado ao prontuário");
      closeForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao salvar"),
  });

  function openEdit(r: MedicalRecord) {
    setEditingId(r.id);
    setForm({
      record_date: r.record_date,
      procedure_description: r.procedure_description ?? "",
      evolution: r.evolution ?? "",
      observations: r.observations ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSoft = isDark ? "text-white/60" : "text-gray-700";
  const txtMuted = isDark ? "text-white/30" : "text-gray-500";
  const border = isDark ? "border-white/5" : "border-gray-100";
  const cardBg = isDark ? "glass-card" : "bg-white border border-gray-100 shadow-sm";
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400");
  const labelCls = cn("text-sm", isDark ? "text-white/50" : "text-gray-600");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className={cn("p-2 rounded-xl transition-all", isDark ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={cn("text-3xl font-bold flex items-center gap-3", txt)}>
            <FileText className="w-7 h-7 text-violet-400" />
            Prontuário
          </h1>
          {patient && <p className={cn("text-sm mt-0.5", txtMuted)}>{patient.name} · CPF: {patient.cpf ?? "—"}</p>}
        </div>
        <Button onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 border-0 rounded-xl shadow-lg shadow-violet-500/20 text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>
      </div>

      {isLoading ? (
        <SkeletonList count={4} />
      ) : records.length === 0 ? (
        <div className={cn("rounded-2xl text-center py-20", cardBg)}>
          <FileText className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-white/10" : "text-gray-300")} />
          <p className={cn("mb-4", txtMuted)}>Nenhum registro no prontuário.</p>
          <Button variant="outline" onClick={() => setShowForm(true)}
            className={cn("rounded-xl", isDark ? "border-violet-500/20 text-violet-400 hover:bg-violet-500/10" : "border-violet-200 text-violet-600 hover:bg-violet-50")}>
            Criar primeiro registro
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className={cn("absolute left-[19px] top-4 bottom-4 w-px", isDark ? "bg-gradient-to-b from-violet-500/30 via-cyan-500/10 to-transparent" : "bg-gradient-to-b from-violet-300 via-gray-200 to-transparent")} />

          <div className="space-y-4">
            {records.map((r, i) => (
              <div key={r.id} className="flex gap-4">
                <div className="relative flex-shrink-0 mt-5">
                  <div className={cn("w-[10px] h-[10px] rounded-full border-2",
                    i === 0
                      ? "border-violet-400 bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                      : isDark ? "border-white/15 bg-white/5" : "border-gray-300 bg-gray-200"
                  )} />
                </div>

                <div className={cn("flex-1 rounded-xl p-5 space-y-3 transition-all", cardBg)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400/50" : "text-cyan-500")} />
                      <span className={cn("font-semibold", txtSoft)}>
                        {format(new Date(r.record_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("flex items-center gap-1.5 text-sm", txtMuted)}>
                        <Stethoscope className="w-3 h-3" />
                        Dr(a). {r.dentist_name}
                      </div>
                      <button
                        onClick={() => openEdit(r)}
                        className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-white/20 hover:text-violet-400 hover:bg-violet-500/10" : "text-gray-300 hover:text-violet-600 hover:bg-violet-50")}
                        title="Editar registro"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {r.procedure_description && (
                    <div>
                      <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-0.5", isDark ? "text-cyan-400/40" : "text-cyan-700")}>Procedimento</p>
                      <p className={cn("text-sm", txtSoft)}>{r.procedure_description}</p>
                    </div>
                  )}
                  {r.evolution && (
                    <div>
                      <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-0.5", isDark ? "text-violet-400/40" : "text-violet-700")}>Evolução</p>
                      <p className={cn("text-sm", txtSoft)}>{r.evolution}</p>
                    </div>
                  )}
                  {r.observations && (
                    <div>
                      <p className={cn("text-[10px] font-semibold uppercase tracking-widest mb-0.5", txtMuted)}>Observações</p>
                      <p className={cn("text-sm italic", txtMuted)}>{r.observations}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className={cn("max-w-lg rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader>
            <DialogTitle className={txt}>{editingId ? "Editar Registro" : "Novo Registro no Prontuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Data da Consulta</Label>
              <Input type="date" value={form.record_date} onChange={(e) => set("record_date", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Procedimento Realizado</Label>
              <Textarea rows={2} placeholder="Descreva o procedimento..." value={form.procedure_description} onChange={(e) => set("procedure_description", e.target.value)} className={cn(inputCls, "resize-none")} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Evolução Clínica</Label>
              <Textarea rows={3} placeholder="Evolução do quadro clínico..." value={form.evolution} onChange={(e) => set("evolution", e.target.value)} className={cn(inputCls, "resize-none")} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Observações</Label>
              <Textarea rows={2} placeholder="Observações adicionais..." value={form.observations} onChange={(e) => set("observations", e.target.value)} className={cn(inputCls, "resize-none")} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm}
                className={cn("rounded-xl", isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                Cancelar
              </Button>
              <Button onClick={() => saveRecord.mutate()} disabled={saveRecord.isPending || !form.record_date}
                className="bg-gradient-to-r from-violet-500 to-violet-600 border-0 rounded-xl shadow-lg shadow-violet-500/20 text-white">
                {saveRecord.isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
      