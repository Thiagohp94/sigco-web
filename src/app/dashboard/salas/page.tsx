"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Room } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, DoorOpen, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

export default function SalasPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const isDark = useTheme();

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: () => api.get("/appointments/rooms/list").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingRoom) return api.patch(`/appointments/rooms/${editingRoom.id}`, form).then((r) => r.data);
      return api.post("/appointments/rooms", form).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rooms"] }); setShowForm(false); setEditingRoom(null); setForm({ name: "", description: "" }); toast.success("Sala salva!"); },
    onError: () => toast.error("Erro ao salvar sala"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/rooms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rooms"] }); toast.success("Sala removida."); },
    onError: () => toast.error("Erro ao remover"),
  });

  function openEdit(r: Room) {
    setEditingRoom(r);
    setForm({ name: r.name, description: r.description ?? "" });
    setShowForm(true);
  }

  const labelCls = cn("text-sm font-medium", isDark ? "text-white/60" : "text-gray-600");
  const inputCls = cn("rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-bold flex items-center gap-3", isDark ? "text-white" : "text-gray-800")}>
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <DoorOpen className="w-4 h-4 text-white" />
          </div>
          Salas
        </h1>
        <Button onClick={() => { setEditingRoom(null); setForm({ name: "", description: "" }); setShowForm(true); }}
          className="bg-gradient-to-r from-amber-500 to-amber-600 border-0 rounded-xl text-white shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4 mr-1.5" />Nova sala
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rooms.filter((r) => r.is_active).map((r) => (
          <div key={r.id} className={cn("rounded-2xl border p-5 transition-all", isDark ? "glass-card border-white/5" : "bg-white border-gray-200 shadow-sm hover:shadow-md")}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-amber-500/15" : "bg-amber-50")}>
                  <DoorOpen className={cn("w-5 h-5", isDark ? "text-amber-400" : "text-amber-600")} />
                </div>
                <div>
                  <p className={cn("font-semibold", isDark ? "text-white" : "text-gray-800")}>{r.name}</p>
                  {r.description && <p className={cn("text-xs mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>{r.description}</p>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(r)}
                  className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-white/20 hover:text-cyan-300 hover:bg-cyan-500/10" : "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50")}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteMutation.mutate(r.id)}
                  className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {rooms.filter((r) => r.is_active).length === 0 && (
          <p className={cn("col-span-3 text-center py-12", isDark ? "text-white/20" : "text-gray-400")}>Nenhuma sala cadastrada.</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className={cn("max-w-sm rounded-2xl", isDark ? "glass-strong border-white/10 text-white" : "bg-white border-gray-200 text-gray-800")}>
          <DialogHeader><DialogTitle>{editingRoom ? "Editar sala" : "Nova sala"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelCls}>Nome <span className="text-red-400">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Sala 1" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className={cn("resize-none rounded-xl", isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-gray-50 border-gray-200")} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 border-0 text-white" disabled={saveMutation.isPending || !form.name} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
