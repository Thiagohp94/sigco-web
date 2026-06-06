import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai mensagem legível de erros FastAPI/Pydantic.
 * Lida com: string simples, array Pydantic v2 [{loc,msg,type}] e erros axios.
 */
export function apiErrorMessage(e: any, fallback = "Erro ao processar solicitação"): string {
  const detail = e?.response?.data?.detail
  if (!detail) return e?.message ?? fallback
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const field = Array.isArray(d.loc)
        ? d.loc.filter((l: any) => l !== "body").join(".")
        : ""
      return field ? `${field}: ${d.msg}` : d.msg
    }).join(" | ")
  }
  return fallback
}
