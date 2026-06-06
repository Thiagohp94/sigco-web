import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Evita múltiplos toasts do mesmo tipo em rajadas de requisições
let _noConnectionToastShown = false;
let _noConnectionTimer: ReturnType<typeof setTimeout> | null = null;

function toastNoConnection() {
  if (_noConnectionToastShown) return;
  _noConnectionToastShown = true;
  toast.error("Sem conexão com o servidor. Verifique se o backend está rodando.");
  // Permite novo toast após 5 segundos
  _noConnectionTimer = setTimeout(() => {
    _noConnectionToastShown = false;
  }, 5000);
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // ── 401: tentar refresh, senão redirecionar para login ──
    if (status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }

    // ── 403: sem permissão ──
    if (status === 403) {
      toast.error("Sem permissão para realizar esta ação.");
    }

    // ── 409: conflito (sobreposição de agenda, duplicado) ──
    // Deixar o caller tratar com mensagem específica (não exibir toast genérico)

    // ── 422: erro de validação do Pydantic ──
    if (status === 422) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((e: any) => e.msg ?? String(e)).join(" · ")
        : typeof detail === "string"
        ? detail
        : "Dados inválidos. Verifique os campos.";
      toast.error(msg);
    }

    // ── 500+: erro interno do servidor ──
    if (status && status >= 500) {
      toast.error("Erro interno do servidor. Tente novamente em instantes.");
    }

    // ── Sem resposta (rede offline / CORS / backend fora) ──
    // Não mostrar toast para endpoints de auth (login/refresh) — eles têm handler próprio
    // Usar debounce para evitar múltiplos toasts em rajada de requisições
    const isAuthEndpoint = original?.url?.includes("/auth/");
    if (!error.response && !original._retry && !isAuthEndpoint) {
      toastNoConnection();
    }

    return Promise.reject(error);
  }
);

export default api;
