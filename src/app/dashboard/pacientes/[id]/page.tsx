"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Patient, MedicalRecord, OdontogramEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MapPin, AlertCircle, FileText, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OdontogramView } from "@/components/odontogram/odontogram-view";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => api.get(`/patients/${id}`).then((r) => r.data),
  });

  const { data: records = [] } = useQuery<MedicalRecord[]>({
    queryKey: ["records", id],
    queryFn: () => api.get(`/patients/${id}/records`).then((r) => r.data),
    enabled: !!patient,
  });

  const { data: odontogram = [] } = useQuery<OdontogramEntry[]>({
    queryKey: ["odontogram", id],
    queryFn: () => api.get(`/patients/${id}/records/odontogram`).then((r) => r.data),
    enabled: !!patient,
  });

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
  if (!patient) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-violet-500/20">
            {patient.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
            <p className="text-white/30 text-sm">CPF: {patient.cpf ?? "Não informado"}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
          patient.is_active
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            : "bg-white/5 text-white/30 border border-white/5"
        }`}>
          {patient.is_active ? "Ativo" : "Inativo"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact info */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <h2 className="font-semibold text-sm text-white/70">Contato</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex gap-3 items-start">
                <Phone className="w-4 h-4 text-white/15 mt-0.5" />
                <span className="text-white/60">{patient.phone_primary ?? "—"}</span>
              </div>
              <div className="flex gap-3 items-start">
                <Mail className="w-4 h-4 text-white/15 mt-0.5" />
                <span className="text-white/60">{patient.email ?? "—"}</span>
              </div>
              {patient.street && (
                <div className="flex gap-3 items-start">
                  <MapPin className="w-4 h-4 text-white/15 mt-0.5" />
                  <span className="text-white/60">{patient.street}, {patient.number} — {patient.city}/{patient.state}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medical alerts */}
          {(patient.allergies || patient.chronic_diseases) && (
            <div className="rounded-2xl overflow-hidden border border-amber-500/15 bg-amber-500/5">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-500/10">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="font-semibold text-sm text-amber-400/80">Alertas Médicos</h2>
              </div>
              <div className="p-5 space-y-2 text-sm">
                {patient.allergies && <p className="text-amber-300/60"><span className="text-amber-300/80 font-medium">Alergias:</span> {patient.allergies}</p>}
                {patient.chronic_diseases && <p className="text-amber-300/60"><span className="text-amber-300/80 font-medium">Doenças:</span> {patient.chronic_diseases}</p>}
                {patient.medications && <p className="text-amber-300/60"><span className="text-amber-300/80 font-medium">Medicamentos:</span> {patient.medications}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Odontogram */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
              <h2 className="font-semibold text-sm text-white/70">Odontograma</h2>
            </div>
            <div className="p-5">
              <OdontogramView entries={odontogram} patientId={id} />
            </div>
          </div>

          {/* Medical records */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <h2 className="font-semibold text-sm text-white/70">Prontuário</h2>
              </div>
              <Button size="sm" variant="outline"
                onClick={() => router.push(`/dashboard/prontuario/${id}`)}
                className="border-white/10 text-white/40 hover:text-white hover:bg-white/5 rounded-lg text-xs">
                Ver Completo
              </Button>
            </div>
            <div className="p-5">
              {records.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">Nenhum registro no prontuário.</p>
              ) : (
                <div className="space-y-3">
                  {records.slice(0, 5).map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-1 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white/70">
                          {format(new Date(r.record_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-white/20">Dr(a). {r.dentist_name}</span>
                      </div>
                      {r.procedure_description && <p className="text-sm text-white/40">{r.procedure_description}</p>}
                      {r.evolution && <p className="text-xs text-white/25 italic">{r.evolution}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
