import type { Account, DashboardData, Row, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Không thể kết nối máy chủ. Hãy kiểm tra backend đang chạy.", 0);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : null;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập."
        : "Đã xảy ra lỗi. Vui lòng thử lại.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST", body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/me"),
  dashboard: () => request<DashboardData>("/dashboard"),
  list: (resource: string) => request<Row[]>(`/${resource}`),
  create: (resource: string, payload: Record<string, string | number>) =>
    request<Row>(`/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
  update: (resource: string, id: number, payload: Record<string, string | number>) =>
    request<Row>(`/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (resource: string, id: number) =>
    request<{ message: string }>(`/${resource}/${id}`, { method: "DELETE" }),
  cancelBooking: (id: number) =>
    request<Row>(`/bookings/${id}/cancel`, { method: "POST" }),
  recommendations: (payload: Record<string, unknown>) =>
    request<{ recommendations: Row[]; message: string }>("/ai/recommendations", {
      method: "POST", body: JSON.stringify(payload),
    }),
  generateTourContent: (payload: Record<string, unknown>) =>
    request<{ content: { description: string; itinerary: { day: number; title: string; details: string }[]; suggestion?: string }; human_verification_required: boolean; source: string }>(
      "/ai/tour-content", { method: "POST", body: JSON.stringify(payload) },
    ),
  summarizeFeedback: (payload: Record<string, number>) =>
    request<{ summary: string; count: number; average_rating: number | null; human_verification_required: boolean; source?: string }>(
      "/ai/feedback-summary", { method: "POST", body: JSON.stringify(payload) },
    ),
  aiStatus: () => request<{ configured: boolean; mode: "provider" | "deterministic" }>("/ai/status"),
  accounts: () => request<Account[]>("/users"),
  createAccount: (payload: Pick<Account, "username" | "name" | "role"> & { password: string }) =>
    request<Account>("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateAccount: (id: number, payload: Partial<Pick<Account, "name" | "role" | "is_active">> & { password?: string }) =>
    request<Account>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
