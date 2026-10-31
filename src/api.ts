import type { Account, CustomerBookingItem, CustomerUser, DashboardData, PortalData, PublicBookingPayload, PublicBookingResponse, Row, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export type PageResult<T> = { items: T[]; total: number; page: number; limit: number };
export type ListFilters = {
  page: number;
  limit: number;
  search?: string;
  departure_date?: string;
  status?: string;
  payment_status?: string;
};

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

async function download(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { credentials: "include" });
  } catch {
    throw new ApiError("Không thể kết nối máy chủ. Hãy kiểm tra backend đang chạy.", 0);
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : null;
    throw new ApiError(typeof detail === "string" ? detail : "Không thể tải tệp.", response.status);
  }
  return response.blob();
}

async function streamAIChat(
  prompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  onToken: (text: string) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history }),
    });
  } catch {
    throw new ApiError("Không thể kết nối máy chủ. Hãy kiểm tra backend đang chạy.", 0);
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : null;
    throw new ApiError(typeof detail === "string" ? detail : "Không thể trò chuyện với trợ lý AI.", response.status);
  }
  if (!response.body) throw new ApiError("Máy chủ không hỗ trợ truyền dữ liệu trực tuyến.", response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      const eventName = event.split(/\r?\n/).find((line) => line.startsWith("event:"))?.slice(6).trim();
      const dataLine = event.split(/\r?\n/).find((line) => line.startsWith("data:"))?.slice(5).trim();
      if (!dataLine) continue;
      const data: unknown = JSON.parse(dataLine);
      if (eventName === "token" && typeof data === "object" && data !== null && "text" in data && typeof data.text === "string") {
        onToken(data.text);
      } else if (eventName === "error" && typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        throw new ApiError(data.message, 502);
      } else if (eventName === "done") {
        receivedDone = true;
      }
    }
    if (done) break;
  }
  if (!receivedDone) throw new ApiError("Luồng phản hồi AI kết thúc bất thường.", 502);
}

export const api = {
  login: (username: string, password: string, remember_me: boolean = false) =>
    request<{ user: User }>("/auth/login", {
      method: "POST", body: JSON.stringify({ username, password, remember_me }),
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/me"),
  dashboard: () => request<DashboardData>("/dashboard"),
  list: (resource: string) => request<Row[]>(`/${resource}`),
  listPage: (resource: "customers" | "bookings", filters: ListFilters) => {
    const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
    if (filters.search) query.set("search", filters.search);
    if (filters.departure_date) query.set("departure_date", filters.departure_date);
    if (filters.status) query.set("status", filters.status);
    if (filters.payment_status) query.set("payment_status", filters.payment_status);
    return request<PageResult<Row>>(`/${resource}?${query.toString()}`);
  },
  download,
  streamAIChat,
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
  publicPortal: () => request<PortalData>("/public/portal"),
  publicBook: (payload: PublicBookingPayload) =>
    request<PublicBookingResponse>("/public/book", { method: "POST", body: JSON.stringify(payload) }),
  publicAIChat: (prompt: string) =>
    request<{ reply: string; tour_ids: number[] }>("/public/ai-chat", { method: "POST", body: JSON.stringify({ prompt }) }),
  customerRegister: (payload: { name: string; phone: string; password: string; email?: string; address?: string }) =>
    request<{ customer: CustomerUser; token: string }>("/public/customer/register", { method: "POST", body: JSON.stringify(payload) }),
  customerLogin: (payload: { phone: string; password: string; remember_me?: boolean }) =>
    request<{ customer: CustomerUser; token: string }>("/public/customer/login", { method: "POST", body: JSON.stringify(payload) }),
  customerMe: () => request<{ customer: CustomerUser }>("/public/customer/me"),
  customerLogout: () => request<{ message: string }>("/public/customer/logout", { method: "POST" }),
  customerBookings: () => request<{ bookings: CustomerBookingItem[] }>("/public/customer/bookings"),
};
