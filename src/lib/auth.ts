import api from "./api";
import type { TokenResponse, User } from "@/types";
import axios from "axios";

export async function login(login: string, password: string): Promise<TokenResponse> {
  try {
    const { data } = await api.post<TokenResponse>("/auth/login", { login, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        // Network error — backend unreachable or CORS blocked
        throw new Error("NETWORK_ERROR");
      }
      if (err.response.status === 401) {
        throw new Error("INVALID_CREDENTIALS");
      }
      throw new Error(`SERVER_ERROR_${err.response.status}`);
    }
    throw err;
  }
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("access_token");
}
