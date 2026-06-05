"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  const isDark = useTheme();
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl",
        isDark ? "bg-white/8" : "bg-gray-200",
        className
      )}
    />
  );
}

/** Skeleton pré-montado para linha de lista (ícone + texto) */
export function SkeletonRow({ isDark }: { isDark?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** Skeleton para card de paciente na lista */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/** Skeleton para linha de tabela/agenda */
export function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return <Skeleton className={cn("h-12 w-full", wide ? "w-full" : "w-3/4")} />;
}

/** Bloco de N skeletons verticais */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
