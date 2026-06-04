"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth";
import { Stethoscope, Eye, EyeOff, ArrowRight } from "lucide-react";

const schema = z.object({
  login: z.string().min(1, "Informe seu e-mail ou CPF"),
  password: z.string().min(1, "Informe sua senha"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await login(data.login, data.password);
      router.push("/dashboard");
    } catch {
      toast.error("Credenciais inválidas. Verifique seu e-mail/CPF e senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0e1a]">
      {/* Animated background orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[130px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-400/5 rounded-full blur-[100px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="glass-strong rounded-3xl p-8 glow-cyan">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center glow-cyan-strong">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-400/20 blur-lg -z-10" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              SIGCO
            </h1>
            <p className="text-sm text-white/40 mt-1">Sistema Integrado de Gestão de Clínica Odontológica</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login" className="text-sm text-white/60">E-mail ou CPF</Label>
              <Input
                id="login"
                placeholder="seuemail@clinica.com"
                autoComplete="username"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all"
                {...register("login")}
              />
              {errors.login && <p className="text-sm text-red-400">{errors.login.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white/60">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl pr-12 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold text-base border-0 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:opacity-50 group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Entrar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-white/20 mt-6">
          SIGCO v1.0 · Sistema Integrado de Gestão de Clínica Odontológica
        </p>
      </div>
    </div>
  );
}
