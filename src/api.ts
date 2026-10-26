import type { DashboardData, Row, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    request<{ access_token: string; user: User }>("/auth/login", undefined, {
      method: "POST", body: JSON.stringify({ username, password }),
    }),
  me: (token: string) => request<User>("/me", token),
  dashboard: (token: string) => request<DashboardData>("/dashboard", token),
  list: (token: string, resource: string) => request<Row[]>(`/${resource}`, token),
  create: (token: string, resource: string, payload: Record<string, string | number>) =>
    request<Row>(`/${resource}`, token, { method: "POST", body: JSON.stringify(payload) }),
  update: (token: string, resource: string, id: number, payload: Record<string, string | number>) =>
    request<Row>(`/${resource}/${id}`, token, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (token: string, resource: string, id: number) =>
    request<{ message: string }>(`/${resource}/${id}`, token, { method: "DELETE" }),
  cancelBooking: (token: string, id: number) =>
    request<Row>(`/bookings/${id}/cancel`, token, { method: "POST" }),
  recommendations: (token: string, payload: Record<string, unknown>) =>
    request<{ recommendations: Row[]; message: string }>("/ai/recommendations", token, {
      method: "POST", body: JSON.stringify(payload),
    }),
  generateTourContent: (token: string, payload: Record<string, unknown>) =>
    request<{ content: { description: string; itinerary: { day: number; title: string; details: string }[]; suggestion?: string }; human_verification_required: boolean; source: string }>(
      "/ai/tour-content", token, { method: "POST", body: JSON.stringify(payload) },
    ),
  summarizeFeedback: (token: string, payload: Record<string, number>) =>
    request<{ summary: string; count: number; average_rating: number | null; human_verification_required: boolean; source?: string }>(
      "/ai/feedback-summary", token, { method: "POST", body: JSON.stringify(payload) },
    ),
  aiStatus: (token: string) => request<{ configured: boolean; mode: "provider" | "deterministic" }>("/ai/status", token),
};
