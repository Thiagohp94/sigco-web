"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { getMe } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    getMe()
      .then((user) => { setUser(user); setLoading(false); })
      .catch(() => { router.replace("/login"); setLoading(false); });
  }, [router, setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
          </div>
          <span className="text-sm text-cyan-300/60 animate-pulse">Carregando...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
