"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calendar, Users, LayoutDashboard, LogOut, ChevronRight,
  Package, ClipboardList, DoorOpen, BookOpen, Phone, Sun, Moon, RefreshCw,
  Activity, ChevronDown, DollarSign, Settings,
} from "lucide-react";
import { ToothLogo } from "@/components/icons/tooth-logo";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { toggleTheme } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";

const navGroups = [
  {
    label: "Operacional",
    items: [
      { href: "/dashboard", label: "Resumo do Dia", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/agenda", label: "Agenda", icon: Calendar },
      { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
    ],
  },
  {
    label: "Clínica",
    items: [
      { href: "/dashboard/procedimentos", label: "Procedimentos", icon: ClipboardList },
      { href: "/dashboard/materiais", label: "Materiais / Estoque", icon: Package },
      { href: "/dashboard/salas", label: "Salas", icon: DoorOpen },
    ],
  },
  {
    label: "Registros",
    items: [
      { href: "/dashboard/diario", label: "Diário de Bordo", icon: BookOpen },
      { href: "/dashboard/contatos", label: "Controle de Contatos", icon: Phone },
      { href: "/dashboard/timeline", label: "Timeline de Pacientes", icon: Activity },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/dashboard/financeiro", label: "Visão Geral", icon: DollarSign },
      { href: "/dashboard/financeiro/receber", label: "Cobranças de Pacientes", icon: DollarSign },
      { href: "/dashboard/financeiro/pagar", label: "Gastos da Clínica", icon: DollarSign },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/dashboard/configuracoes/usuarios", label: "Usuários", icon: Users },
      { href: "/dashboard/configuracoes/clinica", label: "Dados da Clínica", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isDark = useTheme();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function handleToggleTheme() {
    toggleTheme(); // useTheme() detecta a mudança via MutationObserver automaticamente
  }

  function toggleGroup(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className={cn(
      "w-72 min-h-screen flex flex-col relative z-20 border-r transition-colors duration-300",
      isDark
        ? "glass-strong border-white/5"
        : "bg-white/90 backdrop-blur-xl border-gray-200/60 shadow-lg shadow-cyan-500/5"
    )}>
      {/* Logo */}
      <div className={cn("h-20 flex items-center gap-3 px-6 border-b", isDark ? "border-white/5" : "border-gray-100")}>
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <ToothLogo size={22} />
          </div>
          <div className="absolute -inset-0.5 rounded-xl bg-cyan-400/20 blur-md -z-10" />
        </div>
        <div>
          <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
            SIGCO
          </span>
          <p className={cn("text-[10px] -mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>Gestão de Clínica Odontológica</p>
        </div>
        <button
          onClick={handleToggleTheme}
          className={cn(
            "ml-auto p-2 rounded-lg transition-all duration-200",
            isDark
              ? "text-white/30 hover:text-yellow-400 hover:bg-yellow-400/10"
              : "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50"
          )}
          title={isDark ? "Modo claro" : "Modo escuro"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {navGroups.map(({ label, items }) => {
          const isCollapsed = collapsed[label];
          return (
            <div key={label}>
              <button
                onClick={() => toggleGroup(label)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-1 mb-1 rounded-lg transition-colors",
                  isDark ? "text-white/20 hover:text-white/40" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isCollapsed && "rotate-180")} />
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {items.map(({ href, label: itemLabel, icon: Icon, exact }) => {
                    const active = exact ? pathname === href : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                          active
                            ? isDark
                              ? "bg-gradient-to-r from-cyan-500/15 to-cyan-500/5 text-cyan-300 border border-cyan-500/20"
                              : "bg-gradient-to-r from-cyan-50 to-cyan-50/50 text-cyan-700 border border-cyan-200"
                            : isDark
                              ? "text-white/50 hover:text-white/80 hover:bg-white/5"
                              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-all",
                          active
                            ? isDark ? "bg-cyan-500/20" : "bg-cyan-100"
                            : isDark ? "group-hover:bg-white/5" : "group-hover:bg-gray-100"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {itemLabel}
                        {active && (
                          <>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                            <div className={cn(
                              "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full",
                              isDark
                                ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                                : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                            )} />
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("p-4 border-t space-y-2", isDark ? "border-white/5" : "border-gray-100")}>
        {user && (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            isDark ? "bg-white/[0.03]" : "bg-gray-50"
          )}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/10 shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", isDark ? "text-white/80" : "text-gray-800")}>{user.name}</p>
              <p className={cn("text-[11px] capitalize", isDark ? "text-white/30" : "text-gray-400")}>{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => { logout(); window.location.href = "/login"; }}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-xl transition-all duration-200",
            isDark ? "text-white/30 hover:text-cyan-400 hover:bg-cyan-500/5" : "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Trocar usuario
        </button>
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-xl transition-all duration-200",
            isDark ? "text-white/30 hover:text-red-400 hover:bg-red-500/5" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
          )}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
